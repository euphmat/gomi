import { MEDAL_RANKS } from './medal-definitions.js';

export const MEDAL_POINT_VALUES = Object.freeze({
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 5,
  saint: 6,
  black: 8,
  stela: 10,
});

export function calculateMedalPoints(playerMedals = {}) {
  return Object.values(playerMedals).reduce((total, rankIndex) => {
    const rank = MEDAL_RANKS[Number(rankIndex)];
    return total + (rank ? (MEDAL_POINT_VALUES[rank.id] || 0) : 0);
  }, 0);
}

const armor = (id, name, points, stats, specialEffect, elements = {}, ailments = {}) => ({
  id, name, points, type: 'armor', icon: 'shield', stats, elements, ailments,
  specialEffect: { ...specialEffect, description: specialEffect.description },
});

const MEDAL_SHOP_ARMORS_BY_DUNGEON = {
  slime_forest: armor('medal_slime_sovereign_armor', '虹粘王のぷるぷる鎧', 135,
    { hp: 620, def: 155, mdef: 155, spd: 30 },
    { physicalDamageReductionPercent: 12, description: '物理攻撃で受けるダメージを12%軽減する。' },
    { water: 20, grass: 20 }),
  spider_cave: armor('medal_arachne_queen_dress', '天糸のアラクネドレス', 293,
    { hp: 720, def: 180, mdef: 195, spd: 45 },
    { counterChance: 12, description: '敵から攻撃を受けたとき、12%の確率で通常攻撃による反撃を行う。' },
    { dark: 25 }, { poison: 55 }),
  crystal_cave: armor('medal_genesis_crystal_armor', '創晶鎧ジェネシス', 443,
    { hp: 850, def: 220, mdef: 250, spd: 55 },
    { magicDamageReductionPercent: 15, description: '魔法攻撃で受けるダメージを15%軽減する。' },
    { light: 20, dark: 20 }),
  ghost_castle: armor('medal_phantom_king_mantle', '亡霊王の幽冥外套', 555,
    { hp: 950, mp: 180, def: 230, mdef: 280, spd: 70 },
    { startingBarrierPercent: 15, description: '戦闘開始時、最大HPの15%分の亡霊障壁を展開する。' },
    { dark: 35 }, { curse: 50 }),
  spirit_valley: armor('medal_spirit_symphony_robe', '精霊交響の羽衣', 730,
    { hp: 1000, mp: 260, def: 250, mdef: 300, spd: 105 },
    { statPercent: { spd: 10 }, description: 'SPD+10%。精霊の追い風で行動間隔を短縮する。' },
    { wind: 35, water: 25 }),
  mystic_temple: armor('medal_sanctum_talos_armor', '至聖機装タロス', 840,
    { hp: 1150, def: 330, mdef: 330, spd: 80 },
    { incomingDamageReductionPercent: 12, description: 'すべての被ダメージを12%軽減する。' },
    { light: 40, earth: 30 }),
  stargazer_tower: armor('medal_zodiac_regalia', '黄道十二宮の星衣', 920,
    { hp: 1100, mp: 320, def: 290, mdef: 350, spd: 125 },
    { actionMpRegenPercent: 6, description: '行動後に最大MPの6%を回復する。' },
    { light: 35, dark: 25 }),
  hell_cave: armor('medal_gehenna_overlord_armor', '獄王装ゲヘナ', 1000,
    { hp: 1350, atk: 180, def: 360, mdef: 300, spd: 90 },
    { lowHpDamagePercent: 20, lowHpDamageReductionPercent: 15, description: 'HP50%以下で与ダメージ+20%、被ダメージ-15%。' },
    { fire: 50, dark: 30 }, { burn: 55 }),
  dragon_lair: armor('medal_dragon_god_scale', '竜神鱗の戦鎧', 1080,
    { hp: 1500, atk: 200, def: 390, mdef: 320, spd: 100 },
    { counterChance: 18, description: '敵から攻撃を受けたとき、18%の確率で竜牙の反撃を行う。' },
    { fire: 40, wind: 35 }),
  sky_demon_castle: armor('medal_fallen_seraph_armor', '堕天六翼の魔装', 1160,
    { hp: 1280, mp: 320, def: 330, mdef: 390, spd: 150 },
    { extraActionChance: 15, description: '15%の確率で、選んだ行動をもう一度行う。' },
    { wind: 40, dark: 35 }),
  moonlit_hall: armor('medal_moonlit_ceremony_dress', '月蝕礼装ルナリア', 1240,
    { hp: 1320, mp: 420, def: 340, mdef: 410, spd: 135 },
    { mpCostReductionPercent: 25, description: 'スキルの消費MPを25%軽減する。' },
    { light: 40, dark: 40 }, { sleep: 45, silence: 45 }),
  cloud_altar: armor('medal_cloudsea_divine_robe', '雲海神の天衣', 1320,
    { hp: 1420, mp: 380, def: 370, mdef: 420, spd: 155 },
    { evadeChance: 15, description: '雲海に身を隠し、敵の攻撃を15%の確率で回避する。' },
    { water: 40, wind: 45 }),
  dusk_labyrinth: armor('medal_twilight_maze_armor', '宵闇迷装ノクス', 1400,
    { hp: 1450, mp: 400, def: 400, mdef: 400, spd: 145 },
    { fullHpDamageReductionPercent: 35, description: 'HPが最大のとき、受けるダメージを35%軽減する。' },
    { dark: 55 }),
  eternal_ruins: armor('medal_eternal_guardian_armor', '悠久守護神の聖鎧', 1480,
    { hp: 1650, def: 450, mdef: 450, spd: 120 },
    { statPercent: { hp: 8, def: 8, mdef: 8 }, description: '最大HP・DEF・MDEF+8%。' },
    { earth: 45, light: 45 }),
  subspace: armor('medal_dimensional_phase_armor', '亜空位相装甲', 1560,
    { hp: 1580, mp: 480, def: 430, mdef: 430, spd: 180 },
    { physicalDamageReductionPercent: 20, magicDamageReductionPercent: 20, description: '物理・魔法を問わず、敵の攻撃によるダメージを20%軽減する。' },
    { light: 45, dark: 45 }),
  golden_slime_island: armor('medal_kaiser_gold_armor', '黄金帝カイザーアーマー', 1603,
    { hp: 1750, def: 470, mdef: 470, spd: 165 },
    { goldRewardPercent: 20, incomingDamageReductionPercent: 10, description: '獲得ゴールド+20%、すべての被ダメージを10%軽減する。' },
    { light: 60 }),
  ore_mine: armor('medal_motherlode_genesis_armor', '始原大鉱脈ジェネシス', 1723,
    { hp: 1900, mp: 520, atk: 240, matk: 280, def: 520, mdef: 500, spd: 185 },
    { surviveLethalPercent: 40, incomingDamageReductionPercent: 15, description: '被ダメージ-15%。戦闘中一度、致死ダメージを耐えてHP40%で踏みとどまる。' },
    { earth: 60, light: 40 }),
};

