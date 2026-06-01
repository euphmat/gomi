/**
 * このファイルは武器（右手に装備するアイテム）のデータをまとめたファイルです。
 * 
 * 武器のデータ定義ファイル
 * 
 * テンプレート（各項目は省略可能、省略された値は 0 として扱われます）
 *    stats:         { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
 *    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
 *    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
 */

export const WEAPONS = [
  {
    id: 'wooden_stick', name: '木の棒',
    stats: { atk: 1, matk: 1 },
    ability: { name: '振り下ろし', description: '通常攻撃時に 10% の確率で 2 倍のダメージを与えます。', execute: (attacker, defender, damage, battle) => { if (Math.random() < 0.10) { setTimeout(() => { battle.showActionName(attacker.elementId, '振り下ろし', 'text-yellow-300', 'border-yellow-500/50'); }, 300); return damage * 2; } return damage; } }
  },
  {
    id: 'slime_sword', name: 'スライムソード',
    stats:   { atk: 2, matk: 1 },
    elements:{ water: 10 },
    recipe: { price: 100, materials: [ { id: 'wooden_stick', amount: 1 }, { id: 'slime_jelly', amount: 10 } ] },
    ability: { name: 'スライムキラー', description: '名前に「スライム」が含まれる敵に対して、常時 1.2 倍のダメージを与えます。', execute: (attacker, defender, damage, battle) => { if (defender.name && defender.name.includes('スライム')) { return Math.floor(damage * 1.2); } return damage; } }
  },
  {
    id: 'slime_hammer', name: 'スライムハンマー',
    stats:         { atk: 10, matk: 10, spd: -2 },
    elements:      { water: 20 },
    ability: { name: 'スライムスマッシュ', description: '名前に「スライム」が含まれる敵に対して、常時 1.4 倍のダメージを与えます。', execute: (attacker, defender, damage, battle) => { if (defender.name && defender.name.includes('スライム')) { return Math.floor(damage * 1.4); } return damage; } }
  }
].map(item => ({ ...item, slot: 'rightHand', image: `./assets/weapon/${item.id}.webp` }));
