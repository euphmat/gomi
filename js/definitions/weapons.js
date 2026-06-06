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
  { id: 'wooden_stick',     name: '木の棒',               stats: { atk: 1, }, ability: { name: '振り下ろし', description: '通常攻撃時に 10% の確率で 2 倍のダメージを与えます。', execute: (attacker, defender, damage, battle) => { if (Math.random() < 0.10) { setTimeout(() => { battle.showActionName(attacker.elementId, '振り下ろし', 'text-yellow-300', 'border-yellow-500/50'); }, 300); return damage * 2; } return damage; } } },
  { id: 'slime_blue_sword', name: 'ブルースライムソード', stats: { atk: 4  }, recipe: { price: 200, materials: [ { id: 'slime_blue_jelly', amount: 10 }, { id: 'slime_blue_core', amount: 1 } ] } },
  { id: 'slime_red_sword',  name: 'レッドスライムソード', stats: { atk: 8, }, recipe: { price: 650, materials: [ { id: 'slime_red_jelly', amount: 3 }, { id: 'slime_red_core', amount: 1 }] } },



  {
    id: 'slime_fire_sword',
    name: 'ファイヤースライムソード',
    stats: {
      atk: 30,
      matk: 30
    },
    recipe: {
      price: 350,
      materials: [{
        id: 'slime_fire_jelly',
        amount: 3
      }, {
        id: 'slime_fire_core',
        amount: 1
      }]
    }
  },
  {
    id: 'slime_angel_bow',
    name: 'エンジェルスライムボウ',
    stats: {
      atk: 10,
      matk: 10
    },
    recipe: {
      price: 100,
      materials: [{
        id: 'slime_angel_jelly',
        amount: 3
      }, {
        id: 'slime_angel_core',
        amount: 1
      }]
    }
  },
  {
    id: 'slime_angel_king_staff',
    name: 'エンジェルキングスタッフ',
    stats: {
      atk: 14,
      matk: 14
    },
    recipe: {
      price: 150,
      materials: [{
        id: 'slime_angel_king_jelly',
        amount: 3
      }, {
        id: 'slime_angel_king_core',
        amount: 1
      }]
    }
  },
  {
    id: 'slime_dark_bow',
    name: 'ダークスライムボウ',
    stats: {
      atk: 22,
      matk: 22
    },
    recipe: {
      price: 250,
      materials: [{
        id: 'slime_dark_jelly',
        amount: 3
      }, {
        id: 'slime_dark_core',
        amount: 1
      }]
    }
  },
  {
    id: 'slime_earth_staff',
    name: 'アーススライムスタッフ',
    stats: {
      atk: 26,
      matk: 26
    },
    recipe: {
      price: 300,
      materials: [{
        id: 'slime_earth_jelly',
        amount: 3
      }, {
        id: 'slime_earth_core',
        amount: 1
      }]
    }
  },
  {
    id: 'slime_flower_bow',
    name: 'フラワースライムボウ',
    stats: {
      atk: 34,
      matk: 34
    },
    recipe: {
      price: 400,
      materials: [{
        id: 'slime_flower_jelly',
        amount: 3
      }, {
        id: 'slime_flower_core',
        amount: 1
      }]
    }
  },
  {
    id: 'slime_grass_staff',
    name: 'グラススライムスタッフ',
    stats: {
      atk: 38,
      matk: 38
    },
    recipe: {
      price: 450,
      materials: [{
        id: 'slime_grass_jelly',
        amount: 3
      }, {
        id: 'slime_grass_core',
        amount: 1
      }]
    }
  },
  {
    id: 'slime_ice_bow',
    name: 'アイススライムボウ',
    stats: {
      atk: 46,
      matk: 46
    },
    recipe: {
      price: 550,
      materials: [{
        id: 'slime_ice_jelly',
        amount: 3
      }, {
        id: 'slime_ice_core',
        amount: 1
      }]
    }
  },
  {
    id: 'slime_king_staff',
    name: 'キングスライムスタッフ',
    stats: {
      atk: 50,
      matk: 50
    },
    recipe: {
      price: 600,
      materials: [{
        id: 'slime_king_jelly',
        amount: 3
      }, {
        id: 'slime_king_core',
        amount: 1
      }]
    }
  },
  {
    id: 'slime_thunder_bow',
    name: 'サンダースライムボウ',
    stats: {
      atk: 58,
      matk: 58
    },
    recipe: {
      price: 700,
      materials: [{
        id: 'slime_thunder_jelly',
        amount: 3
      }, {
        id: 'slime_thunder_core',
        amount: 1
      }]
    }
  },
  {
    id: 'slime_water_staff',
    name: 'ウォータースライムスタッフ',
    stats: {
      atk: 62,
      matk: 62
    },
    recipe: {
      price: 750,
      materials: [{
        id: 'slime_water_jelly',
        amount: 3
      }, {
        id: 'slime_water_core',
        amount: 1
      }]
    }
  },
  {
    id: 'slime_wind_sword',
    name: 'ウインドスライムソード',
    stats: {
      atk: 66,
      matk: 66
    },
    recipe: {
      price: 800,
      materials: [{
        id: 'slime_wind_jelly',
        amount: 3
      }, {
        id: 'slime_wind_core',
        amount: 1
      }]
    }
  },
].map(item => ({
  ...item,
  slot: 'rightHand',
  image: `./assets/weapon/${item.id}.webp`
}));