# Implementing Monsters and Drop Items
Please implement the monsters listed below, along with the items they drop when defeated.

## List of Monster IDs
### 雑魚敵（10体）
- `spider_cave` : ケイブスパイダー
- `spider_poison` : ポイズンスパイダー
- `spider_trapdoor` : トラップドアスパイダー
- `weaver_web` : ウェブウィーバー
- `spitter_acid` : アシッドスピッター
- `arachnid_shadow` : シャドウアラクニド
- `tick_blood` : ブラッドティック
- `crawler_bone` : ボーンクロウラー
- `swarm_spider` : スパイダースウォーム
- `spider_dark` : ダークウィドウ

### レア敵（2体）
- `weaver_golden` : ゴールデンウィーバー
- `arachnid_crystal` : クリスタルアラクニド

### ボス敵（3体）
- `boss_broodmother` : ブルードマザー
- `boss_arachne` : アラクネ・クイーン
- `boss_deathweaver` : デスウィーバー

## Step 0. Creating Dungeons and Managing Flags
- Dungeon theme to be implemented: Spider Cave
- To unlock the dungeon to be implemented, retrieve the latest dungeon name and implement the logic so that it is unlocked upon clearing that dungeon.

## Step 1. Implementing Monster Stats
Please implement the monsters in js/definitions/monsters.js using the following template.

```js:template example
{
  id: 'slime', name: 'Slime',
  stats:    { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
  // Set the element based on the one associated with the monster's name. If no element comes to mind, leave it blank.
  elements: { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
  // If the monster appears likely to use status ailment attacks, set a status ailment value as well. If no such association exists, leave it blank.
  ailments: { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
  rewards:  { exp: 0, jp: 0,  gold: 0 },
  // Must set 3 items. Implement low-probability to ultra-low-probability drop items. (3 materials)
  drops: [
    { itemId: 'slime_jelly', rate: 5 },
    { itemId: 'slime_core', rate: 1 },
    { itemId: 'slime_fluid', rate: 0.1 },
  ],
  // Set the skills the monster is likely to use.
  actions: [ { name: 'Body Slam', chance: 10, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: 'Body Slam', damageMultiplier: 2 }); } } ]
    }
```

## 2. Implementing Drop Items
Important: Do not prepare item images during this phase.
Referring to the IDs set above, implement the items and their stats in each of the following files:
- js/definitions/accessories.js
- js/definitions/armors.js
- js/definitions/materials.js
- js/definitions/shields.js
- js/definitions/weapons.js