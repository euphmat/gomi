export const DUNGEONS = [{
    id: 'slime_forest',
    name: 'スライムの森',
    description: '初心者向けの安全な森。スライムが多数生息している。',
    image: 'assets/dungeon/slime_forest.webp',
    isUnlocked: true,
    floors: [ {
        level: 1,
        monsters: [
          { slime_blue:  1,                 weight: 49.98 },
          { slime_blue:  2,                 weight: 40 },
          { slime_blue:  1, slime_green: 1, weight: 9 },
          { slime_green: 2,                 weight: 1 },
          { slime_dark:  1,                 weight: 0.01 },
          { slime_angel: 1,                 weight: 0.01 }
        ] }, {
        level: 2,
        monsters: [
          { slime_green: 1, slime_blue: 1, weight: 59.94 },
          { slime_green: 2,                weight: 20 },
          { slime_green: 1, slime_red: 1,  weight: 20 },
          { slime_dark:  1,                weight: 0.03 },
          { slime_angel: 1,                weight: 0.03 }
        ]
      },
      {
        level: 3,
        monsters: [
          { slime_red:  2,                   weight: 49.86 },
          { slime_red:  1, slime_green: 1,   weight: 30 },
          { slime_red:  1, slime_water: 1,   weight: 20 },
          { slime_dark:  1,                  weight: 0.07 },
          { slime_angel: 1,                  weight: 0.07 }
        ]
      }, {
        level: 4,
        monsters: [
          { slime_red:  1, slime_water: 1,   weight: 49.70 },
          { slime_water: 2,                  weight: 30 },
          { slime_water: 1, slime_fire: 1,   weight: 20 },
          { slime_dark:  1,                  weight: 0.15 },
          { slime_angel: 1,                  weight: 0.15 }
        ]
      }, {
        level: 5,
        monsters: [
          { slime_water: 1, slime_fire: 1,   weight: 49.40 },
          { slime_fire:  2,                  weight: 30 },
          { slime_fire:  1, slime_ice: 1,    weight: 20 },
          { slime_dark:  1,                  weight: 0.3 },
          { slime_angel: 1,                  weight: 0.3 }
        ]
      }, {
        level: 6,
        monsters: [
          { slime_fire:  1, slime_ice: 1,    weight: 49 },
          { slime_ice:   2,                  weight: 30 },
          { slime_ice:   1, slime_wind: 1,   weight: 20 },
          { slime_dark:  1,                  weight: 0.5 },
          { slime_angel: 1,                  weight: 0.5 }
        ]
      }, {
        level: 7,
        monsters: [
          { slime_ice:   1, slime_wind: 1,    weight: 48.4 },
          { slime_wind:  2,                   weight: 30 },
          { slime_wind:  1, slime_thunder: 1, weight: 20 },
          { slime_dark:  1,                   weight: 0.8 },
          { slime_angel: 1,                   weight: 0.8 }
        ]
      }, {
        level: 8,
        monsters: [
          { slime_wind:    1, slime_thunder: 1, weight: 47.6 },
          { slime_thunder: 2,                   weight: 30 },
          { slime_thunder: 1, slime_flower: 1,  weight: 20 },
          { slime_dark:    1,                   weight: 1.2 },
          { slime_angel:   1,                   weight: 1.2 }
        ]
      }, {
        level: 9,
        monsters: [
          { slime_thunder: 1, slime_flower: 1, weight: 46.4 },
          { slime_flower:  2,                  weight: 30 },
          { slime_flower:  1, slime_grass: 1,  weight: 20 },
          { slime_dark:    1,                  weight: 1.8 },
          { slime_angel:   1,                  weight: 1.8 }
        ]
      }, {
        level: 10,
        monsters: [
          { slime_flower: 1, slime_grass: 1,  weight: 45 },
          { slime_grass:  2,                  weight: 30 },
          { slime_grass:  1, slime_flower: 1, slime_thunder: 1, weight: 20 },
          { slime_dark:   1,                  weight: 2.5 },
          { slime_angel:  1,                  weight: 2.5 }
        ]
      }, {
        level: 11,
        monsters: [
          { slime_king: 1,       weight: 95 },
          { slime_angel_king: 1, weight: 5 }
        ]
      }
    ]
  },
  {
    id: 'goblin_cave',
    name: 'ゴブリンの洞窟',
    description: '薄暗く危険な洞窟。',
    image: '',
    isUnlocked: false,
    floors: []
  },
  {
    id: 'unknown_ruins',
    name: '???',
    description: '未解放のエリア',
    image: '',
    isUnlocked: false,
    floors: []
  }
];