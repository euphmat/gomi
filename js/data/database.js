/**

 * このファイルはゲームのセーブデータを保存・読み込みするためのファイルです。
 * ブラウザの中にある「IndexedDB」という機能を使ってデータを管理します。
 *
 * GameDB — IndexedDB Wrapper for RPG Game Data
 *
 * Provides persistent, large-capacity storage using IndexedDB.
 *
 * Stores:
 *   - gameState  : key-value pairs (gold, location, version, etc.)
 *   - characters : full character records (keyPath: id)
 *   - equipment  : equipment item records (keyPath: id)
 *
 * Usage:
 *   await GameDB.open();
 *   const chars = await GameDB.getAllCharacters();
 */

import { SEED_GAME_STATE, SEED_CHARACTERS, SEED_EQUIPMENT } from './seed-data.js';
import { WEAPONS } from '../definitions/weapons.js';
import { ARMORS } from '../definitions/armors.js';
import { SHIELDS } from '../definitions/shields.js';
import { ACCESSORIES } from '../definitions/accessories.js';
import {
  createMedalEquipmentScalingContext,
  scaleMedalShopEquipment,
  scaleMedalShopEquipmentList,
} from '../utils/medal-equipment-scaling.js';

const ALL_EQUIPMENT_DEFS = [...WEAPONS, ...ARMORS, ...SHIELDS, ...ACCESSORIES];

function _getBaseId(id) {
  const lastUnderscore = id.lastIndexOf('_');
  if (lastUnderscore > 0) {
    const suffix = id.substring(lastUnderscore + 1);
    // basic heuristic for our random suffixes or '_init1'
    if (suffix.length >= 4 && /^[a-z0-9]+$/.test(suffix) && suffix !== 'ring') {
      return id.substring(0, lastUnderscore);
    }
  }
  return id;
}

function _mergeDef(item) {
  if (!item) return item;
  const baseId = item.baseId || _getBaseId(item.id);
  const def = ALL_EQUIPMENT_DEFS.find(d => d.id === baseId);
  if (def) {
    return { ...def, ...item, stats: def.stats, elements: def.elements, ailments: def.ailments };
  }
  return item;
}

const DB_NAME = 'rpg_game_db';
const DB_VERSION = 1;
const SAVE_STORES = ['gameState', 'characters', 'equipment', 'inventory'];

function _getIndexedDBError(source) {
  try {
    return source?.error || null;
  } catch (_) {
    // Some WebKit versions throw while reading error from a request whose
    // backing transaction has already disappeared.
    return null;
  }
}

function _isRecoverableConnectionError(error) {
  const name = String(error?.name || '');
  const message = String(error?.message || error || '');
  return ['AbortError', 'InvalidStateError', 'TransactionInactiveError', 'UnknownError'].includes(name)
    || /without an in-progress transaction|connection to indexed database server lost|database connection is closing|transaction.*inactive|transaction.*aborted/i.test(message);
}

function _waitUntilDocumentVisible() {
  if (typeof document === 'undefined' || !document.hidden) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resolve();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });
}

async function encodeCloudSnapshot(dataObj) {
  const jsonStr = JSON.stringify(dataObj);
  
  // Compress using native CompressionStream
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const compressedStream = blob.stream().pipeThrough(new CompressionStream('gzip'));
  const response = new Response(compressedStream);
  const compressedBlob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Extract base64 part from data URL
      const base64data = reader.result.split(',')[1];
      resolve(base64data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(compressedBlob);
  });
}

async function decodeCloudSnapshot(base64Str) {
  if (typeof base64Str !== 'string' || base64Str.length === 0) {
    throw new Error('クラウドセーブデータが空です。');
  }

  try {
    // Avoid a large data: URL here. Some mobile browsers intermittently fail
    // to fetch multi-megabyte data URLs even though the downloaded save itself
    // is intact.
    const binary = atob(base64Str);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const blob = new Blob([bytes], { type: 'application/gzip' });
    const decompressedStream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    const response = new Response(decompressedStream);
    const jsonStr = await response.text();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('[GameDB] Could not decode cloud snapshot.', error);
    throw new Error('クラウドセーブデータを展開できませんでした。もう一度復元をお試しください。', { cause: error });
  }
}

function validateCloudSnapshot(data) {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.gameState) || !Array.isArray(data.characters)
      || !Array.isArray(data.equipment) || !Array.isArray(data.inventory)) {
    return false;
  }

  return data.gameState.every(entry => entry && typeof entry.key === 'string')
    && data.characters.every(character => character && character.id !== undefined)
    && data.equipment.every(item => item && item.id !== undefined)
    && data.inventory.every(item => item && item.id !== undefined);
}

