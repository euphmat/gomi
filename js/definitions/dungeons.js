export const DUNGEONS = [{
    id: 'slime_forest',
    name: 'スライムの森',
    description: '初心者向けの安全な森。スライムが多数生息している。',
    image: 'assets/dungeon/slime_forest.webp',
    bgImage: 'assets/dungeon/bg_slime_forest.webp',
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
    bgImage: 'assets/dungeon/bg_spider_cave.webp',
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
    id: 'crystal_cave',
    name: 'クリスタルの洞窟',
    description: '美しいクリスタルが輝く洞窟。',
    image: 'assets/dungeon/crystal_cave.webp',
    bgImage: 'assets/dungeon/bg_crystal_cave.webp',
    isUnlocked: false,
    floors: [
      {
        level: 1,
        monsters: [
          { crisp: 5, weight: 60 },
          { crisp: 3, snow_flare: 2, weight: 30 },
          { luminous_digitalis: 1, weight: 5 },
          { noble_opal: 1, weight: 5 }
        ]
      },
      {
        level: 2,
        monsters: [
          { crisp: 4, geode_turtle: 2, weight: 50 },
          { geode_turtle: 3, snow_flare: 2, weight: 40 },
          { luminous_digitalis: 1, weight: 5 },
          { noble_opal: 1, weight: 5 }
        ]
      },
      {
        level: 3,
        monsters: [
          { geode_turtle: 4, crystalinos: 1, weight: 50 },
          { crystalinos: 2, crisp: 3, weight: 40 },
          { luminous_digitalis: 1, weight: 5 },
          { noble_opal: 1, weight: 5 }
        ]
      },
      {
        level: 4,
        monsters: [
          { crystalinos: 3, garnet_wolf: 2, weight: 50 },
          { garnet_wolf: 4, snow_flare: 2, weight: 40 },
          { luminous_digitalis: 1, weight: 5 },
          { noble_opal: 1, weight: 5 }
        ]
      },
      {
        level: 5,
        monsters: [
          { garnet_wolf: 3, amber_rex: 2, weight: 50 },
          { amber_rex: 3, crystalinos: 2, weight: 40 },
          { luminous_digitalis: 1, weight: 5 },
          { noble_opal: 1, weight: 5 }
        ]
      },
      {
        level: 6,
        monsters: [
          { amber_rex: 2, beryl_golem: 2, jewel_mantis: 1, weight: 50 },
          { beryl_golem: 3, jewel_mantis: 2, weight: 40 },
          { luminous_digitalis: 1, weight: 5 },
          { noble_opal: 1, weight: 5 }
        ]
      },
      {
        level: 7,
        monsters: [
          { fluorite_papillon: 3, pyrite_serpent: 2, weight: 50 },
          { pyrite_serpent: 3, jewel_mantis: 3, weight: 40 },
          { luminous_digitalis: 2, weight: 5 },
          { noble_opal: 2, weight: 5 }
        ]
      },
      {
        level: 8,
        monsters: [
          { diamond_disaster: 1, crisp: 4, weight: 100 }
        ]
      },
      {
        level: 9,
        monsters: [
          { harmonia_regalia: 1, beryl_golem: 2, weight: 100 }
        ]
      },
      {
        level: 10,
        monsters: [
          { genesis_prism: 1, luminous_digitalis: 2, noble_opal: 2, weight: 100 }
        ]
      }
    ]
  },
  {
    id: 'ghost_castle',
    name: '亡霊の廃城',
    description: '亡霊が彷徨う廃城。',
    image: 'assets/dungeon/ghost_castle.webp',
    bgImage: 'assets/dungeon/bg_ghost_castle.webp',
    isUnlocked: false,
    floors: []
  },
  {
    id: 'spirit_valley',
    name: '精霊の唄う谷',
    description: '精霊たちの声が響く神秘的な谷。',
    image: 'assets/dungeon/spirit_valley.webp',
    bgImage: 'assets/dungeon/bg_spirit_valley.webp',
    isUnlocked: false,
    floors: []
  },
  {
    id: 'mystic_temple',
    name: '神秘の神殿',
    description: '古の魔法が眠る神殿。',
    image: 'assets/dungeon/mystic_temple.webp',
    bgImage: 'assets/dungeon/bg_mystic_temple.webp',
    isUnlocked: false,
    floors: []
  },
  {
    id: 'stargazer_tower',
    name: '星詠みの塔',
    description: '星空に最も近い高塔。',
    image: 'assets/dungeon/stargazer_tower.webp',
    bgImage: 'assets/dungeon/bg_stargazer_tower.webp',
    isUnlocked: false,
    floors: []
  },
  {
    id: 'hell_cave',
    name: '地獄の魔洞',
    description: '恐ろしい魔物が潜む洞窟。',
    image: 'assets/dungeon/hell_cave.webp',
    bgImage: 'assets/dungeon/bg_hell_cave.webp',
    isUnlocked: false,
    floors: []
  },
  {
    id: 'dragon_lair',
    name: '竜の巣窟',
    description: '強大な竜たちが棲む巣窟。',
    image: 'assets/dungeon/dragon_lair.webp',
    bgImage: 'assets/dungeon/bg_dragon_lair.webp',
    isUnlocked: false,
    floors: []
  },
  {
    id: 'sky_demon_castle',
    name: '天空魔城',
    description: '天空に浮かぶ恐ろしい魔城。',
    image: 'assets/dungeon/sky_demon_castle.webp',
    bgImage: 'assets/dungeon/bg_sky_demon_castle.webp',
    isUnlocked: false,
    floors: []
  },
  {
    id: 'moonlit_hall',
    name: '月夜の礼堂',
    description: '月光に照らされた静寂の礼堂。',
    image: 'assets/dungeon/moonlit_hall.webp',
    bgImage: 'assets/dungeon/bg_moonlit_hall.webp',
    isUnlocked: false,
    floors: []
  },
  {
    id: 'cloud_altar',
    name: '雲海に浮かぶ祭壇',
    description: '雲海の上に建設された神聖な祭壇。',
    image: 'assets/dungeon/cloud_altar.webp',
    bgImage: 'assets/dungeon/bg_cloud_altar.webp',
    isUnlocked: false,
    floors: []
  },
  {
    id: 'dusk_labyrinth',
    name: '宵闇の迷宮',
    description: '決して夜が明けない迷宮。',
    image: 'assets/dungeon/dusk_labyrinth.webp',
    bgImage: 'assets/dungeon/bg_dusk_labyrinth.webp',
    isUnlocked: false,
    floors: []
  },
  {
    id: 'eternal_ruins',
    name: '悠久の神殿跡',
    description: '途方もない時を経た神殿の跡地。',
    image: 'assets/dungeon/eternal_ruins.webp',
    bgImage: 'assets/dungeon/bg_eternal_ruins.webp',
    isUnlocked: false,
    floors: []
  },
  {
    id: 'subspace',
    name: '亜空間',
    description: '世界の理から外れた異次元空間。',
    image: 'assets/dungeon/subspace.webp',
    bgImage: 'assets/dungeon/bg_subspace.webp',
    isUnlocked: false,
    floors: []
  }
];