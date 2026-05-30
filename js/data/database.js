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

const DB_NAME = 'rpg_game_db';
const DB_VERSION = 1;

class GameDatabase {
  constructor() {
    /** @type {IDBDatabase|null} */
    this.db = null;
  }

  // ─── Connection ──────────────────────────────────────────

  /**
   * Open the database connection.
   * Creates object stores on first run, seeds initial data if empty.
   * @returns {Promise<void>}
   */
  async open() {
    if (this.db) return;

    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // gameState store (key-value)
        if (!db.objectStoreNames.contains('gameState')) {
          db.createObjectStore('gameState', { keyPath: 'key' });
        }

        // characters store
        if (!db.objectStoreNames.contains('characters')) {
          db.createObjectStore('characters', { keyPath: 'id' });
        }

        // equipment store
        if (!db.objectStoreNames.contains('equipment')) {
          db.createObjectStore('equipment', { keyPath: 'id' });
        }

        // inventory store
        if (!db.objectStoreNames.contains('inventory')) {
          db.createObjectStore('inventory', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });

    // Seed initial data if DB is fresh
    await this._seedIfEmpty();
  }

  /**
   * Seed the database with initial data if no characters exist.
   * @private
   */
  async _seedIfEmpty() {
    const chars = await this.getAllCharacters();
    if (chars.length > 0) return; // Already seeded

    // Seed game state
    for (const entry of SEED_GAME_STATE) {
      await this.setGameState(entry.key, entry.value);
    }

    // Seed equipment
    for (const item of SEED_EQUIPMENT) {
      await this.putEquipment(item);
    }

    // Seed inventory (drops, etc.)
    if (typeof SEED_INVENTORY !== 'undefined') {
      for (const item of SEED_INVENTORY) {
        await this.putInventoryItem(item);
      }
    }

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
  _read(storeName, fn) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = fn(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Execute a read-write transaction.
   * @param {string} storeName
   * @param {(store: IDBObjectStore) => IDBRequest} fn
   * @returns {Promise<any>}
   */
  _write(storeName, fn) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = fn(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
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
    return this._write('characters', (store) => store.put(character));
  }

  // ─── Equipment ───────────────────────────────────────────

  /**
   * Get an equipment item by ID.
   * @param {string} id
   * @returns {Promise<Object|undefined>}
   */
  getEquipment(id) {
    return this._read('equipment', (store) => store.get(id));
  }

  /**
   * Get all equipment items.
   * @returns {Promise<Array>}
   */
  getAllEquipment() {
    return this._read('equipment', (store) => store.getAll());
  }

  /**
   * Insert or update an equipment item.
   * @param {Object} item
   * @returns {Promise<void>}
   */
  putEquipment(item) {
    return this._write('equipment', (store) => store.put(item));
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
    return this._write('inventory', (store) => store.put(item));
  }
}

// ─── Singleton Export ────────────────────────────────────
export const GameDB = new GameDatabase();