class GameDatabase {
  constructor() {
    /** @type {IDBDatabase|null} */
    this.db = null;
    this._connectionPromise = null;
    this._seedPromise = null;
    this._isClosing = false;
    // Keep read-write transactions ordered. A request can report success before
    // its transaction has committed, so starting the next battle save from the
    // request callback can leave some browser implementations with overlapping
    // transaction bookkeeping.
    this._writeQueue = Promise.resolve();
  }

  // ─── Connection ──────────────────────────────────────────

  /**
   * Open the database connection.
   * Creates object stores on first run, seeds initial data if empty.
   * @returns {Promise<void>}
   */
  async open() {
    this._isClosing = false;
    await this._ensureConnection();

    if (this._seedPromise) return this._seedPromise;

    const seedPromise = this._seedIfEmpty();
    this._seedPromise = seedPromise;
    try {
      await seedPromise;
    } finally {
      if (this._seedPromise === seedPromise) this._seedPromise = null;
    }
  }

  async _ensureConnection() {
    if (this.db) return this.db;
    if (this._connectionPromise) return this._connectionPromise;

    const connectionPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // gameState store (key-value)
        if (!db.objectStoreNames.contains('gameState')) { db.createObjectStore('gameState', { keyPath: 'key' }); }
        // characters store
        if (!db.objectStoreNames.contains('characters')) { db.createObjectStore('characters', { keyPath: 'id' }); }
        // equipment store
        if (!db.objectStoreNames.contains('equipment')) { db.createObjectStore('equipment', { keyPath: 'id' }); }

        // inventory store
        if (!db.objectStoreNames.contains('inventory')) {
          db.createObjectStore('inventory', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        db.onversionchange = () => {
          db.close();
          if (this.db === db) this.db = null;
        };
        db.onclose = () => {
          if (this.db === db) this.db = null;
        };
        resolve(db);
      };
      request.onerror = (event) => reject(_getIndexedDBError(event.target) || new Error('Failed to open IndexedDB.'));
    });