const reward = (dungeonId, dungeonName, theme, maxPoints, accessory, weapon) => ({
  dungeonId,
  dungeonName,
  theme,
  maxPoints,
  rewards: [accessory, MEDAL_SHOP_ARMORS_BY_DUNGEON[dungeonId], weapon],
});

const accessory = (id, name, points, stats, specialEffect, elements = {}, ailments = {}) => ({
  id, name, points, type: 'accessory', icon: 'diamond', stats, elements, ailments,
  specialEffect: { ...specialEffect, description: specialEffect.description },
});

const weapon = (id, name, points, stats, specialEffect, elements = {}, ailments = {}) => ({
  id, name, points, type: 'weapon', icon: 'swords', stats, elements, ailments,
  specialEffect: { ...specialEffect, description: specialEffect.description },
});

// Required points follow the cumulative maximum obtainable from each dungeon:
// the accessory unlocks halfway through that dungeon's contribution and the
// weapon unlocks when every medal from it has reached Stella rank.
export const MEDAL_SHOP_DUNGEON_REWARDS = [
  reward('slime_forest', 'スライムの森', 'emerald', 180,
    accessory('medal_slime_crown', '虹粘王のクラウン', 90,
      { hp: 420, def: 85, mdef: 85, spd: 25 },
      { incomingDamageReductionPercent: 8, actionHpRegenPercent: 4, description: '受けるダメージを8%軽減し、行動後に最大HPの4%を回復する。' },
      { water: 15, grass: 15 }),
    weapon('medal_slime_calibur', 'スライム・カリバー', 180,
      { atk: 260, matk: 180, spd: 70 },
      { outgoingDamagePercent: 15, normalAttackExtraHitChance: 20, description: '与えるダメージ+15%。通常攻撃時、20%で同威力の追撃が発生する。' },
      { water: 25, light: 25 })),

  reward('spider_cave', '蜘蛛の洞窟', 'violet', 330,
    accessory('medal_arachne_choker', '女王蜘蛛のチョーカー', 255,
      { hp: 520, def: 110, mdef: 110, spd: 45 },
      { evadeChance: 8, ailmentImmunities: ['poison'], description: '毒を無効化し、敵の攻撃を8%の確率で回避する。' },
      { dark: 20 }, { poison: 50 }),
    weapon('medal_deathweaver_fang', '天網・デスウィーバー', 330,
      { atk: 330, matk: 230, spd: 95 },
      { afflictedTargetDamagePercent: 25, description: '状態異常中の敵へのダメージ+25%。攻撃時に毒を付与しやすい。' },
      { dark: 35 }, { poison: 35 })),

  reward('crystal_cave', 'クリスタルの洞窟', 'cyan', 480,
    accessory('medal_prismatic_heart', '万晶のプリズムハート', 405,
      { hp: 650, mp: 180, def: 140, mdef: 160, matk: 80 },
      { actionMpRegenPercent: 4, description: '行動後に最大MPの4%を回復し、全属性への耐性を得る。' },
      { fire: 10, water: 10, grass: 10, ice: 10, thunder: 10, wind: 10, earth: 10, light: 10, dark: 10 }),
    weapon('medal_genesis_prism', '創晶剣ジェネシス', 480,
      { atk: 410, matk: 410, spd: 120 },
      { criticalChance: 15, criticalMultiplier: 1.7, description: '15%の確率で、ダメージが1.7倍になる会心が発生する。' },
      { light: 35, dark: 35 })),

  reward('ghost_castle', '亡霊の廃城', 'indigo', 580,
    accessory('medal_requiem_locket', '亡王のレクイエムロケット', 530,
      { hp: 780, mp: 220, def: 165, mdef: 185 },
      { surviveLethalPercent: 25, description: '各戦闘で一度だけ、戦闘不能になるダメージを耐えてHP25%で踏みとどまる。' },
      { dark: 30 }, { curse: 40 }),
    weapon('medal_necro_origin', '冥祖剣ネクロ・オリジン', 580,
      { atk: 470, matk: 390, spd: 135 },
      { lifeStealPercent: 12, description: '与えたダメージの12%をHPとして吸収する。' },
      { dark: 45 })),

  reward('spirit_valley', '精霊の唄う谷', 'teal', 780,
    accessory('medal_echo_harp', '永劫反響の竪琴', 680,
      { hp: 850, mp: 300, matk: 180, mdef: 190, spd: 110 },
      { atbRefundPercent: 15, description: '行動終了後もATBを15%保持し、次の行動が早まる。' },
      { wind: 30, water: 20 }),
    weapon('medal_genesis_hymn', '創世奏剣ヒュムノス', 780,
      { atk: 520, matk: 520, spd: 175 },
      { elementDamagePercent: 22, description: '属性を持つ攻撃のダメージ+22%。' },
      { wind: 40, light: 40 })),

  reward('mystic_temple', '神秘の神殿', 'amber', 860,
    accessory('medal_sanctum_aegis', '至聖のアイギス印', 820,
      { hp: 980, mp: 260, def: 230, mdef: 230, spd: 100 },
      { ailmentImmunities: ['poison', 'burn', 'paralysis', 'sleep', 'confusion', 'curse', 'blind', 'silence'], description: 'すべての状態異常を無効化する。' },
      { light: 35 }),
    weapon('medal_talos_keyblade', '神殿機鍵タロス', 860,
      { atk: 590, matk: 440, spd: 190 },
      { defenseIgnorePercent: 20, description: '敵のDEF・MDEFを20%無視してダメージを与える。' },
      { light: 40, earth: 30 })),

  reward('stargazer_tower', '星詠みの塔', 'blue', 940,
    accessory('medal_astral_clock', '星命の天球時計', 900,
      { hp: 900, mp: 330, matk: 240, mdef: 210, spd: 165 },
      { startingAtb: 500, extraActionChance: 10, description: '戦闘開始時のATBが50%になり、10%で同じ行動をもう一度行う。' },
      { light: 30, dark: 20 }),
    weapon('medal_astraios_scepter', '終天杖アストライオス', 940,
      { atk: 560, matk: 640, spd: 205 },
      { fullHpDamagePercent: 28, description: 'HPが最大のとき、与えるダメージ+28%。' },
      { light: 50 })),

  reward('hell_cave', '地獄の魔洞', 'red', 1020,
    accessory('medal_gehenna_chain', 'ゲヘナの獄鎖', 980,
      { hp: 1150, atk: 170, def: 220, mdef: 180 },
      { lowHpDamageReductionPercent: 30, description: 'HPが50%以下のとき、受けるダメージを30%軽減する。' },
      { fire: 45, dark: 25 }),
    weapon('medal_inferno_judgment', '煉獄断罪インフェルノ', 1020,
      { atk: 690, matk: 500, spd: 205 },
      { lowHpDamagePercent: 38, description: 'HPが50%以下のとき、与えるダメージ+38%。' },
      { fire: 55, dark: 30 }, { burn: 25 })),

  reward('dragon_lair', '竜の巣窟', 'orange', 1100,
    accessory('medal_dragon_emperor_scale', '竜帝の逆鱗', 1060,
      { hp: 1300, atk: 220, def: 250, mdef: 210, spd: 120 },
      { statPercent: { hp: 10, def: 8 }, description: '最大HP+10%、DEF+8%。' },
      { fire: 35, wind: 25 }),
    weapon('medal_bahamut_fang', '竜滅牙バハムート', 1100,
      { atk: 750, matk: 530, spd: 225 },
      { bossDamagePercent: 30, description: '各ダンジョンの最終フロアで与えるダメージ+30%。' },
      { fire: 45, wind: 35 })),

  reward('sky_demon_castle', '天空魔城', 'sky', 1180,
    accessory('medal_celestial_wing', '天魔の六翼', 1140,
      { hp: 1050, mp: 340, matk: 260, mdef: 230, spd: 210 },
      { evadeChance: 12, description: '敵の攻撃を12%の確率で回避する。' },
      { wind: 35, dark: 25 }),
    weapon('medal_sky_tyrant_blade', '天空覇剣ルシフェル', 1180,
      { atk: 760, matk: 620, spd: 245 },
      { extraActionChance: 20, description: '20%の確率で、選んだ行動をもう一度行う。' },
      { wind: 45, dark: 40 })),

  reward('moonlit_hall', '月夜の礼堂', 'fuchsia', 1260,
    accessory('medal_lunar_rosary', '月祈のロザリオ', 1220,
      { hp: 1150, mp: 420, matk: 250, mdef: 270, spd: 190 },
      { actionHpRegenPercent: 6, actionMpRegenPercent: 3, description: '行動後に最大HPの6%と最大MPの3%を回復する。' },
      { light: 35, dark: 35 }),
    weapon('medal_eclipse_liturgy', '月蝕典剣リタージア', 1260,
      { atk: 720, matk: 720, spd: 250 },
      { afflictedTargetDamagePercent: 40, description: '状態異常中の敵へのダメージ+40%。' },
      { light: 45, dark: 45 }, { sleep: 20, silence: 20 })),

  reward('cloud_altar', '雲海に浮かぶ祭壇', 'cyan', 1340,
    accessory('medal_cloudsea_orb', '雲海神の浮遊珠', 1300,
      { hp: 1250, mp: 380, def: 240, mdef: 280, spd: 225 },
      { startingBarrierPercent: 20, description: '戦闘開始時、最大HPの20%分のバリアを展開する。' },
      { water: 35, wind: 35 }),
    weapon('medal_tempest_trident', '蒼穹三叉槍テンペスト', 1340,
      { atk: 810, matk: 650, spd: 265 },
      { elementDamagePercent: 32, description: '属性を持つ攻撃のダメージ+32%。' },
      { water: 50, wind: 50 })),

  reward('dusk_labyrinth', '宵闇の迷宮', 'purple', 1420,
    accessory('medal_twilight_eye', '宵闇を見通す魔眼', 1380,
      { hp: 1200, mp: 420, atk: 190, matk: 290, mdef: 260, spd: 230 },
      { ailmentImmunities: ['blind', 'confusion'], description: '暗闇と混乱を無効化し、闇属性への高い耐性を得る。' },
      { dark: 60 }),
    weapon('medal_maze_eater', '迷界喰らいアビス', 1420,
      { atk: 840, matk: 690, spd: 275 },
      { executeThresholdPercent: 8, description: '攻撃後、HPが8%以下になった敵を即座に撃破する。' },
      { dark: 55 })),

  reward('eternal_ruins', '悠久の神殿跡', 'stone', 1500,
    accessory('medal_eternity_relic', '悠久神の遺物', 1460,
      { hp: 1450, mp: 450, def: 290, mdef: 290, spd: 205 },
      { incomingDamageReductionPercent: 15, description: 'すべての被ダメージを15%軽減する。' },
      { earth: 40, light: 40 }),
    weapon('medal_chronos_edge', '時断剣クロノス', 1500,
      { atk: 870, matk: 710, spd: 300 },
      { criticalChance: 20, criticalMultiplier: 1.8, description: '20%の確率で、ダメージが1.8倍になる会心が発生する。' },
      { earth: 45, light: 45 })),

  reward('subspace', '亜空間', 'pink', 1580,
    accessory('medal_dimensional_core', '次元安定核', 1540,
      { hp: 1400, mp: 520, atk: 230, matk: 310, def: 260, mdef: 260, spd: 260 },
      { startingAtb: 1000, description: '戦闘開始時からATBが最大になり、最初に行動しやすい。' },
      { light: 40, dark: 40 }),
    weapon('medal_void_divider', '虚空断界ヴォイド', 1580,
      { atk: 900, matk: 760, spd: 310 },
      { normalAttackExtraHits: 1, description: '通常攻撃が必ず2連撃になる。' },
      { light: 50, dark: 50 })),

  reward('golden_slime_island', '黄金のスライム島', 'yellow', 1610,
    accessory('medal_kaiser_treasure', '黄金帝の無限金庫', 1595,
      { hp: 1500, mp: 500, def: 280, mdef: 300, spd: 250 },
      { goldRewardPercent: 30, description: '戦闘で獲得するゴールド+30%。' },
      { light: 50 }),
    weapon('medal_golden_kaiser', '皇金剣ゴールデンカイザー', 1610,
      { atk: 920, matk: 740, spd: 315 },
      { outgoingDamagePercent: 25, lifeStealPercent: 8, description: '与えるダメージ+25%、さらに与えたダメージの8%をHPとして吸収する。' },
      { light: 60 })),

  reward('ore_mine', '鉱山', 'slate', 1760,
    accessory('medal_motherlode_crown', '始原大鉱脈の宝冠', 1685,
      { hp: 1650, mp: 560, atk: 280, matk: 340, def: 320, mdef: 320, spd: 280 },
      { extraActionChance: 100, description: '常に2回行動になる。選んだ攻撃やスキルをもう一度行う。' },
      { earth: 55, light: 35 }),
    weapon('medal_starmetal_genesis', '星鉄始原剣ジェネシス', 1760,
      { atk: 980, matk: 820, spd: 340 },
      { defenseIgnorePercent: 25, bossDamagePercent: 35, description: '敵のDEF・MDEFを25%無視し、最終フロアでは与えるダメージ+35%。' },
      { earth: 55, light: 55 })),
];

export const MEDAL_SHOP_REWARDS = MEDAL_SHOP_DUNGEON_REWARDS.flatMap(dungeon =>
  dungeon.rewards.map(item => ({ ...item, dungeonId: dungeon.dungeonId, dungeonName: dungeon.dungeonName }))
);

export const MEDAL_SHOP_WEAPONS = MEDAL_SHOP_REWARDS
  .filter(item => item.type === 'weapon')
  .map(item => ({ ...item, recipe: null }));

export const MEDAL_SHOP_ACCESSORIES = MEDAL_SHOP_REWARDS
  .filter(item => item.type === 'accessory')
  .map(item => ({ ...item, recipe: null }));

export const MEDAL_SHOP_ARMORS = MEDAL_SHOP_REWARDS
  .filter(item => item.type === 'armor')
  .map(item => ({ ...item, recipe: null }));

export function getMedalPointRows() {
  return MEDAL_RANKS.map(rank => ({ ...rank, points: MEDAL_POINT_VALUES[rank.id] || 0 }));
}
