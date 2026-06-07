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
    return { ...def, ...item, stats: def.stats, elements: def.elements, ailments: def.ailments, ability: def.ability };
  }
  return item;
}

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
    return _mergeDef(item);
  }

  /**
   * Get all equipment items.
   * @returns {Promise<Array>}
   */
  async getAllEquipment() {
    const items = await this._read('equipment', (store) => store.getAll());
    return items.map(_mergeDef);
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
}

// ─── Singleton Export ────────────────────────────────────
export const GameDB = new GameDatabase();