    this._connectionPromise = connectionPromise;
    try {
      const db = await connectionPromise;
      if (this._isClosing) {
        db.close();
        throw new Error('Database was closed intentionally.');
      }
      this.db = db;
      return db;
    } finally {
      if (this._connectionPromise === connectionPromise) this._connectionPromise = null;
    }
  }

  async _runWithConnectionRetry(storeName, operation) {
    // iOS may suspend WebKit's IndexedDB process while the app is in the
    // background. Do not start another transaction until the page is active.
    await _waitUntilDocumentVisible();
    if (this._isClosing) throw new Error('Database is closed.');
    const db = await this._ensureConnection();

    try {
      return await operation(db);
    } catch (error) {
      if (this._isClosing || !_isRecoverableConnectionError(error)) throw error;

      // A transaction already in progress can fail while the app is being
      // backgrounded. Wait for WebKit to resume before reopening the database.
      await _waitUntilDocumentVisible();
      if (this._isClosing) throw error;

      console.warn(`[GameDB] Recovering IndexedDB connection after ${storeName} transaction failure.`, error);
      if (this.db === db) {
        try { db.close(); } catch (_) { /* The connection may already be gone. */ }
        this.db = null;
      }

      const recoveredDb = await this._ensureConnection();
      return operation(recoveredDb);
    }
  }

  close() {
    this._isClosing = true;
    if (!this.db) return;

    const db = this.db;
    this.db = null;
    try { db.close(); } catch (_) { /* The connection may already be gone. */ }
  }

  /**
   * Seed the database with initial data if no characters exist.
   * @private
   */
  async _seedIfEmpty() {
    const chars = await this.getAllCharacters();
    if (chars.length > 0) return; // Already seeded

    // Seed game state
    for (const entry of SEED_GAME_STATE) { await this.setGameState(entry.key, entry.value); }

    // Seed equipment
    for (const item of SEED_EQUIPMENT) { await this.putEquipment(item); }



    // Seed characters
    for (const char of SEED_CHARACTERS) {
      await this.putCharacter(char);
    }

    console.log('[GameDB] Initial data seeded.');
  }

  // ─── Generic Transaction Helpers ─────────────────────────

  /**
   * Execute a read-only transaction.
   * @param {string} storeName
   * @param {(store: IDBObjectStore) => IDBRequest} fn
   * @returns {Promise<any>}
   */
  async _read(storeName, fn) {
    return this._runWithConnectionRetry(storeName, (db) => new Promise((resolve, reject) => {
      let settled = false;
      const fail = (error) => {
        if (settled) return;
        settled = true;
        reject(error || new Error(`IndexedDB read failed for ${storeName}.`));
      };

      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = fn(store);
        request.onsuccess = () => {
          try {
            const result = request.result;
            if (settled) return;
            settled = true;
            resolve(result);
          } catch (error) {
            fail(error);
          }
        };
        request.onerror = (event) => fail(_getIndexedDBError(event.target));
        tx.onabort = (event) => fail(_getIndexedDBError(event.target));
      } catch (error) {
        fail(error);
      }
    }));
  }

  /**
   * Execute a read-write transaction.
   * @param {string} storeName
   * @param {(store: IDBObjectStore) => IDBRequest} fn
   * @returns {Promise<any>}
   */
  _write(storeName, fn) {
    const run = () => this._runWithConnectionRetry(storeName, (db) => new Promise((resolve, reject) => {
      let tx;
      let result;
      let transactionError;
      let settled = false;

      const fail = (error) => {
        if (settled) return;
        settled = true;
        reject(error || new Error(`IndexedDB write failed for ${storeName}.`));
      };

      try {
        tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        tx.oncomplete = () => {
          if (settled) return;
          settled = true;
          resolve(result);
        };
        // The transaction's error event occurs before abort. Keep the queue
        // blocked until abort has finished, then reconnect/retry if necessary.
        tx.onerror = (event) => {
          transactionError = _getIndexedDBError(event.target) || transactionError;
        };
        tx.onabort = (event) => fail(
          transactionError
          || _getIndexedDBError(event.target)
          || new Error(`IndexedDB write aborted for ${storeName}.`)
        );

        const request = fn(store);
        request.onsuccess = () => {
          try {
            result = request.result;
          } catch (error) {
            transactionError = error;
            try { tx.abort(); } catch (_) { fail(error); }
          }
        };
        request.onerror = (event) => {
          transactionError = _getIndexedDBError(event.target) || transactionError;
        };
      } catch (error) {
        transactionError = error;
        if (!tx) {
          fail(error);
          return;
        }
        try {
          tx.abort();
        } catch (_) {
          fail(error);
        }
      }
    }));

    const queuedWrite = this._writeQueue.then(run, run);
    // A failed write must not permanently block later saves.
    this._writeQueue = queuedWrite.catch(() => undefined);
    return queuedWrite;
  }

  // ─── Game State ──────────────────────────────────────────

  /**
   * Get a game state value by key.
   * @param {string} key
   * @returns {Promise<any>}
   */
  async getGameState(key) {
    const record = await this._read('gameState', (store) => store.get(key));
    return record ? record.value : undefined;
  }

  /**
   * Set a game state value.
   * @param {string} key
   * @param {any} value
   * @returns {Promise<void>}
   */
  async setGameState(key, value) {
    await this._write('gameState', (store) => store.put({ key, value }));
  }

  /**
   * ホームタウンゲーム共通の難易度別デイリークリアを記録し、
   * 同じトランザクションでPrismを付与する。
   * 複数タブや神経衰弱・数独で同時にクリアしても、各難易度の報酬は
   * 1日1回だけになる。保存キーは既存セーブ互換のため従来名を維持する。
   * @param {string} dateKey - ローカル日付（YYYY-MM-DD）
   * @param {'easy'|'normal'|'hard'|'very_hard'} difficultyId
   * @param {number} amount
   * @returns {Promise<{awarded: boolean, prism: number}>}
   */
  claimDailyTownGameReward(dateKey, difficultyId, amount) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return Promise.reject(new Error('Invalid town game date key.'));
    }
    if (!['easy', 'normal', 'hard', 'very_hard'].includes(difficultyId)) {
      return Promise.reject(new Error('Invalid town game difficulty.'));
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return Promise.reject(new Error('Invalid town game reward amount.'));
    }

    const winKey = `memoryGameLastWin:${difficultyId}`;
    const run = () => this._runWithConnectionRetry('gameState', (db) => new Promise((resolve, reject) => {
      const tx = db.transaction('gameState', 'readwrite');
      const store = tx.objectStore('gameState');
      let result;

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('Town game reward transaction failed.'));
      tx.onabort = () => reject(tx.error || new Error('Town game reward transaction was aborted.'));

      const winRequest = store.get(winKey);
      winRequest.onsuccess = () => {
        const prismRequest = store.get('prism');
        prismRequest.onsuccess = () => {
          const currentPrism = Number(prismRequest.result?.value) || 0;
          if (winRequest.result?.value === dateKey) {
            result = { awarded: false, prism: currentPrism };
            return;
          }

          const prism = currentPrism + amount;
          store.put({ key: 'prism', value: prism });
          store.put({ key: winKey, value: dateKey });
          result = { awarded: true, prism };
        };
      };
    }));

    const queuedWrite = this._writeQueue.then(run, run);
    this._writeQueue = queuedWrite.catch(() => undefined);
    return queuedWrite;
  }

  /** @deprecated Use claimDailyTownGameReward. */
  claimDailyMemoryGameReward(dateKey, difficultyId, amount) {
    return this.claimDailyTownGameReward(dateKey, difficultyId, amount);
  }

  /**
   * Award the daily login bonus once for the supplied local calendar date.
   * The date check and updates share one transaction so simultaneous launches
   * in multiple tabs cannot award the bonus twice.
   * @param {string} dateKey - Local calendar date in YYYY-MM-DD format
   * @param {number} amount
   * @returns {Promise<{awarded: boolean, prism: number}>}
   */
  claimDailyLoginBonus(dateKey, amount = 1) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return Promise.reject(new Error('Invalid daily login date key.'));
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return Promise.reject(new Error('Invalid daily login bonus amount.'));
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('gameState', 'readwrite');
      const store = tx.objectStore('gameState');
      let result;

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('Daily login transaction failed.'));
      tx.onabort = () => reject(tx.error || new Error('Daily login transaction was aborted.'));

      const lastClaimRequest = store.get('lastDailyLoginBonusDate');
      lastClaimRequest.onsuccess = () => {
        const prismRequest = store.get('prism');
        prismRequest.onsuccess = () => {
          const currentPrism = Number(prismRequest.result?.value) || 0;
          if (lastClaimRequest.result?.value === dateKey) {
            result = { awarded: false, prism: currentPrism };
            return;
          }

          const prism = currentPrism + amount;
          store.put({ key: 'prism', value: prism });
          store.put({ key: 'lastDailyLoginBonusDate', value: dateKey });
          result = { awarded: true, prism };
        };
      };
    });
  }

  // ─── Characters ──────────────────────────────────────────

  /**
   * Get all characters.
   * @returns {Promise<Array>}
   */
  getAllCharacters() {
    return this._read('characters', (store) => store.getAll());
  }

  /**
   * Get a single character by ID.
   * @param {number} id
   * @returns {Promise<Object|undefined>}
   */
  getCharacter(id) {
    return this._read('characters', (store) => store.get(id));
  }

  /**
   * Insert or update a character.
   * @param {Object} character
   * @returns {Promise<void>}
   */
  putCharacter(character) {
    const clone = JSON.parse(JSON.stringify(character));
    return this._write('characters', (store) => store.put(clone));
  }

  // ─── Equipment ───────────────────────────────────────────

  /**
   * Get an equipment item by ID.
   * @param {string} id
   * @returns {Promise<Object|undefined>}
   */
  async getEquipment(id) {
    const item = await this._read('equipment', (store) => store.get(id));
    if (!item) return item;
    const context = await this._getMedalEquipmentScalingContext();
    return scaleMedalShopEquipment(_mergeDef(item), context);
  }

  /**
   * Get all equipment items.
   * @returns {Promise<Array>}
   */
  async getAllEquipment() {
    const items = await this._read('equipment', (store) => store.getAll());
    const context = await this._getMedalEquipmentScalingContext();
    return scaleMedalShopEquipmentList(items.map(_mergeDef), context);
  }

  async _getMedalEquipmentScalingContext() {
    const [
      playerMedals,
      completedDungeons,
      completedDungeonFloors,
      unlockedDungeons,
      currentDungeonId,
      currentFloor,
    ] = await Promise.all([
      this.getGameState('player_medals'),
      this.getGameState('completed_dungeons'),
      this.getGameState('completed_dungeon_floors'),
      this.getGameState('unlockedDungeons'),
      this.getGameState('currentDungeon'),
      this.getGameState('currentFloor'),
    ]);
    return createMedalEquipmentScalingContext({
      playerMedals,
      completedDungeons,
      completedDungeonFloors,
      unlockedDungeons,
      currentDungeonId,
      currentFloor,
    });
  }

  /**
   * Insert or update an equipment item.
   * @param {Object} item
   * @returns {Promise<void>}
   */
  putEquipment(item) {
    const clone = JSON.parse(JSON.stringify(item));
    return this._write('equipment', (store) => store.put(clone));
  }

  /**
   * Delete an equipment item by ID.
   * @param {string} id
   * @returns {Promise<void>}
   */
  deleteEquipment(id) {
    return this._write('equipment', (store) => store.delete(id));
  }

  /**
   * Get all equipment that is NOT currently equipped by any character.
   * @returns {Promise<Array>}
   */
  async getWarehouseEquipment() {
    const allEq = await this.getAllEquipment();
    const chars = await this.getAllCharacters();
    const equippedIds = new Set();
    chars.forEach(c => {
      if (c.equipment) {
        Object.values(c.equipment).forEach(eqId => {
          if (eqId) equippedIds.add(eqId);
        });
      }
    });
    return allEq.filter(eq => !equippedIds.has(eq.id));
  }

  // ─── Inventory (Drops/Items) ─────────────────────────────

  /**
   * Get an inventory item by ID.
   * @param {string} id
   * @returns {Promise<Object|undefined>}
   */
  getInventoryItem(id) {
    return this._read('inventory', (store) => store.get(id));
  }

  /**
   * Get all inventory items.
   * @returns {Promise<Array>}
   */
  getAllInventory() {
    return this._read('inventory', (store) => store.getAll());
  }

  /**
   * Insert or update an inventory item.
   * @param {Object} item
   * @returns {Promise<void>}
   */
  putInventoryItem(item) {
    const clone = JSON.parse(JSON.stringify(item));
    return this._write('inventory', (store) => store.put(clone));
  }

  /**
   * Delete an inventory item by ID.
   * @param {string} id
   * @returns {Promise<void>}
   */
  deleteInventoryItem(id) {
    return this._write('inventory', (store) => store.delete(id));
  }
  /**
   * Create a gzip-compressed snapshot for the authenticated cloud-save service.
   * This is intentionally not exposed through an import/export UI.
   */
  async createCloudSnapshot() {
    const gameState = await this._read('gameState', store => store.getAll());
    const characters = await this.getAllCharacters();
    const equipment = await this._read('equipment', store => store.getAll()); // raw equipment without mergeDef
    const inventory = await this.getAllInventory();

    const data = {
      gameState,
      characters,
      equipment,
      inventory
    };

    return encodeCloudSnapshot(data);
  }

  /**
   * Atomically replace every local save store with a cloud snapshot.
   */
  async restoreCloudSnapshot(payload) {
    const data = await decodeCloudSnapshot(payload);
    if (!validateCloudSnapshot(data)) {
      throw new Error('Invalid cloud save format.');
    }

    const run = () => this._runWithConnectionRetry('cloud snapshot', (db) => new Promise((resolve, reject) => {
      let tx;
      let transactionError;
      let settled = false;
      const fail = (error) => {
        if (settled) return;
        settled = true;
        reject(error || new Error('クラウドセーブの復元に失敗しました。'));
      };

      try {
        tx = db.transaction(SAVE_STORES, 'readwrite');
        tx.oncomplete = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        // Wait for abort before retrying. In WebKit, starting the replacement
        // transaction from the earlier error event can fail against the still
        // aborting transaction.
        tx.onerror = (event) => {
          transactionError = _getIndexedDBError(event.target) || transactionError;
        };
        tx.onabort = (event) => fail(
          transactionError
          || _getIndexedDBError(event.target)
          || new DOMException('クラウドセーブの復元が中断されました。', 'AbortError')
        );

        for (const storeName of SAVE_STORES) tx.objectStore(storeName).clear();
        for (const entry of data.gameState) tx.objectStore('gameState').put(entry);
        for (const character of data.characters) tx.objectStore('characters').put(character);
        for (const item of data.equipment) tx.objectStore('equipment').put(item);
        for (const item of data.inventory) tx.objectStore('inventory').put(item);
      } catch (error) {
        try { tx?.abort(); } catch (_) { /* Transaction may not have started. */ }
        fail(error);
      }
    }));

    const queuedRestore = this._writeQueue.then(run, run);
    this._writeQueue = queuedRestore.catch(() => undefined);
    await queuedRestore;
    console.log('[GameDB] Cloud snapshot restored successfully.');
  }
}

// ─── Singleton Export ────────────────────────────────────
export const GameDB = new GameDatabase();
