# Implementing Monsters and Drop Items
Please implement the monsters listed below, along with the items they drop when defeated.

## List of Monster IDs
- slime_angel
- slime_angel_king
- slime_blue
- slime_dark
- slime_earth
- slime_fire
- slime_flower
- slime_grass
- slime_green
- slime_ice
- slime_king
- slime_red
- slime_thunder
- slime_water
- slime_wind

## Step 1. Implementing Monster Stats
Please implement the monsters in js/definitions/monsters.js using the following template.

```js:template example
{
id: 'slime', name: 'Slime',
stats:    { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
elements: { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
ailments: { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
rewards:  { exp: 0, jp: 0,  gold: 0 },
// Must set 5 items. Implement low-probability to ultra-low-probability drop items. (3 materials, 1 piece of armor, 1 weapon)
drops: [
{ itemId: 'slime_jelly', rate: 5 },
{ itemId: 'slime_core', rate: 1 },
{ itemId: 'slime_fluid', rate: 0.5 },
{ itemId: 'slime_sword', rate: 0.01 },
],
// List the item IDs for defeat rewards.
killRewards: [
{ count: 100, itemId: 'purupuru_ring' },
{ count: 1000, itemId: 'slime_hammer' }
],
// Set the skills the monster is likely to use.
actions: [ { name: 'Body Slam', chance: 10, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: 'Body Slam', damageMultiplier: 2 }); } } ]
  }
```

## 2. Implementing Drop Items and Defeat Rewards
Important: Do not prepare item images during this phase.
Referring to the IDs set above, implement the items and their stats in each of the following files:
- js/definitions/accessories.js
- js/definitions/armors.js
- js/definitions/materials.js
- js/definitions/shields.js
- js/definitions/weapons.js