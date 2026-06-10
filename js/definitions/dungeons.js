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
          { slime_blue:  3,                 weight: 5 },
          { slime_blue:  8,                 weight: 5 },
          { slime_dark:  1,                 weight: 0.01 },
          { slime_angel: 1,                 weight: 0.01 }
        ] }, {
        level: 2,
        monsters: [
          { slime_green: 1, slime_blue: 1, weight: 59.94 },
          { slime_green: 2,                weight: 20 },
          { slime_green: 3, slime_red: 1,  weight: 20 },
          { slime_dark:  1,                weight: 0.03 },
          { slime_angel: 1,                weight: 0.03 }
        ]
      },
      {
        level: 3,
        monsters: [
          { slime_red:  2,                   weight: 49.86 },
          { slime_red:  1, slime_green: 1,   weight: 30 },
          { slime_red:  3, slime_water: 1,   weight: 20 },
          { slime_dark:  1,                  weight: 0.07 },
          { slime_angel: 1,                  weight: 0.07 }
        ]
      }, {
        level: 4,
        monsters: [
          { slime_red:  1, slime_water: 1,   weight: 49.70 },
          { slime_water: 5,                  weight: 30 },
          { slime_water: 2, slime_fire: 1,   weight: 20 },
          { slime_dark:  1,                  weight: 0.15 },
          { slime_angel: 1,                  weight: 0.15 }
        ]
      }, {
        level: 5,
        monsters: [
          { slime_water: 1, slime_fire: 1,   weight: 49.40 },
          { slime_fire:  2,                  weight: 30 },
          { slime_fire:  2, slime_ice: 1,    weight: 20 },
          { slime_dark:  1,                  weight: 0.3 },
          { slime_angel: 1,                  weight: 0.3 }
        ]
      }, {
        level: 6,
        monsters: [
          { slime_fire:  1, slime_ice: 1,    weight: 49 },
          { slime_ice:   2, slime_wind: 2,   weight: 20 },
          { slime_ice:   3,                  weight: 15 },
          { slime_fire:  3,                  weight: 15 },
          { slime_dark:  1,                  weight: 0.5 },
          { slime_angel: 1,                  weight: 0.5 }
        ]
      }, {
        level: 7,
        monsters: [
          { slime_ice:   1, slime_wind: 1,    weight: 48.4 },
          { slime_wind:  2,                   weight: 30 },
          { slime_wind:  4, slime_thunder: 1, weight: 20 },
          { slime_dark:  1,                   weight: 0.8 },
          { slime_angel: 1,                   weight: 0.8 }
        ]
      }, {
        level: 8,
        monsters: [
          { slime_wind:    1, slime_thunder: 1, weight: 47.6 },
          { slime_thunder: 5,                   weight: 30 },
          { slime_thunder: 1, slime_flower: 1,  weight: 20 },
          { slime_dark:    1,                   weight: 1.2 },
          { slime_angel:   1,                   weight: 1.2 }
        ]
      }, {
        level: 9,
        monsters: [
          { slime_thunder: 1, slime_flower: 1, weight: 46.4 },
          { slime_flower:  3,                  weight: 30 },
          { slime_flower:  3, slime_grass: 3,  weight: 20 },
          { slime_dark:    1,                  weight: 1.8 },
          { slime_angel:   1,                  weight: 1.8 }
        ]
      }, {
        level: 10,
        monsters: [
          { slime_flower: 1, slime_grass: 1,  weight: 45 },
          { slime_grass:  2,                  weight: 30 },
          { slime_grass:  4, slime_flower: 1, slime_thunder: 1, weight: 20 },
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
    id: 'spider_cave',
    name: '蜘蛛の洞窟',
    description: '蜘蛛が巣食う不気味な洞窟。',
    image: 'assets/dungeon/spider_cave.webp',
    isUnlocked: false,
    floors: [
      {
        level: 1,
        monsters: [
          { spider_cave: 4, weight: 49.98 },
          { spider_cave: 3, swarm_spider: 3, weight: 30 },
          { swarm_spider: 8, weight: 20 },
          { weaver_golden: 1, weight: 0.01 },
          { arachnid_crystal: 1, weight: 0.01 }
        ]
      },
      {
        level: 2,
        monsters: [
          { spider_cave: 4, spider_poison: 2, weight: 49.96 },
          { swarm_spider: 10, weight: 30 },
          { spider_poison: 5, weight: 20 },
          { weaver_golden: 1, weight: 0.02 },
          { arachnid_crystal: 1, weight: 0.02 }
        ]
      },
      {
        level: 3,
        monsters: [
          { spider_poison: 6, weight: 49.94 },
          { spider_poison: 3, weaver_web: 3, weight: 30 },
          { spider_trapdoor: 2, swarm_spider: 6, weight: 20 },
          { weaver_golden: 1, weight: 0.03 },
          { arachnid_crystal: 1, weight: 0.03 }
        ]
      },
      {
        level: 4,
        monsters: [
          { weaver_web: 4, spitter_acid: 2, weight: 49.90 },
          { spitter_acid: 5, spider_poison: 3, weight: 30 },
          { arachnid_shadow: 2, swarm_spider: 8, weight: 20 },
          { weaver_golden: 1, weight: 0.05 },
          { arachnid_crystal: 1, weight: 0.05 }
        ]
      },
      {
        level: 5,
        monsters: [
          { arachnid_shadow: 3, tick_blood: 3, weight: 49.8 },
          { spider_trapdoor: 4, crawler_bone: 3, weight: 30 },
          { tick_blood: 6, swarm_spider: 6, weight: 20 },
          { weaver_golden: 1, weight: 0.1 },
          { arachnid_crystal: 1, weight: 0.1 }
        ]
      },
      {
        level: 6,
        monsters: [
          { tick_blood: 5, crawler_bone: 3, weight: 49.6 },
          { crawler_bone: 6, weight: 30 },
          { arachnid_shadow: 4, spitter_acid: 4, weight: 20 },
          { weaver_golden: 1, weight: 0.2 },
          { arachnid_crystal: 1, weight: 0.2 }
        ]
      },
      {
        level: 7,
        monsters: [
          { swarm_spider: 15, weight: 49 },
          { spider_dark: 3, tick_blood: 4, weight: 30 },
          { spider_dark: 3, crawler_bone: 5, weight: 20 },
          { weaver_golden: 1, weight: 0.5 },
          { arachnid_crystal: 1, weight: 0.5 }
        ]
      },
      {
        level: 8,
        monsters: [
          { boss_broodmother: 1, swarm_spider: 8, weight: 100 }
        ]
      },
      {
        level: 9,
        monsters: [
          { boss_arachne: 1, spider_poison: 5, weaver_web: 5, weight: 100 }
        ]
      },
      {
        level: 10,
        monsters: [
          { boss_deathweaver: 1, arachnid_shadow: 6, tick_blood: 6, weight: 100 }
        ]
      }
    ]
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