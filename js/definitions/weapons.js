import { ADVANCED_WEAPONS } from './advanced-dungeon-content.js';
import { MEDAL_SHOP_WEAPONS } from './medal-shop-definitions.js';

/**
 * このファイルは武器（右手に装備するアイテム）のデータをまとめたファイルです。
 * 
 * 武器のデータ定義ファイル
 * 
 * テンプレート（各項目は省略可能、省略された値は 0 として扱われます）
 *    stats:         { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
 *    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
 *    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
 */

export const WEAPONS = [
  { id: 'wooden_stick', name: '木の棒', stats: { atk: 1 }, elements: {}, recipe: null },
  // スライムの森
  { id: 'slime_blue_sword'       , name: 'ブルースライムソード'            , stats:                     { atk:   6 }, elements:           { water:  5 }, recipe: { price: 500, materials: [{ id: 'slime_blue_jelly', amount: 25 }, { id: 'slime_blue_core', amount: 5 }] } },
  { id: 'slime_green_sword'      , name: 'グリーンスライムソード'          , stats:                     { atk:  12 }, elements:           { grass: 20 }, recipe: { price: 1000, materials: [{ id: 'slime_green_jelly', amount: 25 }, { id: 'slime_green_core', amount: 5 }] } },
  { id: 'slime_red_sword'        , name: 'レッドスライムソード'            , stats:                     { atk:  18 }, elements:            { fire: 20 }, recipe: { price: 1500, materials: [{ id: 'slime_red_jelly', amount: 25 }, { id: 'slime_red_core', amount: 5 }] } },
  { id: 'slime_water_staff'      , name: 'ウォータースライムスタッフ'      , stats:          { atk:   1, matk:  24 }, elements:           { water: 20 }, recipe: { price: 2000, materials: [{ id: 'slime_water_jelly', amount: 25 }, { id: 'slime_water_core', amount: 5 }] } },
  { id: 'slime_fire_sword'       , name: 'ファイヤースライムソード'        , stats:                     { atk:  30 }, elements:            { fire: 20 }, recipe: { price: 2500, materials: [{ id: 'slime_fire_jelly', amount: 25 }, { id: 'slime_fire_core', amount: 5 }] } },
  { id: 'slime_ice_bow'          , name: 'アイススライムボウ'              , stats:            { atk:  24, spd:  6 }, elements:             { ice: 20 }, recipe: { price: 3000, materials: [{ id: 'slime_ice_jelly', amount: 25 }, { id: 'slime_ice_core', amount: 5 }] } },
  { id: 'slime_wind_sword'       , name: 'ウインドスライムソード'          , stats:                     { atk:  42 }, elements:            { wind: 20 }, recipe: { price: 3500, materials: [{ id: 'slime_wind_jelly', amount: 25 }, { id: 'slime_wind_core', amount: 5 }] } },
  { id: 'slime_thunder_bow'      , name: 'サンダースライムボウ'            , stats:            { atk:  32, spd:  8 }, elements:         { thunder: 20 }, recipe: { price: 4000, materials: [{ id: 'slime_thunder_jelly', amount: 25 }, { id: 'slime_thunder_core', amount: 5 }] } },
  { id: 'slime_flower_bow'       , name: 'フラワースライムボウ'            , stats:            { atk:  36, spd:  9 }, elements:           { grass: 20 }, recipe: { price: 4500, materials: [{ id: 'slime_flower_jelly', amount: 25 }, { id: 'slime_flower_core', amount: 5 }] } },
  { id: 'slime_grass_staff'      , name: 'グラススライムスタッフ'          , stats:          { atk:  20, matk:  60 }, elements:           { grass: 25 }, recipe: { price: 5000, materials: [{ id: 'slime_grass_jelly', amount: 25 }, { id: 'slime_grass_core', amount: 5 }] } },
  { id: 'slime_dark_bow'         , name: 'ダークスライムボウ'              , stats:            { atk:  44, spd: 11 }, elements:            { dark: 25 }, recipe: { price: 5500, materials: [{ id: 'slime_dark_jelly', amount: 25 }, { id: 'slime_dark_core', amount: 5 }] } },
  { id: 'slime_earth_staff'      , name: 'アーススライムスタッフ'          , stats:          { atk:  24, matk:  72 }, elements:           { earth: 20 }, recipe: { price: 6000, materials: [{ id: 'slime_earth_jelly', amount: 25 }, { id: 'slime_earth_core', amount: 5 }] } },
  { id: 'slime_angel_bow'        , name: 'エンジェルスライムボウ'          , stats: { atk:  52, matk:  52, spd: 13 }, elements:           { light: 20 }, recipe: { price: 6500, materials: [{ id: 'slime_angel_jelly', amount: 25 }, { id: 'slime_angel_core', amount: 5 }] } },
  { id: 'slime_king_staff'       , name: 'キングスライムスタッフ'          , stats:          { atk:  28, matk:  84 }, elements: { fire: 15, water: 15 }, recipe: { price: 7000, materials: [{ id: 'slime_king_jelly', amount: 25 }, { id: 'slime_king_core', amount: 5 }] } },
  { id: 'slime_angel_king_staff' , name: 'エンジェルキングスライムスタッフ', stats:          { atk:  30, matk:  90 }, elements: { light: 30, dark: 30 }, recipe: { price: 7500, materials: [{ id: 'slime_angel_king_jelly', amount: 25 }, { id: 'slime_angel_king_core', amount: 5 }] } },
  { id: 'slime_amethyst_wand'    , name: 'アメジストワンド'                , stats: { atk:  25, matk: 110, spd: 10 }, elements: { light: 15, dark: 15 }, recipe: { price: 8000, materials: [{ id: 'slime_amethyst_shard', amount: 20 }, { id: 'slime_amethyst_crystal', amount: 5 }] } },
  { id: 'slime_tiger_eye_claw'   , name: 'タイガークロー'                  , stats:            { atk:  85, spd: 25 }, elements:           { earth: 20 }, recipe: { price: 8500, materials: [{ id: 'slime_tiger_eye_stone', amount: 20 }, { id: 'slime_tiger_eye_fang', amount: 5 }, { id: 'slime_tiger_eye_soul', amount: 1 }] } },
  { id: 'slime_king_devil_scythe', name: 'デビルサイス'                    , stats:          { atk: 120, matk:  60 }, elements:            { dark: 40 }, recipe: { price: 10000, materials: [{ id: 'slime_king_devil_horn', amount: 20 }, { id: 'slime_king_devil_wing', amount: 5 }, { id: 'slime_king_devil_crown', amount: 1 }] } },

  // 黄金のスライム島
  { id: 'gold_slime_whip'       , name: '黄金の鞭'      , stats:   { atk: 120, spd:  5 }, elements: { light: 10 }, recipe: { price: 50000, materials: [{ id: 'mat_gold_slime_drop', amount: 10 }, { id: 'mat_pure_gold_fluid', amount: 5 }] } },
  { id: 'gold_king_scepter'     , name: '黄金王の王笏'  , stats: { atk: 100, matk: 200 }, elements: { light: 30 }, recipe: { price: 200000, materials: [{ id: 'mat_gold_king_jelly', amount: 10 }, { id: 'mat_gold_king_crown_shard', amount: 5 }] } },
  { id: 'kaiser_gold_greatsword', name: '帝王の神聖大剣', stats:   { atk: 200, spd: 10 }, elements: { light: 50 }, recipe: { price: 1000000, materials: [{ id: 'mat_kaiser_gold_crown', amount: 10 }, { id: 'mat_emperor_gold_core', amount: 5 }] } },

  // 蜘蛛の洞窟
  { id: 'spider_cave_sword'     , name: 'ケイブスパイダーソード'        , stats:            { atk:  40, spd:  5 }, elements:  { dark: 10 }, recipe: { price: 8000, materials: [{ id: 'spider_cave_silk', amount: 250 }, { id: 'spider_cave_fang', amount: 50 }] } },
  { id: 'spider_poison_bow'     , name: 'ポイズンスパイダーボウ'        , stats: { atk:  42, matk:  20, spd:  8 }, elements:  { dark: 15 }, recipe: { price: 8500, materials: [{ id: 'spider_poison_silk', amount: 250 }, { id: 'spider_poison_fang', amount: 50 }] } },
  { id: 'spider_trapdoor_staff' , name: 'トラップドアスパイダースタッフ', stats: { atk:  20, matk:  55, spd:  5 }, elements: { earth: 20 }, recipe: { price: 9000, materials: [{ id: 'spider_trapdoor_silk', amount: 250 }, { id: 'spider_trapdoor_fang', amount: 50 }] } },
  { id: 'weaver_web_sword'      , name: 'ウェブウィーバーソード'        , stats:            { atk:  50, spd: 10 }, elements:  { wind: 15 }, recipe: { price: 9500, materials: [{ id: 'weaver_web_silk', amount: 25 }, { id: 'weaver_web_fang', amount: 5 }] } },
  { id: 'spitter_acid_bow'      , name: 'アシッドスピッターボウ'        , stats: { atk:  55, matk:  25, spd:  8 }, elements: { water: 20 }, recipe: { price: 10000, materials: [{ id: 'spitter_acid_silk', amount: 25 }, { id: 'spitter_acid_fang', amount: 5 }] } },
  { id: 'arachnid_shadow_staff' , name: 'シャドウアラクニドスタッフ'    , stats: { atk:  25, matk:  70, spd: 12 }, elements:  { dark: 25 }, recipe: { price: 10500, materials: [{ id: 'arachnid_shadow_silk', amount: 25 }, { id: 'arachnid_shadow_fang', amount: 5 }] } },
  { id: 'tick_blood_sword'      , name: 'ブラッドティックソード'        , stats:            { atk:  65, spd:  8 }, elements: { water: 15 }, recipe: { price: 11000, materials: [{ id: 'tick_blood_silk', amount: 25 }, { id: 'tick_blood_fang', amount: 5 }] } },
  { id: 'crawler_bone_bow'      , name: 'ボーンクロウラーボウ'          , stats: { atk:  70, matk:  30, spd:  6 }, elements: { earth: 25 }, recipe: { price: 11500, materials: [{ id: 'crawler_bone_silk', amount: 25 }, { id: 'crawler_bone_fang', amount: 5 }] } },
  { id: 'swarm_spider_staff'    , name: 'スパイダースウォームスタッフ'  , stats: { atk:  30, matk:  90, spd: 15 }, elements:  { wind: 25 }, recipe: { price: 12000, materials: [{ id: 'swarm_spider_silk', amount: 250 }, { id: 'swarm_spider_fang', amount: 50 }] } },
  { id: 'spider_dark_sword'     , name: 'ダークウィドウソード'          , stats: { atk:  85, matk:  40, spd: 10 }, elements:  { dark: 30 }, recipe: { price: 12500, materials: [{ id: 'spider_dark_silk', amount: 250 }, { id: 'spider_dark_fang', amount: 50 }] } },
  { id: 'weaver_golden_bow'     , name: 'ゴールデンウィーバーボウ'      , stats: { atk:  95, matk:  50, spd: 12 }, elements: { light: 30 }, recipe: { price: 13000, materials: [{ id: 'weaver_golden_silk', amount: 25 }, { id: 'weaver_golden_fang', amount: 5 }] } },
  { id: 'arachnid_crystal_staff', name: 'クリスタルスタッフ'            , stats: { atk:  40, matk: 120, spd: 10 }, elements: { light: 30 }, recipe: { price: 13500, materials: [{ id: 'arachnid_crystal_silk', amount: 25 }, { id: 'arachnid_crystal_fang', amount: 5 }] } },
  { id: 'boss_broodmother_sword', name: 'マザーズファング'              , stats: { atk: 120, matk:  60, spd: 15 }, elements:  { dark: 40 }, recipe: { price: 15000, materials: [{ id: 'boss_broodmother_silk', amount: 250 }, { id: 'boss_broodmother_fang', amount: 50 }] } },
  { id: 'boss_arachne_bow'      , name: 'クイーンズウェブ'              , stats:            { atk: 140, spd: 18 }, elements:  { dark: 40 }, recipe: { price: 16000, materials: [{ id: 'boss_arachne_silk', amount: 25 }, { id: 'boss_arachne_fang', amount: 5 }] } },
  { id: 'boss_deathweaver_staff', name: 'デスサイズ'                    , stats: { atk:  60, matk: 180, spd: 20 }, elements:  { dark: 50 }, recipe: { price: 18000, materials: [{ id: 'boss_deathweaver_silk', amount: 25 }, { id: 'boss_deathweaver_fang', amount: 5 }] } },

  // クリスタルの洞窟
  { id: 'crisp_dagger'      , name: 'クリスプダガー'            , stats:            { atk: 120, spd: 25 }, elements:           { water: 30 }, recipe: { price: 20000, materials: [{ id: 'mat_crisp_shard', amount: 30 }, { id: 'mat_crisp_core', amount: 5 }] } },
  { id: 'geode_hammer'      , name: 'ジオードハンマー'          , stats:            { atk: 180, spd:  5 }, elements:           { earth: 30 }, recipe: { price: 21000, materials: [{ id: 'mat_geode_shell', amount: 30 }, { id: 'mat_geode_heart', amount: 5 }] } },
  { id: 'snow_frog_bow'     , name: '氷精の弓'                  , stats: { atk: 140, matk:  80, spd: 20 }, elements:             { ice: 40 }, recipe: { price: 22000, materials: [{ id: 'mat_snow_crystal', amount: 30 }, { id: 'mat_snow_frog_dust', amount: 10 }] } },
  { id: 'crystalinos_lance' , name: 'クリスタライノスランス'    , stats:            { atk: 160, spd: 20 }, elements:           { earth: 30 }, recipe: { price: 23000, materials: [{ id: 'mat_crystalinos_horn', amount: 30 }, { id: 'mat_crystalinos_soul', amount: 5 }] } },
  { id: 'garnet_sword'      , name: 'ガーネットの剣'            , stats:            { atk: 160, spd: 15 }, elements:            { fire: 40 }, recipe: { price: 24000, materials: [{ id: 'mat_garnet_fang', amount: 20 }, { id: 'mat_garnet_pelt', amount: 15 }] } },
  { id: 'amber_dagger'      , name: '琥珀の短剣'                , stats: { atk: 150, matk:  50, spd: 30 }, elements:           { earth: 30 }, recipe: { price: 25000, materials: [{ id: 'mat_amber_scale', amount: 30 }, { id: 'mat_amber_venom', amount: 10 }] } },
  { id: 'beryl_axe'         , name: 'ベリルアックス'            , stats:            { atk: 200, spd: 10 }, elements:           { light: 30 }, recipe: { price: 26000, materials: [{ id: 'mat_beryl_stone', amount: 30 }, { id: 'mat_beryl_reactor', amount: 5 }] } },
  { id: 'jewel_blade'       , name: '金剛石の刃'                , stats:            { atk: 190, spd: 25 }, elements:           { light: 30 }, recipe: { price: 27000, materials: [{ id: 'mat_jewel_wing', amount: 30 }, { id: 'mat_jewel_blade', amount: 15 }] } },
  { id: 'fluorite_bow'      , name: '幻夢の弓'                  , stats: { atk: 160, matk: 120, spd: 20 }, elements:            { dark: 30 }, recipe: { price: 28000, materials: [{ id: 'mat_fluorite_powder', amount: 40 }, { id: 'mat_fluorite_wing', amount: 15 }] } },
  { id: 'pyrite_spear'      , name: '愚者の槍'                  , stats:            { atk: 220, spd: 10 }, elements:         { thunder: 40 }, recipe: { price: 29000, materials: [{ id: 'mat_pyrite_scale', amount: 30 }, { id: 'mat_pyrite_fang', amount: 15 }] } },
  { id: 'luminous_staff'    , name: '光樹の杖'                  , stats: { atk:  80, matk: 240, spd: 15 }, elements:           { light: 50 }, recipe: { price: 32000, materials: [{ id: 'mat_luminous_leaf', amount: 40 }, { id: 'mat_luminous_sap', amount: 20 }] } },
  { id: 'opal_wand'         , name: '遊色の杖'                  , stats: { atk:  90, matk: 260, spd: 20 }, elements:                      {}, recipe: { price: 35000, materials: [{ id: 'mat_opal_dust', amount: 40 }, { id: 'mat_opal_fragment', amount: 20 }] } },
  { id: 'diamond_greatsword', name: 'ダイヤモンドグレートソード', stats:            { atk: 350, spd:  5 }, elements:           { light: 40 }, recipe: { price: 50000, materials: [{ id: 'mat_diamond_scale', amount: 40 }, { id: 'mat_diamond_claw', amount: 10 }] } },
  { id: 'regalia_sword'     , name: '王権の剣'                  , stats: { atk: 280, matk: 200, spd: 25 }, elements:           { light: 50 }, recipe: { price: 55000, materials: [{ id: 'mat_regalia_shard', amount: 40 }, { id: 'mat_regalia_crown', amount: 10 }] } },
  { id: 'genesis_staff'     , name: 'ジェネシススタッフ'        , stats: { atk: 150, matk: 400, spd: 30 }, elements: { light: 60, dark: 60 }, recipe: { price: 80000, materials: [{ id: 'mat_genesis_fragment', amount: 50 }, { id: 'mat_genesis_core', amount: 10 }] } },

  // 亡霊の廃城
  { id: 'rust_guard_sword'          , name: 'ラストガードソード'    , stats:            { atk: 250, spd:  10 }, elements:  { dark: 10 }, recipe: { price: 52000, materials: [{ id: 'mat_rust_sword', amount: 40 }, { id: 'mat_grudge_soul', amount: 10 }] } },
  { id: 'dust_maid_broom'           , name: 'ダストメイドブルーム'  , stats: { atk: 100, matk: 250, spd:  50 }, elements:  { wind: 20 }, recipe: { price: 51000, materials: [{ id: 'mat_maid_broom', amount: 40 }, { id: 'mat_spider_web', amount: 10 }] } },
  { id: 'cursed_chandelier_flail'   , name: 'カースドフレイル'      , stats:            { atk: 280, spd: -10 }, elements:  { fire: 30 }, recipe: { price: 53000, materials: [{ id: 'mat_heavy_chain', amount: 40 }, { id: 'mat_blue_flame', amount: 10 }] } },
  { id: 'wizard_library_grimoire'   , name: '禁断の魔導書'          , stats: { atk:  50, matk: 300, spd:  15 }, elements:  { dark: 30 }, recipe: { price: 54000, materials: [{ id: 'mat_forbidden_page', amount: 40 }, { id: 'mat_madness_cover', amount: 10 }] } },
  { id: 'hollow_president_cane'     , name: 'プレジデントケイン'    , stats: { atk: 200, matk: 280, spd:  20 }, elements: { earth: 20 }, recipe: { price: 53500, materials: [{ id: 'mat_gold_frame', amount: 40 }, { id: 'mat_hollow_eye', amount: 10 }] } },
  { id: 'shadow_hound_claw'         , name: 'シャドウハウンドクロウ', stats:            { atk: 260, spd:  80 }, elements:  { dark: 20 }, recipe: { price: 54500, materials: [{ id: 'mat_hound_fang', amount: 40 }, { id: 'mat_shadow_fur', amount: 10 }] } },
  { id: 'requiem_rat_fang'          , name: 'レクイエムファング'    , stats:            { atk: 220, spd:  60 }, elements:  { dark: 20 }, recipe: { price: 72500, materials: [{ id: 'mat_rat_tail', amount: 40 }, { id: 'mat_plague_blood', amount: 10 }] } },
  { id: 'glitter_golden_bow'        , name: '黄金の成金弓'          , stats: { atk: 350, matk: 350, spd:  50 }, elements: { light: 30 }, recipe: { price: 90000, materials: [{ id: 'mat_pure_gold', amount: 40 }, { id: 'mat_glitter_gem', amount: 10 }] } },
  { id: 'death_imperator_greatsword', name: 'デスインペレイター'    , stats:            { atk: 400, spd: -20 }, elements:  { dark: 40 }, recipe: { price: 160000, materials: [{ id: 'mat_grudge_greatsword', amount: 50 }, { id: 'mat_broken_crown', amount: 10 }] } },
  { id: 'necro_origin_scythe'       , name: 'ネクロオリジンサイズ'  , stats: { atk: 320, matk: 450, spd:  30 }, elements:  { dark: 50 }, recipe: { price: 185000, materials: [{ id: 'mat_forbidden_grimoire', amount: 50 }, { id: 'mat_origin_core', amount: 10 }] } },

  // 精霊の唄う谷
  { id: 'leaf_vein_dagger'     , name: '葉脈のダガー'        , stats: { atk: 280, spd: 140 }, elements:    { wind: 20 }, recipe: { price: 190000, materials: [{ id: 'mat_humming_leaf_vein', amount: 40 }, { id: 'mat_wind_song_dew', amount: 10 }] } },
  { id: 'firefly_wand'         , name: '蛍火のワンド'        , stats: { atk: 290, spd: 145 }, elements:   { light: 20 }, recipe: { price: 195000, materials: [{ id: 'mat_glow_bug_shell', amount: 40 }, { id: 'mat_resonance_phosphorus', amount: 10 }] } },
  { id: 'pixie_bow'            , name: 'ピクシーボウ'        , stats: { atk: 300, spd: 150 }, elements:    { wind: 20 }, recipe: { price: 200000, materials: [{ id: 'mat_pixie_dust', amount: 40 }, { id: 'mat_breeze_wing', amount: 10 }] } },
  { id: 'mandragora_whip'      , name: '根っこの鞭'          , stats: { atk: 310, spd: 155 }, elements:   { grass: 20 }, recipe: { price: 205000, materials: [{ id: 'mat_singing_root', amount: 40 }, { id: 'mat_mandragora_leaf', amount: 10 }] } },
  { id: 'swallow_rapier'       , name: '燕のレイピア'        , stats: { atk: 320, spd: 160 }, elements:    { wind: 20 }, recipe: { price: 210000, materials: [{ id: 'mat_bell_feather', amount: 40 }, { id: 'mat_swallow_beak', amount: 10 }] } },
  { id: 'cursed_spirit_mace'   , name: '呪霊のメイス'        , stats: { atk: 330, spd: 165 }, elements:    { dark: 20 }, recipe: { price: 215000, materials: [{ id: 'mat_echo_ectoplasm', amount: 40 }, { id: 'mat_wisp_flame', amount: 10 }] } },
  { id: 'dragon_flute_spear'   , name: '竜笛の槍'            , stats: { atk: 340, spd: 170 }, elements:   { earth: 20 }, recipe: { price: 220000, materials: [{ id: 'mat_flute_scale', amount: 40 }, { id: 'mat_lizard_throat', amount: 10 }] } },
  { id: 'melody_baton'         , name: '旋律のタクト'        , stats: { atk: 350, spd: 175 }, elements:    { wind: 20 }, recipe: { price: 225000, materials: [{ id: 'mat_sylph_garment', amount: 40 }, { id: 'mat_melody_orb', amount: 10 }] } },
  { id: 'water_chime_cane'     , name: '水琴のステッキ'      , stats: { atk: 360, spd: 180 }, elements:   { water: 20 }, recipe: { price: 230000, materials: [{ id: 'mat_water_chime_jelly', amount: 40 }, { id: 'mat_echo_water', amount: 10 }] } },
  { id: 'great_tree_battleaxe' , name: '大樹の戦斧'          , stats: { atk: 370, spd: 185 }, elements:   { grass: 20 }, recipe: { price: 235000, materials: [{ id: 'mat_treant_bark', amount: 40 }, { id: 'mat_kodama_branch', amount: 10 }] } },
  { id: 'griffon_claw_blade'   , name: '獅子鷲の爪刃'        , stats: { atk: 380, spd: 190 }, elements:    { wind: 20 }, recipe: { price: 240000, materials: [{ id: 'mat_griffon_feather', amount: 40 }, { id: 'mat_chanting_beak', amount: 10 }] } },
  { id: 'alluring_harp'        , name: '魅惑のハープ'        , stats: { atk: 390, spd: 195 }, elements:   { water: 20 }, recipe: { price: 245000, materials: [{ id: 'mat_siren_scale', amount: 40 }, { id: 'mat_phantom_tear', amount: 10 }] } },
  { id: 'golem_fist'           , name: 'ゴーレムフィスト'    , stats: { atk: 400, spd: 200 }, elements:   { earth: 20 }, recipe: { price: 250000, materials: [{ id: 'mat_resonance_stone', amount: 40 }, { id: 'mat_golem_joint', amount: 10 }] } },
  { id: 'dragon_string_bow'    , name: '竜弦の弓'            , stats: { atk: 410, spd: 205 }, elements:    { wind: 20 }, recipe: { price: 255000, materials: [{ id: 'mat_harp_scale', amount: 40 }, { id: 'mat_gale_fang', amount: 10 }] } },
  { id: 'requiem_staff'        , name: '鎮魂の杖'            , stats: { atk: 420, spd: 210 }, elements:   { water: 20 }, recipe: { price: 260000, materials: [{ id: 'mat_requiem_water', amount: 40 }, { id: 'mat_undine_veil', amount: 10 }] } },
  { id: 'white_deer_horn_sword', name: '白鹿の角剣'          , stats: { atk: 430, spd: 215 }, elements:   { light: 20 }, recipe: { price: 265000, materials: [{ id: 'mat_white_deer_fur', amount: 40 }, { id: 'mat_hymn_antler', amount: 10 }] } },
  { id: 'thunderbird_warhammer', name: '雷鳥の戦槌'          , stats: { atk: 440, spd: 220 }, elements: { thunder: 20 }, recipe: { price: 270000, materials: [{ id: 'mat_storm_feather', amount: 40 }, { id: 'mat_thunder_bird_beak', amount: 10 }] } },
  { id: 'swan_song_blade'      , name: 'スワンソングブレード', stats: { atk: 450, spd: 225 }, elements:    { dark: 20 }, recipe: { price: 275000, materials: [{ id: 'mat_spirit_knight_armor', amount: 40 }, { id: 'mat_swan_song_blade', amount: 10 }] } },
  { id: 'eternal_echo_sword'   , name: '悠久の響剣'          , stats: { atk: 460, spd: 230 }, recipe: { price: 280000, materials: [{ id: 'mat_echo_dragon_scale', amount: 40 }, { id: 'mat_eternal_fang', amount: 10 }] } },
  { id: 'genesis_wand'         , name: 'ジェネシスワンド'    , stats: { atk: 470, spd: 235 }, recipe: { price: 285000, materials: [{ id: 'mat_genesis_song_fragment', amount: 40 }, { id: 'mat_creation_tear', amount: 10 }] } },

  // スペシャルダンジョン: 鉱山
  { id: 'copper_pickaxe', name: '銅鉱のつるはし', stats: { atk: 8, spd: 2 }, elements: { earth: 10 }, recipe: { price: 100, materials: [{ id: 'mat_copper_ore', amount: 40 }, { id: 'mat_cuprite', amount: 10 }] } },
  { id: 'tin_drill_lance', name: '錫鉱ドリルランス', stats: { atk: 25, spd: 8 }, elements: { earth: 10 }, recipe: { price: 500, materials: [{ id: 'mat_tin_ore', amount: 40 }, { id: 'mat_cassiterite', amount: 10 }] } },
  { id: 'iron_beetle_axe', name: '鉄殻の戦斧', stats: { atk: 55, spd: 15 }, elements: { earth: 15 }, recipe: { price: 1800, materials: [{ id: 'mat_iron_ore', amount: 40 }, { id: 'mat_magnetite', amount: 10 }] } },
  { id: 'anthracite_staff', name: '無煙炭の杖', stats: { atk: 45, matk: 80, spd: 20 }, elements: { dark: 15 }, recipe: { price: 5000, materials: [{ id: 'mat_coal_ore', amount: 40 }, { id: 'mat_anthracite', amount: 10 }] } },
  { id: 'argent_fang', name: '輝銀の牙剣', stats: { atk: 120, spd: 45 }, elements: { light: 15 }, recipe: { price: 12000, materials: [{ id: 'mat_silver_ore', amount: 40 }, { id: 'mat_argentite', amount: 10 }] } },
  { id: 'calaverite_stinger', name: '金鉱の蠍槍', stats: { atk: 175, spd: 65 }, elements: { light: 20 }, recipe: { price: 25000, materials: [{ id: 'mat_gold_ore', amount: 40 }, { id: 'mat_calaverite', amount: 10 }] } },
  { id: 'quartz_prism_wand', name: '石英プリズムワンド', stats: { atk: 100, matk: 230, spd: 85 }, elements: { light: 20 }, recipe: { price: 48000, materials: [{ id: 'mat_quartz_ore', amount: 40 }, { id: 'mat_smoky_quartz', amount: 10 }] } },
  { id: 'imperial_jade_hammer', name: '帝翡翠の大槌', stats: { atk: 285, spd: 95 }, elements: { grass: 20 }, recipe: { price: 80000, materials: [{ id: 'mat_jade_ore', amount: 40 }, { id: 'mat_nephrite', amount: 10 }] } },
  { id: 'cobalt_drake_saber', name: '蒼鉱竜の曲剣', stats: { atk: 330, matk: 180, spd: 120 }, elements: { water: 20 }, recipe: { price: 120000, materials: [{ id: 'mat_cobalt_ore', amount: 40 }, { id: 'mat_cobaltite', amount: 10 }] } },
  { id: 'true_mithril_blade', name: '真ミスリルブレード', stats: { atk: 390, matk: 230, spd: 155 }, elements: { light: 20 }, recipe: { price: 165000, materials: [{ id: 'mat_mithril_ore', amount: 40 }, { id: 'mat_mithril_ingot', amount: 10 }] } },
  { id: 'orichalcum_knuckle', name: '神鋼鉱拳', stats: { atk: 435, spd: 180 }, elements: { earth: 20 }, recipe: { price: 210000, materials: [{ id: 'mat_orichalcum_ore', amount: 40 }, { id: 'mat_orichalcum_ingot', amount: 10 }] } },
  { id: 'adamantite_breaker', name: '金剛不壊ブレイカー', stats: { atk: 470, spd: 195 }, elements: { earth: 20 }, recipe: { price: 250000, materials: [{ id: 'mat_adamantite_ore', amount: 40 }, { id: 'mat_adamantite_plate', amount: 10 }] } },
  { id: 'radiant_uranium_cannon', name: '輝放鉱キャノン', stats: { atk: 360, matk: 490, spd: 210 }, elements: { thunder: 20 }, recipe: { price: 280000, materials: [{ id: 'mat_uranium_ore', amount: 40 }, { id: 'mat_pitchblende', amount: 10 }] } },
  { id: 'star_metal_dragonslayer', name: '星鉄の竜断剣', stats: { atk: 510, matk: 300, spd: 240 }, elements: { light: 20 }, recipe: { price: 305000, materials: [{ id: 'mat_star_metal_ore', amount: 40 }, { id: 'mat_meteoric_iron', amount: 10 }] } },
  { id: 'motherlode_gaia_axe', name: '大鉱脈ガイアアックス', stats: { atk: 525, matk: 350, spd: 260 }, elements: { earth: 25 }, recipe: { price: 315000, materials: [{ id: 'mat_motherlode_ore', amount: 40 }, { id: 'mat_rainbow_ore', amount: 10 }] } },

  // 神秘の神殿
  { id: 'aether_blade'         , name: 'エーテルブレード'    , stats: { atk: 480, spd: 240 }, elements:   { light: 20 }, recipe: { price: 290000, materials: [{ id: 'mat_aether_ore', amount: 40 }, { id: 'mat_translucent_marble', amount: 10 }] } },
  { id: 'aegis_mace'           , name: 'アイギスメイス'      , stats: { atk: 485, spd: 242 }, elements:   { earth: 20 }, recipe: { price: 292500, materials: [{ id: 'mat_mossy_stone', amount: 40 }, { id: 'mat_monolith_fragment', amount: 10 }] } },
  { id: 'rune_staff'           , name: 'ルーンスタッフ'      , stats: { atk: 490, spd: 245 }, elements:    { fire: 20 }, recipe: { price: 295000, materials: [{ id: 'mat_glowing_rune_stone', amount: 40 }, { id: 'mat_ancient_priest_scroll', amount: 10 }] } },
  { id: 'xenolith_dagger'      , name: 'ゼノリスダガー'      , stats: { atk: 500, spd: 250 }, elements:    { dark: 20 }, recipe: { price: 300000, materials: [{ id: 'mat_obsidian_shard', amount: 40 }, { id: 'mat_xenolith_meteorite', amount: 10 }] } },
  { id: 'basilica_hammer'      , name: 'バシリカハンマー'    , stats: { atk: 510, spd: 255 }, elements:   { earth: 20 }, recipe: { price: 305000, materials: [{ id: 'mat_temple_pillar_fragment', amount: 40 }, { id: 'mat_basilica_foundation', amount: 10 }] } },
  { id: 'crystallos_wand'      , name: 'クリスタロスワンド'  , stats: { atk: 515, spd: 257 }, elements:   { light: 20 }, recipe: { price: 307500, materials: [{ id: 'mat_temple_crystal', amount: 40 }, { id: 'mat_magic_reflect_prism', amount: 10 }] } },
  { id: 'machina_bow'          , name: 'マキナボウ'          , stats: { atk: 520, spd: 260 }, elements:   { earth: 20 }, recipe: { price: 310000, materials: [{ id: 'mat_machina_gear', amount: 40 }, { id: 'mat_four_armed_joint', amount: 10 }] } },
  { id: 'sanctum_spear'        , name: 'サンクトゥムスピア'  , stats: { atk: 530, spd: 265 }, elements:   { light: 20 }, recipe: { price: 315000, materials: [{ id: 'mat_sacred_bronze', amount: 40 }, { id: 'mat_talos_armor_plate', amount: 10 }] } },

  ...ADVANCED_WEAPONS,
  ...MEDAL_SHOP_WEAPONS,

].map(item => ({ ...item, slot: 'rightHand', image: `./assets/weapon/${item.id}.webp` }));
