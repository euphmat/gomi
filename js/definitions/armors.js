/**
 * このファイルは鎧（体防具）のデータをまとめたファイルです。
 * 
 * 鎧（体防具）のデータ定義ファイル
 * 
 * 体に装備して防御力を高めるアイテムです。
 * 
 * テンプレート（各項目は省略可能、省略された値は 0 として扱われます）
 *    stats:         { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
 *    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
 *    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
 */

export const ARMORS = [
  // スライムの森
  { id: 'cloth_armor'           , name: '布の服'                          , stats:          { def:  2, mdef:  1 }, elements:                      {} },
  { id: 'slime_blue_armor'      , name: 'ブルースライムアーマー'          , stats:          { def:  4, mdef:  2 }, elements:           { water:  5 }, recipe: { price: 500, materials: [{ id: 'slime_blue_core', amount: 25 }, { id: 'slime_blue_fluid', amount: 5 }] } },
  { id: 'slime_green_armor'     , name: 'グリーンスライムアーマー'        , stats:          { def:  5, mdef:  7 }, elements:           { grass: 20 }, recipe: { price: 1000, materials: [{ id: 'slime_green_core', amount: 25 }, { id: 'slime_green_fluid', amount: 5 }] } },
  { id: 'slime_red_armor'       , name: 'レッドスライムアーマー'          , stats:          { def: 10, mdef:  8 }, elements:            { fire: 20 }, recipe: { price: 1500, materials: [{ id: 'slime_red_core', amount: 25 }, { id: 'slime_red_fluid', amount: 5 }] } },
  { id: 'slime_water_armor'     , name: 'ウォータースライムアーマー'      , stats:          { def: 11, mdef: 13 }, elements:           { water: 20 }, recipe: { price: 2000, materials: [{ id: 'slime_water_core', amount: 25 }, { id: 'slime_water_fluid', amount: 5 }] } },
  { id: 'slime_fire_armor'      , name: 'ファイヤースライムアーマー'      , stats:          { def: 16, mdef: 14 }, elements:            { fire: 20 }, recipe: { price: 2500, materials: [{ id: 'slime_fire_core', amount: 25 }, { id: 'slime_fire_fluid', amount: 5 }] } },
  { id: 'slime_ice_armor'       , name: 'アイススライムアーマー'          , stats:          { def: 17, mdef: 19 }, elements:             { ice: 20 }, recipe: { price: 3000, materials: [{ id: 'slime_ice_core', amount: 25 }, { id: 'slime_ice_fluid', amount: 5 }] } },
  { id: 'slime_wind_armor'      , name: 'ウインドスライムアーマー'        , stats:          { def: 22, mdef: 20 }, elements:            { wind: 20 }, recipe: { price: 3500, materials: [{ id: 'slime_wind_core', amount: 25 }, { id: 'slime_wind_fluid', amount: 5 }] } },
  { id: 'slime_thunder_armor'   , name: 'サンダースライムアーマー'        , stats:          { def: 23, mdef: 25 }, elements:         { thunder: 20 }, recipe: { price: 4000, materials: [{ id: 'slime_thunder_core', amount: 25 }, { id: 'slime_thunder_fluid', amount: 5 }] } },
  { id: 'slime_flower_armor'    , name: 'フラワースライムアーマー'        , stats:          { def: 28, mdef: 26 }, elements:           { grass: 20 }, recipe: { price: 4500, materials: [{ id: 'slime_flower_core', amount: 25 }, { id: 'slime_flower_fluid', amount: 5 }] } },
  { id: 'slime_grass_armor'     , name: 'グラススライムアーマー'          , stats:          { def: 29, mdef: 31 }, elements:           { grass: 25 }, recipe: { price: 5000, materials: [{ id: 'slime_grass_core', amount: 25 }, { id: 'slime_grass_fluid', amount: 5 }] } },
  { id: 'slime_dark_armor'      , name: 'ダークスライムアーマー'          , stats:          { def: 34, mdef: 32 }, elements:            { dark: 25 }, recipe: { price: 5500, materials: [{ id: 'slime_dark_core', amount: 25 }, { id: 'slime_dark_fluid', amount: 5 }] } },
  { id: 'slime_earth_armor'     , name: 'アーススライムアーマー'          , stats:          { def: 35, mdef: 37 }, elements:           { earth: 20 }, recipe: { price: 6000, materials: [{ id: 'slime_earth_core', amount: 25 }, { id: 'slime_earth_fluid', amount: 5 }] } },
  { id: 'slime_angel_armor'     , name: 'エンジェルスライムアーマー'      , stats:          { def: 40, mdef: 38 }, elements:           { light: 20 }, recipe: { price: 6500, materials: [{ id: 'slime_angel_core', amount: 25 }, { id: 'slime_angel_fluid', amount: 5 }] } },
  { id: 'slime_king_armor'      , name: 'キングスライムアーマー'          , stats:          { def: 41, mdef: 43 }, elements: { fire: 15, water: 15 }, recipe: { price: 7000, materials: [{ id: 'slime_king_core', amount: 25 }, { id: 'slime_king_fluid', amount: 5 }] } },
  { id: 'slime_angel_king_armor', name: 'エンジェルキングスライムアーマー', stats:          { def: 46, mdef: 44 }, elements: { light: 30, dark: 30 }, recipe: { price: 7500, materials: [{ id: 'slime_angel_king_core', amount: 25 }, { id: 'slime_angel_king_fluid', amount: 5 }] } },
  { id: 'slime_amethyst_robe'   , name: '紫光のローブ'                    , stats:          { def: 50, mdef: 80 }, elements: { light: 15, dark: 15 }, recipe: { price: 8000, materials: [{ id: 'slime_amethyst_crystal', amount: 20 }, { id: 'slime_amethyst_heart', amount: 5 }] } },
  { id: 'slime_tiger_eye_armor' , name: '虎目石の軽鎧'                    , stats: { def: 75, mdef: 60, spd: 15 }, elements:           { earth: 15 }, recipe: { price: 8500, materials: [{ id: 'slime_tiger_eye_stone', amount: 20 }, { id: 'slime_tiger_eye_fang', amount: 5 }] } },
  { id: 'slime_king_devil_cloak', name: 'デビルクローク'                  , stats:          { def: 90, mdef: 90 }, elements:            { dark: 30 }, recipe: { price: 10000, materials: [{ id: 'slime_king_devil_horn', amount: 20 }, { id: 'slime_king_devil_wing', amount: 5 }] } },

  // 黄金のスライム島
  { id: 'gold_slime_robe' , name: '黄金の法衣'  , stats: { def:  50, mdef: 100 }, elements: { light: 10 }, recipe: { price: 100000, materials: [{ id: 'mat_gold_slime_drop', amount: 10 }, { id: 'mat_pure_gold_fluid', amount: 5 }] } },
  { id: 'gold_king_armor' , name: '黄金王の鎧'  , stats: { def:  80, mdef: 100 }, elements: { light: 30 }, recipe: { price: 500000, materials: [{ id: 'mat_gold_king_jelly', amount: 10 }, { id: 'mat_gold_king_crown_shard', amount: 5 }] } },
  { id: 'kaiser_gold_mail', name: '帝王の神聖鎧', stats: { def: 100, mdef: 100 }, elements: { light: 50 }, recipe: { price: 1000000, materials: [{ id: 'mat_kaiser_gold_crown', amount: 10 }, { id: 'mat_emperor_gold_core', amount: 5 }] } },

  // 蜘蛛の洞窟
  { id: 'spider_cave_armor'     , name: 'ケイブスパイダーアーマー'      , stats: { def:  52, mdef:  50 }, recipe: { price: 8000, materials: [{ id: 'spider_cave_fang', amount: 250 }, { id: 'spider_cave_venom', amount: 50 }] } },
  { id: 'spider_poison_armor'   , name: 'ポイズンスパイダーアーマー'    , stats: { def:  58, mdef:  55 }, recipe: { price: 8500, materials: [{ id: 'spider_poison_fang', amount: 250 }, { id: 'spider_poison_venom', amount: 50 }] } },
  { id: 'spider_trapdoor_armor' , name: 'トラップドアスパイダーアーマー', stats: { def:  64, mdef:  60 }, recipe: { price: 9000, materials: [{ id: 'spider_trapdoor_fang', amount: 250 }, { id: 'spider_trapdoor_venom', amount: 50 }] } },
  { id: 'weaver_web_armor'      , name: 'ウェブウィーバーアーマー'      , stats: { def:  70, mdef:  66 }, recipe: { price: 9500, materials: [{ id: 'weaver_web_fang', amount: 25 }, { id: 'weaver_web_venom', amount: 5 }] } },
  { id: 'spitter_acid_armor'    , name: 'アシッドスピッターアーマー'    , stats: { def:  76, mdef:  72 }, recipe: { price: 10000, materials: [{ id: 'spitter_acid_fang', amount: 25 }, { id: 'spitter_acid_venom', amount: 5 }] } },
  { id: 'arachnid_shadow_armor' , name: 'シャドウアラクニドアーマー'    , stats: { def:  82, mdef:  78 }, recipe: { price: 10500, materials: [{ id: 'arachnid_shadow_fang', amount: 25 }, { id: 'arachnid_shadow_venom', amount: 5 }] } },
  { id: 'tick_blood_armor'      , name: 'ブラッドティックアーマー'      , stats: { def:  88, mdef:  84 }, recipe: { price: 11000, materials: [{ id: 'tick_blood_fang', amount: 25 }, { id: 'tick_blood_venom', amount: 5 }] } },
  { id: 'crawler_bone_armor'    , name: 'ボーンクロウラーアーマー'      , stats: { def:  94, mdef:  90 }, recipe: { price: 11500, materials: [{ id: 'crawler_bone_fang', amount: 25 }, { id: 'crawler_bone_venom', amount: 5 }] } },
  { id: 'swarm_spider_armor'    , name: 'スパイダースウォームアーマー'  , stats: { def: 100, mdef:  96 }, recipe: { price: 12000, materials: [{ id: 'swarm_spider_fang', amount: 250 }, { id: 'swarm_spider_venom', amount: 50 }] } },
  { id: 'spider_dark_armor'     , name: 'ダークウィドウアーマー'        , stats: { def: 106, mdef: 102 }, recipe: { price: 12500, materials: [{ id: 'spider_dark_fang', amount: 250 }, { id: 'spider_dark_venom', amount: 50 }] } },
  { id: 'weaver_golden_armor'   , name: 'ゴールデンウィーバーアーマー'  , stats: { def: 112, mdef: 108 }, recipe: { price: 13000, materials: [{ id: 'weaver_golden_fang', amount: 25 }, { id: 'weaver_golden_venom', amount: 5 }] } },
  { id: 'arachnid_crystal_armor', name: 'クリスタルアラクニドアーマー'  , stats: { def: 118, mdef: 114 }, recipe: { price: 13500, materials: [{ id: 'arachnid_crystal_fang', amount: 25 }, { id: 'arachnid_crystal_venom', amount: 5 }] } },
  { id: 'boss_broodmother_armor', name: 'ブルードマザーアーマー'        , stats: { def: 130, mdef: 125 }, recipe: { price: 15000, materials: [{ id: 'boss_broodmother_fang', amount: 250 }, { id: 'boss_broodmother_venom', amount: 50 }] } },
  { id: 'boss_arachne_armor'    , name: 'アラクネ・クイーンアーマー'    , stats: { def: 140, mdef: 135 }, recipe: { price: 16000, materials: [{ id: 'boss_arachne_fang', amount: 25 }, { id: 'boss_arachne_venom', amount: 5 }] } },
  { id: 'boss_deathweaver_armor', name: 'デスウィーバーアーマー'        , stats: { def: 150, mdef: 145 }, recipe: { price: 18000, materials: [{ id: 'boss_deathweaver_fang', amount: 25 }, { id: 'boss_deathweaver_venom', amount: 5 }] } },

  // クリスタルの洞窟
  { id: 'crisp_armor'     , name: 'クリスプアーマー'      , stats:           { def: 110, mdef: 110 }, recipe: { price: 20000, materials: [{ id: 'mat_crisp_shard', amount: 30 }, { id: 'mat_crisp_core', amount: 5 }] } },
  { id: 'geode_armor'     , name: 'ジオードアーマー'      , stats:           { def: 160, mdef: 120 }, recipe: { price: 21000, materials: [{ id: 'mat_geode_shell', amount: 30 }, { id: 'mat_geode_amethyst', amount: 5 }] } },
  { id: 'snow_frog_robe'  , name: '氷精のローブ'          , stats:           { def: 100, mdef: 150 }, recipe: { price: 22000, materials: [{ id: 'mat_snow_crystal', amount: 30 }, { id: 'mat_snow_frog_dust', amount: 5 }] } },
  { id: 'crystalinos_mail', name: 'クリスタライノスメイル', stats:           { def: 180, mdef: 140 }, recipe: { price: 23000, materials: [{ id: 'mat_crystalinos_armor', amount: 30 }, { id: 'mat_crystalinos_horn', amount: 10 }] } },
  { id: 'garnet_mail'     , name: 'ガーネットメイル'      , stats:           { def: 140, mdef: 110 }, recipe: { price: 24000, materials: [{ id: 'mat_garnet_fang', amount: 30 }, { id: 'mat_garnet_pelt', amount: 5 }] } },
  { id: 'amber_plate'     , name: 'アンバープレート'      , stats:           { def: 150, mdef: 130 }, recipe: { price: 25000, materials: [{ id: 'mat_amber_scale', amount: 30 }, { id: 'mat_amber_venom', amount: 5 }] } },
  { id: 'beryl_plate'     , name: 'ベリルプレート'        , stats:           { def: 200, mdef: 180 }, recipe: { price: 26000, materials: [{ id: 'mat_beryl_stone', amount: 30 }, { id: 'mat_beryl_core', amount: 15 }] } },
  { id: 'fluorite_cloak'  , name: 'フローライトクローク'  , stats:           { def: 120, mdef: 180 }, recipe: { price: 26000, materials: [{ id: 'mat_fluorite_powder', amount: 30 }, { id: 'mat_fluorite_wing', amount: 5 }] } },
  { id: 'pyrite_armor'    , name: 'パイライトアーマー'    , stats:           { def: 160, mdef: 140 }, recipe: { price: 27000, materials: [{ id: 'mat_pyrite_scale', amount: 30 }, { id: 'mat_pyrite_fang', amount: 5 }] } },
  { id: 'jewel_armor'     , name: 'ジュエルアーマー'      , stats:           { def: 170, mdef: 150 }, recipe: { price: 28000, materials: [{ id: 'mat_jewel_wing', amount: 30 }, { id: 'mat_jewel_blade', amount: 5 }] } },
  { id: 'luminous_robe'   , name: '光樹のローブ'          , stats: { def: 140, mdef: 220, hp:  500 }, recipe: { price: 30000, materials: [{ id: 'mat_luminous_leaf', amount: 40 }, { id: 'mat_luminous_sap', amount: 10 }] } },
  { id: 'opal_robe'       , name: 'オパールローブ'        , stats:           { def: 160, mdef: 240 }, recipe: { price: 35000, materials: [{ id: 'mat_opal_dust', amount: 30 }, { id: 'mat_opal_fragment', amount: 5 }] } },
  { id: 'diamond_armor'   , name: 'ダイヤモンドアーマー'  , stats:           { def: 280, mdef: 250 }, recipe: { price: 50000, materials: [{ id: 'mat_diamond_scale', amount: 40 }, { id: 'mat_diamond_claw', amount: 15 }] } },
  { id: 'regalia_armor'   , name: '王権の鎧'              , stats:           { def: 240, mdef: 240 }, recipe: { price: 55000, materials: [{ id: 'mat_regalia_shard', amount: 30 }, { id: 'mat_regalia_crown', amount: 5 }] } },
  { id: 'genesis_mantle'  , name: 'ジェネシスマント'      , stats: { def: 350, mdef: 350, hp: 1000 }, recipe: { price: 80000, materials: [{ id: 'mat_genesis_fragment', amount: 50 }, { id: 'mat_genesis_core', amount: 10 }] } },

  // 亡霊の廃城
  { id: 'rust_guard_armor'  , name: '錆びついた近衛鎧'    , stats:          { def: 400, mdef: 250 }, recipe: { price: 8000, materials: [{ id: 'mat_rust_armor', amount: 40 }, { id: 'mat_grudge_soul', amount: 10 }] } },
  { id: 'dust_maid_dress'   , name: 'ダストメイドドレス'  , stats: { def: 200, mdef: 450, spd: 30 }, recipe: { price: 7500, materials: [{ id: 'mat_dust_cloth', amount: 40 }, { id: 'mat_spider_web', amount: 10 }] } },
  { id: 'cursed_glass_armor', name: '呪詛のガラス鎧'      , stats:          { def: 350, mdef: 350 }, elements:  { fire: 30 }, recipe: { price: 8500, materials: [{ id: 'mat_cursed_glass', amount: 40 }, { id: 'mat_blue_flame', amount: 10 }] } },
  { id: 'madness_robe'      , name: '狂気のローブ'        , stats:          { def: 150, mdef: 550 }, elements:  { dark: 40 }, recipe: { price: 9000, materials: [{ id: 'mat_madness_cover', amount: 40 }, { id: 'mat_magic_ink', amount: 10 }] } },
  { id: 'president_suit'    , name: '虚ろなスーツ'        , stats:          { def: 300, mdef: 400 }, recipe: { price: 8200, materials: [{ id: 'mat_old_canvas', amount: 40 }, { id: 'mat_hollow_eye', amount: 10 }] } },
  { id: 'shadow_pelt_armor' , name: 'シャドウペルト'      , stats: { def: 350, mdef: 300, spd: 50 }, recipe: { price: 8800, materials: [{ id: 'mat_shadow_fur', amount: 40 }, { id: 'mat_hound_fang', amount: 10 }] } },
  { id: 'corpse_flesh_armor', name: '屍肉の鎧'            , stats:          { def: 450, mdef: 200 }, ailments: { poison: 50 }, recipe: { price: 7800, materials: [{ id: 'mat_corpse_flesh', amount: 40 }, { id: 'mat_rat_tail', amount: 10 }] } },
  { id: 'golden_armor'      , name: '純金の鎧'            , stats:          { def: 600, mdef: 600 }, elements: { light: 40 }, recipe: { price: 20000, materials: [{ id: 'mat_pure_gold', amount: 40 }, { id: 'mat_lost_treasure', amount: 10 }] } },
  { id: 'imperator_mantle'  , name: '廃王のマント'        , stats:          { def: 700, mdef: 500 }, elements:  { dark: 50 }, recipe: { price: 25000, materials: [{ id: 'mat_broken_crown', amount: 40 }, { id: 'mat_king_soul', amount: 10 }] } },
  { id: 'necromancer_robe'  , name: 'ネクロマンサーローブ', stats:          { def: 400, mdef: 800 }, elements:  { dark: 60 }, recipe: { price: 30000, materials: [{ id: 'mat_necromancer_robe', amount: 40 }, { id: 'mat_origin_core', amount: 10 }] } },

  // 精霊の唄う谷
  { id: 'young_leaf_tunic'           , name: '若葉のチュニック'        , stats: { def: 280, mdef: 140 }, elements:    { wind: 20 }, recipe: { price: 190000, materials: [{ id: 'mat_humming_leaf_vein', amount: 40 }, { id: 'mat_wind_song_dew', amount: 10 }] } },
  { id: 'phosphorescent_mail'        , name: '燐光の軽鎧'              , stats: { def: 290, mdef: 145 }, elements:   { light: 20 }, recipe: { price: 195000, materials: [{ id: 'mat_glow_bug_shell', amount: 40 }, { id: 'mat_resonance_phosphorus', amount: 10 }] } },
  { id: 'fairy_garment'              , name: '妖精の羽衣'              , stats: { def: 300, mdef: 150 }, elements:    { wind: 20 }, recipe: { price: 200000, materials: [{ id: 'mat_pixie_dust', amount: 40 }, { id: 'mat_breeze_wing', amount: 10 }] } },
  { id: 'earth_cloak'                , name: '大地のクローク'          , stats: { def: 310, mdef: 155 }, elements:   { grass: 20 }, recipe: { price: 205000, materials: [{ id: 'mat_singing_root', amount: 40 }, { id: 'mat_mandragora_leaf', amount: 10 }] } },
  { id: 'swallow_breastplate'        , name: '飛燕の胸当て'            , stats: { def: 320, mdef: 160 }, elements:    { wind: 20 }, recipe: { price: 210000, materials: [{ id: 'mat_bell_feather', amount: 40 }, { id: 'mat_swallow_beak', amount: 10 }] } },
  { id: 'grudge_robe'                , name: '怨念のローブ'            , stats: { def: 330, mdef: 165 }, elements:    { dark: 20 }, recipe: { price: 215000, materials: [{ id: 'mat_echo_ectoplasm', amount: 40 }, { id: 'mat_wisp_flame', amount: 10 }] } },
  { id: 'lizard_scale_mail'          , name: '蜥蜴鱗のスケイルメイル'  , stats: { def: 340, mdef: 170 }, elements:   { earth: 20 }, recipe: { price: 220000, materials: [{ id: 'mat_flute_scale', amount: 40 }, { id: 'mat_lizard_throat', amount: 10 }] } },
  { id: 'sylph_dress'                , name: 'シルフドレス'            , stats: { def: 350, mdef: 175 }, elements:    { wind: 20 }, recipe: { price: 225000, materials: [{ id: 'mat_sylph_garment', amount: 40 }, { id: 'mat_melody_orb', amount: 10 }] } },
  { id: 'slime_jelly_armor'          , name: 'スライムジェリーアーマー', stats: { def: 360, mdef: 180 }, elements:   { water: 20 }, recipe: { price: 230000, materials: [{ id: 'mat_water_chime_jelly', amount: 40 }, { id: 'mat_echo_water', amount: 10 }] } },
  { id: 'treant_bark_armor'          , name: 'トレントの樹皮鎧'        , stats: { def: 370, mdef: 185 }, elements:   { grass: 20 }, recipe: { price: 235000, materials: [{ id: 'mat_treant_bark', amount: 40 }, { id: 'mat_kodama_branch', amount: 10 }] } },
  { id: 'griffon_feather_vest'       , name: 'グリフォンフェザーベスト', stats: { def: 380, mdef: 190 }, elements:    { wind: 20 }, recipe: { price: 240000, materials: [{ id: 'mat_griffon_feather', amount: 40 }, { id: 'mat_chanting_beak', amount: 10 }] } },
  { id: 'siren_dancer_dress'         , name: 'セイレーンの踊り子服'    , stats: { def: 390, mdef: 195 }, elements:   { water: 20 }, recipe: { price: 245000, materials: [{ id: 'mat_siren_scale', amount: 40 }, { id: 'mat_phantom_tear', amount: 10 }] } },
  { id: 'resonance_stone_plate'      , name: '共鳴石の重鎧'            , stats: { def: 400, mdef: 200 }, elements:   { earth: 20 }, recipe: { price: 250000, materials: [{ id: 'mat_resonance_stone', amount: 40 }, { id: 'mat_golem_joint', amount: 10 }] } },
  { id: 'mad_dragon_scale_mail'      , name: '狂竜のスケイルメイル'    , stats: { def: 410, mdef: 205 }, elements:    { wind: 20 }, recipe: { price: 255000, materials: [{ id: 'mat_harp_scale', amount: 40 }, { id: 'mat_gale_fang', amount: 10 }] } },
  { id: 'water_spirit_vestment'      , name: '水精の法衣'              , stats: { def: 420, mdef: 210 }, elements:   { water: 20 }, recipe: { price: 260000, materials: [{ id: 'mat_requiem_water', amount: 40 }, { id: 'mat_undine_veil', amount: 10 }] } },
  { id: 'holy_fur_coat'              , name: '聖なる毛皮のコート'      , stats: { def: 430, mdef: 215 }, elements:   { light: 20 }, recipe: { price: 265000, materials: [{ id: 'mat_white_deer_fur', amount: 40 }, { id: 'mat_hymn_antler', amount: 10 }] } },
  { id: 'storm_garb'                 , name: '嵐の衣'                  , stats: { def: 440, mdef: 220 }, elements: { thunder: 20 }, recipe: { price: 270000, materials: [{ id: 'mat_storm_feather', amount: 40 }, { id: 'mat_thunder_bird_beak', amount: 10 }] } },
  { id: 'spirit_knight_full_armor'   , name: '精霊騎士の全身鎧'        , stats: { def: 450, mdef: 225 }, elements:    { dark: 20 }, recipe: { price: 275000, materials: [{ id: 'mat_spirit_knight_armor', amount: 40 }, { id: 'mat_swan_song_blade', amount: 10 }] } },
  { id: 'echo_dragon_sovereign_armor', name: '響竜の覇鎧'              , stats: { def: 460, mdef: 230 }, recipe: { price: 280000, materials: [{ id: 'mat_echo_dragon_scale', amount: 40 }, { id: 'mat_eternal_fang', amount: 10 }] } },
  { id: 'genesis_divine_robe'        , name: '創世の神衣'              , stats: { def: 470, mdef: 235 }, recipe: { price: 285000, materials: [{ id: 'mat_genesis_song_fragment', amount: 40 }, { id: 'mat_creation_tear', amount: 10 }] } },

  // 神秘の神殿
  { id: 'colossus_mail'        , name: 'コロッサスメイル'    , stats: { def: 480, mdef: 240 }, elements:   { light: 20 }, recipe: { price: 290000, materials: [{ id: 'mat_translucent_marble', amount: 40 }, { id: 'mat_colossus_core', amount: 10 }] } },
  { id: 'aegis_armor'          , name: 'アイギスアーマー'    , stats: { def: 485, mdef: 242 }, elements:   { earth: 20 }, recipe: { price: 292500, materials: [{ id: 'mat_monolith_fragment', amount: 40 }, { id: 'mat_aegis_shield_piece', amount: 10 }] } },
  { id: 'gigas_robe'           , name: 'ギガースローブ'      , stats: { def: 490, mdef: 245 }, elements:    { fire: 20 }, recipe: { price: 295000, materials: [{ id: 'mat_gigas_clay', amount: 40 }, { id: 'mat_ancient_priest_scroll', amount: 10 }] } },
  { id: 'xenolith_mail'        , name: 'ゼノリスメイル'      , stats: { def: 500, mdef: 250 }, elements:    { dark: 20 }, recipe: { price: 300000, materials: [{ id: 'mat_xenolith_meteorite', amount: 40 }, { id: 'mat_guardian_eye', amount: 10 }] } },
  { id: 'basilica_plate'       , name: 'バシリカプレート'    , stats: { def: 510, mdef: 255 }, elements:   { earth: 20 }, recipe: { price: 305000, materials: [{ id: 'mat_altar_stone', amount: 40 }, { id: 'mat_basilica_foundation', amount: 10 }] } },
  { id: 'crystallos_cloak'     , name: 'クリスタロスクローク', stats: { def: 515, mdef: 257 }, elements:   { light: 20 }, recipe: { price: 307500, materials: [{ id: 'mat_magic_reflect_prism', amount: 40 }, { id: 'mat_crystallos_heart', amount: 10 }] } },
  { id: 'atlas_armor'          , name: 'アトラスアーマー'    , stats: { def: 520, mdef: 260 }, elements:   { earth: 20 }, recipe: { price: 310000, materials: [{ id: 'mat_machina_gear', amount: 40 }, { id: 'mat_atlas_support_pillar', amount: 10 }] } },
  { id: 'sanctum_plate'        , name: 'サンクトゥムプレート', stats: { def: 530, mdef: 265 }, elements:   { light: 20 }, recipe: { price: 315000, materials: [{ id: 'mat_sacred_bronze', amount: 40 }, { id: 'mat_talos_armor_plate', amount: 10 }] } },

].map(item => ({ ...item, slot: 'armor', image: `./assets/armor/${item.id}.webp` }));

