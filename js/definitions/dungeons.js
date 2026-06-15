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
          { slime_earth:  2,                  weight: 35 },
          { slime_earth:  3, slime_grass: 1, slime_flower: 1, weight: 20 },
          { slime_dark:   3,                  weight: 22.5 },
          { slime_angel:  3,                  weight: 22.5 }
        ]
      }, {
        level: 12,
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
          { spider_cave: 2, weight: 49.98 },
          { spider_cave: 3, weight: 30 },
          { spider_cave: 2, spider_poison: 1, weight: 20 },
          { weaver_golden: 1, weight: 0.01 },
          { arachnid_crystal: 1, weight: 0.01 }
        ]
      },
      {
        level: 2,
        monsters: [
          { spider_cave: 3, spider_poison: 1, weight: 49.96 },
          { spider_poison: 3, weight: 30 },
          { spider_poison: 2, spider_trapdoor: 1, weight: 20 },
          { weaver_golden: 1, weight: 0.02 },
          { arachnid_crystal: 1, weight: 0.02 }
        ]
      },
      {
        level: 3,
        monsters: [
          { spider_poison: 4, weight: 49.94 },
          { spider_poison: 2, spider_trapdoor: 2, weight: 30 },
          { spider_trapdoor: 3, weaver_web: 1, weight: 20 },
          { weaver_golden: 1, weight: 0.03 },
          { arachnid_crystal: 1, weight: 0.03 }
        ]
      },
      {
        level: 4,
        monsters: [
          { spider_trapdoor: 3, weaver_web: 2, weight: 49.90 },
          { weaver_web: 4, weight: 30 },
          { weaver_web: 2, spitter_acid: 2, weight: 20 },
          { weaver_golden: 1, weight: 0.05 },
          { arachnid_crystal: 1, weight: 0.05 }
        ]
      },
      {
        level: 5,
        monsters: [
          { weaver_web: 2, spitter_acid: 3, weight: 49.8 },
          { spitter_acid: 4, weight: 30 },
          { spitter_acid: 2, arachnid_shadow: 2, weight: 20 },
          { weaver_golden: 1, weight: 0.1 },
          { arachnid_crystal: 1, weight: 0.1 }
        ]
      },
      {
        level: 6,
        monsters: [
          { arachnid_shadow: 3, tick_blood: 2, weight: 49.6 },
          { tick_blood: 4, weight: 30 },
          { tick_blood: 2, crawler_bone: 2, weight: 20 },
          { weaver_golden: 1, weight: 0.2 },
          { arachnid_crystal: 1, weight: 0.2 }
        ]
      },
      {
        level: 7,
        monsters: [
          { crawler_bone: 3, swarm_spider: 2, weight: 49 },
          { swarm_spider: 4, weight: 30 },
          { swarm_spider: 2, spider_dark: 2, weight: 20 },
          { weaver_golden: 1, weight: 0.5 },
          { arachnid_crystal: 1, weight: 0.5 }
        ]
      },
      {
        level: 8,
        monsters: [
          { boss_broodmother: 1, weight: 100 }
        ]
      },
      {
        level: 9,
        monsters: [
          {weaver_golden: 1, boss_arachne: 1, weaver_golden: 1, weight: 100 }
        ]
      },
      {
        level: 10,
        monsters: [
          {arachnid_crystal: 1, boss_deathweaver: 1, arachnid_crystal:1,  weight: 100 }
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
          { crisp: 3, weight: 50 },
          { crisp: 4, weight: 30 },
          { crisp: 2, geode_turtle: 1, weight: 20 }
        ]
      },
      {
        level: 2,
        monsters: [
          { crisp: 2, geode_turtle: 2, weight: 40 },
          { geode_turtle: 3, weight: 30 },
          { geode_turtle: 2, snow_frog: 1, weight: 30 }
        ]
      },
      {
        level: 3,
        monsters: [
          { geode_turtle: 2, snow_frog: 2, weight: 40 },
          { snow_frog: 3, weight: 30 },
          { snow_frog: 2, crystalinos: 1, weight: 30 }
        ]
      },
      {
        level: 4,
        monsters: [
          { snow_frog: 1, crystalinos: 2, weight: 40 },
          { crystalinos: 3, weight: 30 },
          { crystalinos: 2, garnet_wolf: 1, weight: 30 }
        ]
      },
      {
        level: 5,
        monsters: [
          { crystalinos: 1, garnet_wolf: 2, weight: 30 },
          { garnet_wolf: 3, weight: 30 },
          { garnet_wolf: 2, amber_rex: 1, weight: 20 },
          { amber_rex: 2, beryl_golem: 1, weight: 20 }
        ]
      },
      {
        level: 6,
        monsters: [
          { amber_rex: 1, beryl_golem: 2, weight: 30 },
          { beryl_golem: 2, jewel_mantis: 1, weight: 30 },
          { jewel_mantis: 3, weight: 20 },
          { jewel_mantis: 2, fluorite_papillon: 1, weight: 20 }
        ]
      },
      {
        level: 7,
        monsters: [
          { fluorite_papillon: 3, weight: 30 },
          { fluorite_papillon: 2, pyrite_serpent: 1, weight: 30 },
          { pyrite_serpent: 2, luminous_digitalis: 1, weight: 20 },
          { luminous_digitalis: 2, noble_opal: 1, weight: 20 }
        ]
      },
      {
        level: 8,
        monsters: [
          { diamond_disaster: 1, fluorite_papillon: 2, weight: 100 }
        ]
      },
      {
        level: 9,
        monsters: [
          { harmonia_regalia: 1, pyrite_serpent: 2, weight: 100 }
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
    floors: [
      {
        level: 1,
        monsters: [
          { rust_guard: 3, weight: 50 },
          { rust_guard: 2, dust_maid: 1, weight: 49.9 },
          { lost_glitter: 1, weight: 0.1 }
        ]
      },
      {
        level: 2,
        monsters: [
          { dust_maid: 3, weight: 40 },
          { rust_guard: 2, dust_maid: 2, weight: 30 },
          { dust_maid: 2, cursed_chandelier: 1, weight: 29.9 },
          { lost_glitter: 1, weight: 0.1 }
        ]
      },
      {
        level: 3,
        monsters: [
          { rust_guard: 2, cursed_chandelier: 1, weight: 40 },
          { cursed_chandelier: 2, weight: 30 },
          { cursed_chandelier: 1, wizard_library: 1, weight: 29.9 },
          { lost_glitter: 1, weight: 0.1 }
        ]
      },
      {
        level: 4,
        monsters: [
          { cursed_chandelier: 2, wizard_library: 1, weight: 40 },
          { wizard_library: 3, weight: 30 },
          { wizard_library: 2, hollow_president: 1, weight: 29.9 },
          { lost_glitter: 1, weight: 0.1 }
        ]
      },
      {
        level: 5,
        monsters: [
          { wizard_library: 2, hollow_president: 1, weight: 40 },
          { hollow_president: 2, weight: 30 },
          { hollow_president: 1, shadow_hound: 2, weight: 29.9 },
          { lost_glitter: 1, weight: 0.1 }
        ]
      },
      {
        level: 6,
        monsters: [
          { hollow_president: 1, shadow_hound: 2, weight: 30 },
          { shadow_hound: 3, weight: 40 },
          { shadow_hound: 2, requiem_rat: 1, weight: 29.9 },
          { lost_glitter: 1, weight: 0.1 }
        ]
      },
      {
        level: 7,
        monsters: [
          { shadow_hound: 2, requiem_rat: 2, weight: 40 },
          { requiem_rat: 3, weight: 30 },
          { requiem_rat: 2, death_imperator: 1, weight: 29.9 },
          { lost_glitter: 1, weight: 0.1 }
        ]
      },
      {
        level: 8,
        monsters: [
          { requiem_rat: 8, weight: 99.9 },
          { lost_glitter: 1, weight: 0.1 }
        ]
      },
      {
        level: 9,
        monsters: [
          { death_imperator: 1, weight: 100 }
        ]
      },
      {
        level: 10,
        monsters: [
          { necro_origin: 1, weight: 100 }
        ]
      }
    ]
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