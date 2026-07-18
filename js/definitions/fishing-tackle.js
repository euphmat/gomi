export const FISHING_TACKLE_MIN_LEVEL = 1;
export const FISHING_TACKLE_MAX_LEVEL = 15;

export const FISHING_TACKLE_RARITIES = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
];

export const FISHING_TACKLE = {
  rod: {
    id: 'fishing_rod',
    name: '強化釣竿',
    shortName: '釣竿',
    levelKey: 'rodLevel',
    icon: 'phishing',
    accent: 'cyan',
    description: '釣り上げるまでの待ち時間を短縮する。',
  },
  bait: {
    id: 'fishing_bait',
    name: '上質な釣り餌',
    shortName: 'エサ',
    levelKey: 'baitLevel',
    icon: 'nutrition',
    accent: 'emerald',
    description: '高レアリティの魚を引き寄せやすくする。',
  },
  lure: {
    id: 'fishing_lure',
    name: '集魚ルアー',
    shortName: 'ルアー',
    levelKey: 'lureLevel',
    icon: 'waves',
    accent: 'violet',
    description: '一度に最大3匹の魚が釣れる可能性を高める。',
  },
};

export const FISHING_TACKLE_ORDER = ['rod', 'bait', 'lure'];

const makeTackleLevel = (type, level, name) => ({
  level,
  id: `${FISHING_TACKLE[type].id}_lv${level}`,
  name,
  image: `assets/fishing/${FISHING_TACKLE[type].id}_lv${level}.webp`,
});

export const FISHING_TACKLE_LEVELS = {
  rod: [
    makeTackleLevel('rod', 1, '初心者の釣竿'),
    makeTackleLevel('rod', 2, '丈夫な釣竿'),
    makeTackleLevel('rod', 3, '鋼糸の釣竿'),
    makeTackleLevel('rod', 4, '月影の釣竿'),
    makeTackleLevel('rod', 5, '星銀の釣竿'),
    makeTackleLevel('rod', 6, '星導の釣竿'),
    makeTackleLevel('rod', 7, '天穹の釣竿'),
    makeTackleLevel('rod', 8, '深淵の釣竿'),
    makeTackleLevel('rod', 9, '海神の釣竿'),
    makeTackleLevel('rod', 10, '創世の神釣竿'),
    makeTackleLevel('rod', 11, '星界の神釣竿'),
    makeTackleLevel('rod', 12, '時空の神釣竿'),
    makeTackleLevel('rod', 13, '虚無の神釣竿'),
    makeTackleLevel('rod', 14, '原初の神釣竿'),
    makeTackleLevel('rod', 15, '永劫の神釣竿'),
  ],
  bait: [
    makeTackleLevel('bait', 1, '上質な練り餌'),
    makeTackleLevel('bait', 2, '香り高い練り餌'),
    makeTackleLevel('bait', 3, '魔力を帯びた練り餌'),
    makeTackleLevel('bait', 4, '月光の釣り餌'),
    makeTackleLevel('bait', 5, '星屑の釣り餌'),
    makeTackleLevel('bait', 6, '星霊の釣り餌'),
    makeTackleLevel('bait', 7, '天界の釣り餌'),
    makeTackleLevel('bait', 8, '深淵の釣り餌'),
    makeTackleLevel('bait', 9, '海神の釣り餌'),
    makeTackleLevel('bait', 10, '創世の神餌'),
    makeTackleLevel('bait', 11, '星界の神餌'),
    makeTackleLevel('bait', 12, '時空の神餌'),
    makeTackleLevel('bait', 13, '虚無の神餌'),
    makeTackleLevel('bait', 14, '原初の神餌'),
    makeTackleLevel('bait', 15, '永劫の神餌'),
  ],
  lure: [
    makeTackleLevel('lure', 1, '銅の集魚ルアー'),
    makeTackleLevel('lure', 2, '銀の集魚ルアー'),
    makeTackleLevel('lure', 3, '魔晶の集魚ルアー'),
    makeTackleLevel('lure', 4, '月影のルアー'),
    makeTackleLevel('lure', 5, '星銀のルアー'),
    makeTackleLevel('lure', 6, '星導のルアー'),
    makeTackleLevel('lure', 7, '天穹のルアー'),
    makeTackleLevel('lure', 8, '深淵のルアー'),
    makeTackleLevel('lure', 9, '海神のルアー'),
    makeTackleLevel('lure', 10, '創世の神ルアー'),
    makeTackleLevel('lure', 11, '星界の神ルアー'),
    makeTackleLevel('lure', 12, '時空の神ルアー'),
    makeTackleLevel('lure', 13, '虚無の神ルアー'),
    makeTackleLevel('lure', 14, '原初の神ルアー'),
    makeTackleLevel('lure', 15, '永劫の神ルアー'),
  ],
};

