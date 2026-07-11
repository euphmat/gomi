export const SPECIAL_DUNGEONS = [
  {
    id: 'golden_slime_island',
    name: '黄金のスライム島',
    description: '黄金に輝くスライムが生息する謎の島。',
    image: 'assets/dungeon/golden_slime_island.webp',
    bgImage: 'assets/dungeon/bg_golden_slime_island.webp',
    theme: { color: '234, 179, 8', icon: 'auto_awesome' },
    unlockCondition: { medals: 18 },

    floors: [
      { level: 1, monsters: [{ slime_gold: 1, weight: 100 }] },
      { level: 2, monsters: [{ slime_gold: 2, weight: 100 }] },
      { level: 3, monsters: [{ slime_gold: 3, weight: 100 }] },
      { level: 4, monsters: [{ slime_gold: 4, weight: 100 }] },
      { level: 5, monsters: [{ slime_gold: 5, weight: 100 }] },
      { level: 6, monsters: [{ slime_gold_king: 1, weight: 100 }] },
      { level: 7, monsters: [{ slime_gold_king: 2, weight: 100 }] },
      { level: 8, monsters: [{ slime_gold_king: 3, weight: 100 }] },
      { level: 9, monsters: [{ slime_gold_king: 4, weight: 100 }] },
      { level: 10, monsters: [{ slime_gold_king: 5, weight: 100 }] },
      { level: 11, monsters: [{ slime_gold_kaiser: 1, weight: 100 }] },
      { level: 12, monsters: [{ slime_gold_kaiser: 2, weight: 100 }] },
      { level: 13, monsters: [{ slime_gold_kaiser: 3, weight: 100 }] },
      { level: 14, monsters: [{ slime_gold_kaiser: 4, weight: 100 }] },
      { level: 15, monsters: [{ slime_gold_kaiser: 5, weight: 100 }] }
    ]
  },
  {
    id: 'ore_mine',
    name: '鉱山',
    description: '多彩な鉱脈と鉱石生命が眠る、深さとともに危険度を増す大鉱山。',
    image: 'assets/dungeon/ore_mine.webp',
    bgImage: 'assets/dungeon/bg_ore_mine.webp',
    theme: { color: '120, 113, 108', icon: 'diamond' },
    unlockCondition: { prism: 1 },

    floors: [
      { level: 1, monsters: [{ copper_slime: 2, weight: 100 }] },
      { level: 2, monsters: [{ tin_mole: 2, weight: 100 }] },
      { level: 3, monsters: [{ iron_beetle: 2, weight: 100 }] },
      { level: 4, monsters: [{ coal_bat: 3, weight: 100 }] },
      { level: 5, monsters: [{ silver_wolf: 2, weight: 100 }] },
      { level: 6, monsters: [{ gold_scorpion: 2, weight: 100 }] },
      { level: 7, monsters: [{ quartz_golem: 2, weight: 100 }] },
      { level: 8, monsters: [{ jade_tortoise: 2, weight: 100 }] },
      { level: 9, monsters: [{ cobalt_drake: 2, weight: 100 }] },
      { level: 10, monsters: [{ mithril_knight: 2, weight: 100 }] },
      { level: 11, monsters: [{ orichalcum_gigas: 1, weight: 100 }] },
      { level: 12, monsters: [{ adamantite_behemoth: 1, weight: 100 }] },
      { level: 13, monsters: [{ uranium_chimera: 1, weight: 100 }] },
      { level: 14, monsters: [{ star_metal_dragon: 1, weight: 100 }] },
      { level: 15, monsters: [{ motherlode_titan: 1, weight: 100 }] }
    ]
  }
];
