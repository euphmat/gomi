/**
 * Mock Data - RPG Game State & Characters
 * 
 * This file provides placeholder data for the UI.
 * In production, this would be replaced by actual game state management.
 */

// ─── Game State ──────────────────────────────────────────
export const gameState = {
  location: 'はじまりの街',
  version: '0.1.0',
  gold: 1250,
};

// ─── Equipment Slot Definitions ──────────────────────────
export const EQUIPMENT_SLOTS = [
  { key: 'rightHand', label: '右手' },
  { key: 'leftHand',  label: '左手' },
  { key: 'armor',     label: '防具' },
  { key: 'accessory1', label: 'アクセサリ1' },
  { key: 'accessory2', label: 'アクセサリ2' },
];

// ─── Stat Definitions ────────────────────────────────────
export const STAT_KEYS = [
  { key: 'atk',  label: 'ATK' },
  { key: 'def',  label: 'DEF' },
  { key: 'matk', label: 'MATK' },
  { key: 'mdef', label: 'MDEF' },
  { key: 'spd',  label: 'SPD' },
];

// ─── Characters ──────────────────────────────────────────
export const characters = [
  {
    id: 1,
    name: 'アレックス',
    jobName: 'ヒーロー',
    level: 10,
    sp: 3,
    jobLevel: 10,
    hp:     { current: 450, max: 500 },
    mp:     { current: 80,  max: 120 },
    exp:    { current: 2400, max: 5000 },
    jobExp: { current: 1800, max: 3000 },
    stats:  { atk: 85, def: 60, matk: 30, mdef: 45, spd: 55 },
    equipment: {
      rightHand:  { name: '鋼の剣',       icon: '⚔️' },
      leftHand:   { name: '鉄の盾',       icon: '🛡️' },
      armor:      { name: 'チェインメイル', icon: '🛡️' },
      accessory1: { name: '力の指輪',     icon: '💍' },
      accessory2: { name: '速さのお守り',  icon: '📿' },
    },
    iconGradient: ['#ef4444', '#f97316'],
    iconEmoji: '⚔️',
  },
  {
    id: 2,
    name: 'ミレーヌ',
    jobName: 'ウィザード',
    level: 10,
    sp: 3,
    jobLevel: 10,
    hp:     { current: 280, max: 350 },
    mp:     { current: 180, max: 200 },
    exp:    { current: 3200, max: 5000 },
    jobExp: { current: 2500, max: 3000 },
    stats:  { atk: 25, def: 35, matk: 95, mdef: 70, spd: 40 },
    equipment: {
      rightHand:  { name: '魔法の杖',     icon: '🪄' },
      leftHand:   { name: '古代の書',     icon: '📖' },
      armor:      { name: 'ローブ',       icon: '👘' },
      accessory1: { name: '知恵の指輪',   icon: '💍' },
      accessory2: { name: '魔力のお守り',  icon: '📿' },
    },
    iconGradient: ['#3b82f6', '#a855f7'],
    iconEmoji: '🔮',
  },
  {
    id: 3,
    name: 'セリア',
    jobName: 'プリースト',
    level: 10,
    sp: 3,
    jobLevel: 10,
    hp:     { current: 380, max: 420 },
    mp:     { current: 150, max: 180 },
    exp:    { current: 1500, max: 5000 },
    jobExp: { current: 900,  max: 3000 },
    stats:  { atk: 40, def: 55, matk: 75, mdef: 80, spd: 35 },
    equipment: {
      rightHand:  { name: '聖なるメイス', icon: '🔱' },
      leftHand:   { name: '祈りの盾',     icon: '🛡️' },
      armor:      { name: '法衣',         icon: '👘' },
      accessory1: { name: '回復の指輪',   icon: '💍' },
      accessory2: { name: '聖なるお守り',  icon: '📿' },
    },
    iconGradient: ['#facc15', '#f59e0b'],
    iconEmoji: '✨',
  },
  {
    id: 4,
    name: 'カイト',
    jobName: 'シーフ',
    level: 10,
    sp: 3,
    jobLevel: 10,
    hp:     { current: 320, max: 380 },
    mp:     { current: 50,  max: 80 },
    exp:    { current: 4100, max: 5000 },
    jobExp: { current: 2800, max: 3000 },
    stats:  { atk: 65, def: 40, matk: 20, mdef: 35, spd: 90 },
    equipment: {
      rightHand:  { name: '短剣',         icon: '🗡️' },
      leftHand:   { name: '短剣',         icon: '🗡️' },
      armor:      { name: 'レザーアーマー', icon: '🥋' },
      accessory1: { name: '盗みの手袋',    icon: '🧤' },
      accessory2: { name: '影のマント',    icon: '🧣' },
    },
    iconGradient: ['#22c55e', '#10b981'],
    iconEmoji: '🗡️',
  },
];