// 高難度交換として、基準値の約10倍に設定した1つの釣具を1段階強化するための必要数。
// Lv.1は初期装備。Lv.2〜4は月影、Lv.5〜7は星幽、Lv.8〜15は深淵の魚だけを納品できる。
export const FISHING_TACKLE_RECIPES = [
  { level: 2, spotId: 'moonlit_lake', requirements: { common: 800, uncommon: 300, rare: 100, epic: 20 } },
  { level: 3, spotId: 'moonlit_lake', requirements: { common: 1600, uncommon: 600, rare: 200, epic: 50 } },
  { level: 4, spotId: 'moonlit_lake', requirements: { common: 3000, uncommon: 1200, rare: 400, epic: 150, legendary: 10 } },
  { level: 5, spotId: 'astral_lake', requirements: { common: 6000, uncommon: 2500, rare: 800, epic: 300, legendary: 30 } },
  { level: 6, spotId: 'astral_lake', requirements: { common: 10000, uncommon: 4500, rare: 1500, epic: 600, legendary: 70 } },
  { level: 7, spotId: 'astral_lake', requirements: { common: 16000, uncommon: 7000, rare: 2500, epic: 1000, legendary: 150, mythic: 10 } },
  { level: 8, spotId: 'abyssal_sea', requirements: { common: 24000, uncommon: 10000, rare: 4000, epic: 1500, legendary: 250, mythic: 10 } },
  { level: 9, spotId: 'abyssal_sea', requirements: { common: 36000, uncommon: 16000, rare: 6000, epic: 2500, legendary: 450, mythic: 30 } },
  { level: 10, spotId: 'abyssal_sea', requirements: { common: 60000, uncommon: 27000, rare: 10000, epic: 4000, legendary: 800, mythic: 50 } },
  { level: 11, spotId: 'abyssal_sea', requirements: { common: 90000, uncommon: 40000, rare: 15000, epic: 6000, legendary: 1200, mythic: 75 } },
  { level: 12, spotId: 'abyssal_sea', requirements: { common: 135000, uncommon: 60000, rare: 22500, epic: 9000, legendary: 1800, mythic: 110 } },
  { level: 13, spotId: 'abyssal_sea', requirements: { common: 200000, uncommon: 90000, rare: 34000, epic: 13500, legendary: 2700, mythic: 165 } },
  { level: 14, spotId: 'abyssal_sea', requirements: { common: 300000, uncommon: 135000, rare: 50000, epic: 20000, legendary: 4000, mythic: 250 } },
  { level: 15, spotId: 'abyssal_sea', requirements: { common: 450000, uncommon: 200000, rare: 75000, epic: 30000, legendary: 6000, mythic: 400 } },
];

export const FISHING_ROD_SPEED_PER_LEVEL = 0.04;
export const FISHING_BAIT_WEIGHT_PER_LEVEL = 0.03;
export const FISHING_LURE_CHANCE_PER_LEVEL = 0.02;
export const FISHING_LURE_MAX_CATCH = 3;

export function getFishingTackleEffect(type, level) {
  const normalizedLevel = Math.max(FISHING_TACKLE_MIN_LEVEL, Math.min(FISHING_TACKLE_MAX_LEVEL, Math.floor(Number(level) || FISHING_TACKLE_MIN_LEVEL)));
  if (type === 'rod') return `待ち時間 -${normalizedLevel * 4}%`;
  if (type === 'bait') return `高レア補正 最大 +${normalizedLevel * 15}%`;
  if (type === 'lure') return `同時釣り ${normalizedLevel * 2}%`;
  return '';
}

export function getFishingTackleRecipe(level) {
  return FISHING_TACKLE_RECIPES.find(recipe => recipe.level === level) || null;
}

export function getFishingTackleVisual(type, level) {
  const normalizedLevel = Math.max(FISHING_TACKLE_MIN_LEVEL, Math.min(FISHING_TACKLE_MAX_LEVEL, Math.floor(Number(level) || FISHING_TACKLE_MIN_LEVEL)));
  return FISHING_TACKLE_LEVELS[type]?.find(entry => entry.level === normalizedLevel) || null;
}
