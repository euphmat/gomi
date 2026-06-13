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
  { id: 'cloth_armor'           , name: '布の服'                          , stats: { def:  2, mdef:  1 }  , elements: {                        } },
  { id: 'slime_blue_armor'      , name: 'ブルースライムアーマー'          , stats: { def:  4, mdef:  2 }  , elements: { water:    5            }, recipe: { price:  500, materials: [{ id: 'slime_blue_core',       amount: 25 }, { id: 'slime_blue_fluid',       amount: 5 }] } },
  { id: 'slime_green_armor'     , name: 'グリーンスライムアーマー'        , stats: { def:  5, mdef:  7 }  , elements: { grass:   20            }, recipe: { price: 1000, materials: [{ id: 'slime_green_core',      amount: 25 }, { id: 'slime_green_fluid',      amount: 5 }] } },
  { id: 'slime_red_armor'       , name: 'レッドスライムアーマー'          , stats: { def: 10, mdef:  8 }  , elements: { fire:    20            }, recipe: { price: 1500, materials: [{ id: 'slime_red_core',        amount: 25 }, { id: 'slime_red_fluid',        amount: 5 }] } },
  { id: 'slime_water_armor'     , name: 'ウォータースライムアーマー'      , stats: { def: 11, mdef: 13 }  , elements: { water:   20            }, recipe: { price: 2000, materials: [{ id: 'slime_water_core',      amount: 25 }, { id: 'slime_water_fluid',      amount: 5 }] } },
  { id: 'slime_fire_armor'      , name: 'ファイヤースライムアーマー'      , stats: { def: 16, mdef: 14 }  , elements: { fire:    20            }, recipe: { price: 2500, materials: [{ id: 'slime_fire_core',       amount: 25 }, { id: 'slime_fire_fluid',       amount: 5 }] } },
  { id: 'slime_ice_armor'       , name: 'アイススライムアーマー'          , stats: { def: 17, mdef: 19 }  , elements: { ice:     20            }, recipe: { price: 3000, materials: [{ id: 'slime_ice_core',        amount: 25 }, { id: 'slime_ice_fluid',        amount: 5 }] } },
  { id: 'slime_wind_armor'      , name: 'ウインドスライムアーマー'        , stats: { def: 22, mdef: 20 }  , elements: { wind:    20            }, recipe: { price: 3500, materials: [{ id: 'slime_wind_core',       amount: 25 }, { id: 'slime_wind_fluid',       amount: 5 }] } },
  { id: 'slime_thunder_armor'   , name: 'サンダースライムアーマー'        , stats: { def: 23, mdef: 25 }  , elements: { thunder: 20            }, recipe: { price: 4000, materials: [{ id: 'slime_thunder_core',    amount: 25 }, { id: 'slime_thunder_fluid',    amount: 5 }] } },
  { id: 'slime_flower_armor'    , name: 'フラワースライムアーマー'        , stats: { def: 28, mdef: 26 }  , elements: { grass:   20            }, recipe: { price: 4500, materials: [{ id: 'slime_flower_core',     amount: 25 }, { id: 'slime_flower_fluid',     amount: 5 }] } },
  { id: 'slime_grass_armor'     , name: 'グラススライムアーマー'          , stats: { def: 29, mdef: 31 }  , elements: { grass:   25            }, recipe: { price: 5000, materials: [{ id: 'slime_grass_core',      amount: 25 }, { id: 'slime_grass_fluid',      amount: 5 }] } },
  { id: 'slime_dark_armor'      , name: 'ダークスライムアーマー'          , stats: { def: 34, mdef: 32 }  , elements: { dark:    25            }, recipe: { price: 5500, materials: [{ id: 'slime_dark_core',       amount: 25 }, { id: 'slime_dark_fluid',       amount: 5 }] } },
  { id: 'slime_earth_armor'     , name: 'アーススライムアーマー'          , stats: { def: 35, mdef: 37 }  , elements: { earth:   20            }, recipe: { price: 6000, materials: [{ id: 'slime_earth_core',      amount: 25 }, { id: 'slime_earth_fluid',      amount: 5 }] } },
  { id: 'slime_angel_armor'     , name: 'エンジェルスライムアーマー'      , stats: { def: 40, mdef: 38 }  , elements: { light:   20            }, recipe: { price: 6500, materials: [{ id: 'slime_angel_core',      amount: 25 }, { id: 'slime_angel_fluid',      amount: 5 }] } },
  { id: 'slime_king_armor'      , name: 'キングスライムアーマー'          , stats: { def: 41, mdef: 43 }  , elements: { fire:    15, water: 15 }, recipe: { price: 7000, materials: [{ id: 'slime_king_core',       amount: 25 }, { id: 'slime_king_fluid',       amount: 5 }] } },
  { id: 'slime_angel_king_armor', name: 'エンジェルキングスライムアーマー', stats: { def: 46, mdef: 44 }  , elements: { light:   30, dark:  30 }, recipe: { price: 7500, materials: [{ id: 'slime_angel_king_core', amount: 25 }, { id: 'slime_angel_king_fluid',  amount: 5 }] } },
    { id: 'spider_cave_armor'     , name: 'ケイブスパイダーアーマー'        , stats: { def: 52, mdef: 50 }  , recipe: { price: 8000, materials: [{ id: 'spider_cave_fang', amount: 250 }, { id: 'spider_cave_venom', amount: 50 }] } },
    { id: 'spider_poison_armor'   , name: 'ポイズンスパイダーアーマー'      , stats: { def: 58, mdef: 55 }  , recipe: { price: 8500, materials: [{ id: 'spider_poison_fang', amount: 250 }, { id: 'spider_poison_venom', amount: 50 }] } },
    { id: 'spider_trapdoor_armor' , name: 'トラップドアスパイダーアーマー'  , stats: { def: 64, mdef: 60 }  , recipe: { price: 9000, materials: [{ id: 'spider_trapdoor_fang', amount: 250 }, { id: 'spider_trapdoor_venom', amount: 50 }] } },
    { id: 'weaver_web_armor'      , name: 'ウェブウィーバーアーマー'        , stats: { def: 70, mdef: 66 }  , recipe: { price: 9500, materials: [{ id: 'weaver_web_fang', amount: 25 }, { id: 'weaver_web_venom', amount: 5 }] } },
    { id: 'spitter_acid_armor'    , name: 'アシッドスピッターアーマー'      , stats: { def: 76, mdef: 72 }  , recipe: { price: 10000, materials: [{ id: 'spitter_acid_fang', amount: 25 }, { id: 'spitter_acid_venom', amount: 5 }] } },
    { id: 'arachnid_shadow_armor' , name: 'シャドウアラクニドアーマー'      , stats: { def: 82, mdef: 78 }  , recipe: { price: 10500, materials: [{ id: 'arachnid_shadow_fang', amount: 25 }, { id: 'arachnid_shadow_venom', amount: 5 }] } },
    { id: 'tick_blood_armor'      , name: 'ブラッドティックアーマー'        , stats: { def: 88, mdef: 84 }  , recipe: { price: 11000, materials: [{ id: 'tick_blood_fang', amount: 25 }, { id: 'tick_blood_venom', amount: 5 }] } },
    { id: 'crawler_bone_armor'    , name: 'ボーンクロウラーアーマー'        , stats: { def: 94, mdef: 90 }  , recipe: { price: 11500, materials: [{ id: 'crawler_bone_fang', amount: 25 }, { id: 'crawler_bone_venom', amount: 5 }] } },
    { id: 'swarm_spider_armor'    , name: 'スパイダースウォームアーマー'    , stats: { def: 100, mdef: 96 } , recipe: { price: 12000, materials: [{ id: 'swarm_spider_fang', amount: 250 }, { id: 'swarm_spider_venom', amount: 50 }] } },
    { id: 'spider_dark_armor'     , name: 'ダークウィドウアーマー'          , stats: { def: 106, mdef: 102 }, recipe: { price: 12500, materials: [{ id: 'spider_dark_fang', amount: 250 }, { id: 'spider_dark_venom', amount: 50 }] } },
    { id: 'weaver_golden_armor'   , name: 'ゴールデンウィーバーアーマー'    , stats: { def: 112, mdef: 108 }, recipe: { price: 13000, materials: [{ id: 'weaver_golden_fang', amount: 25 }, { id: 'weaver_golden_venom', amount: 5 }] } },
    { id: 'arachnid_crystal_armor', name: 'クリスタルアラクニドアーマー'    , stats: { def: 118, mdef: 114 }, recipe: { price: 13500, materials: [{ id: 'arachnid_crystal_fang', amount: 25 }, { id: 'arachnid_crystal_venom', amount: 5 }] } },
    { id: 'boss_broodmother_armor', name: 'ブルードマザーアーマー'          , stats: { def: 130, mdef: 125 }, recipe: { price: 15000, materials: [{ id: 'boss_broodmother_fang', amount: 250 }, { id: 'boss_broodmother_venom', amount: 50 }] } },
    { id: 'boss_arachne_armor'    , name: 'アラクネ・クイーンアーマー'      , stats: { def: 140, mdef: 135 }, recipe: { price: 16000, materials: [{ id: 'boss_arachne_fang', amount: 25 }, { id: 'boss_arachne_venom', amount: 5 }] } },
    { id: 'boss_deathweaver_armor', name: 'デスウィーバーアーマー'          , stats: { def: 150, mdef: 145 }, recipe: { price: 18000, materials: [{ id: 'boss_deathweaver_fang', amount: 25 }, { id: 'boss_deathweaver_venom', amount: 5 }] } },
    { id: 'crisp_armor'           , name: 'クリスプアーマー'                , stats: { def: 110, mdef: 110 }, recipe: { price: 20000, materials: [{ id: 'mat_crisp_shard', amount: 30 }, { id: 'mat_crisp_core', amount: 5 }] } },
    { id: 'geode_armor'           , name: 'ジオードアーマー'                , stats: { def: 160, mdef: 120 }, recipe: { price: 21000, materials: [{ id: 'mat_geode_shell', amount: 30 }, { id: 'mat_geode_amethyst', amount: 5 }] } },
    { id: 'snow_flare_robe'       , name: '氷精のローブ'                    , stats: { def: 100, mdef: 150 }, recipe: { price: 22000, materials: [{ id: 'mat_snow_crystal', amount: 30 }, { id: 'mat_snow_flare_dust', amount: 5 }] } },
    { id: 'crystalinos_mail'      , name: 'クリスタライノスメイル'          , stats: { def: 180, mdef: 140 }, recipe: { price: 23000, materials: [{ id: 'mat_crystalinos_armor', amount: 30 }, { id: 'mat_crystalinos_horn', amount: 10 }] } },
    { id: 'garnet_mail'           , name: 'ガーネットメイル'                , stats: { def: 140, mdef: 110 }, recipe: { price: 24000, materials: [{ id: 'mat_garnet_fang', amount: 30 }, { id: 'mat_garnet_pelt', amount: 5 }] } },
    { id: 'amber_plate'           , name: 'アンバープレート'                , stats: { def: 150, mdef: 130 }, recipe: { price: 25000, materials: [{ id: 'mat_amber_scale', amount: 30 }, { id: 'mat_amber_venom', amount: 5 }] } },
    { id: 'beryl_plate'           , name: 'ベリルプレート'                  , stats: { def: 200, mdef: 180 }, recipe: { price: 26000, materials: [{ id: 'mat_beryl_stone', amount: 30 }, { id: 'mat_beryl_core', amount: 15 }] } },
    { id: 'fluorite_cloak'        , name: 'フローライトクローク'            , stats: { def: 120, mdef: 180 }, recipe: { price: 26000, materials: [{ id: 'mat_fluorite_powder', amount: 30 }, { id: 'mat_fluorite_wing', amount: 5 }] } },
    { id: 'pyrite_armor'          , name: 'パイライトアーマー'              , stats: { def: 160, mdef: 140 }, recipe: { price: 27000, materials: [{ id: 'mat_pyrite_scale', amount: 30 }, { id: 'mat_pyrite_fang', amount: 5 }] } },
    { id: 'jewel_armor'           , name: 'ジュエルアーマー'                , stats: { def: 170, mdef: 150 }, recipe: { price: 28000, materials: [{ id: 'mat_jewel_wing', amount: 30 }, { id: 'mat_jewel_blade', amount: 5 }] } },
    { id: 'luminous_robe'         , name: '光樹のローブ'                    , stats: { def: 140, mdef: 220, hp: 500 }, recipe: { price: 30000, materials: [{ id: 'mat_luminous_leaf', amount: 40 }, { id: 'mat_luminous_sap', amount: 10 }] } },
    { id: 'opal_robe'             , name: 'オパールローブ'                  , stats: { def: 160, mdef: 240 }, recipe: { price: 35000, materials: [{ id: 'mat_opal_dust', amount: 30 }, { id: 'mat_opal_fragment', amount: 5 }] } },
    { id: 'diamond_armor'         , name: 'ダイヤモンドアーマー'            , stats: { def: 280, mdef: 250 }, recipe: { price: 50000, materials: [{ id: 'mat_diamond_scale', amount: 40 }, { id: 'mat_diamond_claw', amount: 15 }] } },
    { id: 'regalia_armor'         , name: '王権の鎧'                        , stats: { def: 240, mdef: 240 }, recipe: { price: 55000, materials: [{ id: 'mat_regalia_shard', amount: 30 }, { id: 'mat_regalia_crown', amount: 5 }] } },
    { id: 'genesis_mantle'        , name: 'ジェネシスマント'                , stats: { def: 350, mdef: 350, hp: 1000 }, recipe: { price: 80000, materials: [{ id: 'mat_genesis_fragment', amount: 50 }, { id: 'mat_genesis_core', amount: 10 }] } },
].map(item => ({ ...item, slot: 'armor', image: `./assets/armor/${item.id}.webp` }));

