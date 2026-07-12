export const FISHING_SPOTS = [
  {
    id: 'moonlit_lake',
    name: '月影の湖',
    description: '森の奥にある静かな湖。淡水魚から幻想魚まで、さまざまな魚が棲んでいる。',
    background: 'assets/dungeon/bg_fishing_spot.webp',
    baitCost: 500,
    minCatchMs: 3000,
    maxCatchMs: 7000,
  },
];

// weight は魚が当選した後の相対抽選率。上位魚ほど牧場EXPと魚油量が多い。
// 魚餌は1個で仲間全員にEXPが入るため、通常素材より明確に高い基礎値にする。
const FISH_ROWS = [
  ['medaka', 'メダカ', 'common', 1800, 100, 1],
  ['crucian_carp', 'フナ', 'common', 1500, 200, 1],
  ['sardine', 'イワシ', 'common', 1450, 200, 1],
  ['goby', 'ハゼ', 'common', 1300, 300, 1],
  ['smelt', 'ワカサギ', 'common', 1200, 300, 1],
  ['mackerel', 'サバ', 'uncommon', 900, 500, 2],
  ['horse_mackerel', 'アジ', 'uncommon', 850, 500, 2],
  ['sweetfish', 'アユ', 'uncommon', 700, 700, 2],
  ['rainbow_trout', 'ニジマス', 'uncommon', 600, 800, 2],
  ['carp', 'コイ', 'uncommon', 550, 1000, 3],
  ['catfish', 'ナマズ', 'rare', 400, 1300, 3],
  ['eel', 'ウナギ', 'rare', 340, 1500, 4],
  ['salmon', 'サケ', 'rare', 300, 1800, 4],
  ['sea_bream', 'タイ', 'rare', 250, 2200, 5],
  ['pufferfish', 'フグ', 'rare', 200, 2500, 5],
  ['anglerfish', 'アンコウ', 'epic', 130, 3500, 7],
  ['arapaima', 'ピラルク', 'epic', 120, 3800, 8],
  ['tuna', 'マグロ', 'epic', 100, 4500, 9],
  ['alligator_gar', 'アリゲーターガー', 'epic', 90, 5200, 10],
  ['marlin', 'カジキ', 'epic', 75, 6000, 12],
  ['giant_stingray', '巨大淡水エイ', 'epic', 65, 6800, 14],
  ['coelacanth', 'シーラカンス', 'epic', 50, 8000, 16],
  ['goblin_shark', 'ミツクリザメ', 'epic', 42, 9000, 18],
  ['nautilus', 'オウムガイ', 'epic', 36, 10000, 20],
  ['oarfish', 'リュウグウノツカイ', 'legendary', 30, 11000, 22],
  ['megamouth_shark', 'メガマウスザメ', 'legendary', 27, 13000, 26],
  ['giant_squid', 'ダイオウイカ', 'legendary', 22, 14500, 29],
  ['golden_carp', '黄金鯉', 'legendary', 18, 16000, 32],
  ['phantom_jellyfish', '幻影クラゲ', 'legendary', 15, 19000, 38],
  ['crystal_fish', 'クリスタルフィッシュ', 'legendary', 12, 22000, 44],
  ['thunder_ray', '雷鳴エイ', 'legendary', 9, 26000, 52],
  ['sun_carp', '太陽鯉', 'legendary', 5, 30000, 60],
  ['moonlight_koi', '月光錦鯉', 'mythic', 7, 32000, 64],
  ['starry_whale', '星海鯨', 'mythic', 6, 38000, 76],
  ['abyss_whale', '深淵鯨', 'mythic', 3, 50000, 100],
  ['leviathan', 'リヴァイアサン', 'mythic', 2.5, 65000, 130],
  ['void_angler', '虚空アンコウ', 'mythic', 1.5, 80000, 160],
  ['prism_fish', 'プリズムフィッシュ', 'mythic', 1, 100000, 200],
  ['time_dragonfish', '時渡り龍魚', 'mythic', 0.5, 140000, 280],
  ['genesis_fish', '創世魚', 'mythic', 0.1, 250000, 500],
];

export const FISH = FISH_ROWS.map(([id, name, rarity, weight, ranchExp, oilYield]) => ({
  id,
  name,
  rarity,
  weight,
  ranchExp,
  oilYield,
  image: `assets/fish/${id}.webp`,
}));

export const FISH_RARITY = {
  common: { label: 'コモン', text: 'text-slate-200', border: 'border-slate-500/50' },
  uncommon: { label: 'アンコモン', text: 'text-emerald-300', border: 'border-emerald-500/50' },
  rare: { label: 'レア', text: 'text-sky-300', border: 'border-sky-500/50' },
  epic: { label: 'エピック', text: 'text-violet-300', border: 'border-violet-500/50' },
  legendary: { label: 'レジェンド', text: 'text-amber-300', border: 'border-amber-500/50' },
  mythic: { label: 'ミシック', text: 'text-fuchsia-300', border: 'border-fuchsia-500/50' },
};

// 魚油1個につき、選択した鉱山の採掘速度を1分間だけ2倍にする。
export const FISH_OIL_BOOST_MS = 60 * 1000;
export const FISH_OIL_SPEED_MULTIPLIER = 2;
