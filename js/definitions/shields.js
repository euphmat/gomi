/**
 * このファイルは盾（左手に装備する防具）のデータをまとめたファイルです。
 * 
 * 盾（防具の一種）のデータ定義ファイル
 * 
 * 左手に装備する防御用のアイテムです。
 * 新しい盾を追加する場合は一番下にコピーして追加してください。
 * 
 * テンプレート（各項目は省略可能、省略された値は 0 として扱われます）
 *    stats:         { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
 *    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
 *    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
 */

export const SHIELDS = [
{ id: 'wooden_shield'          , name: '木の盾'                      , stats: { def:   2, mdef:   1 }, elements: {                        } },
{ id: 'slime_blue_shield'      , name: 'ブルースライムの盾'          , stats: { def:   3, mdef:   1 }, elements: { water:    5            }, recipe: { price:   500, materials: [{ id: 'slime_blue_fluid',       amount: 25 }, { id: 'slime_blue_jelly',       amount: 5 }] } },
{ id: 'slime_green_shield'     , name: 'グリーンスライムの盾'        , stats: { def:   3, mdef:   5 }, elements: { grass:   20            }, recipe: { price:  2000, materials: [{ id: 'slime_green_fluid',      amount: 25 }, { id: 'slime_green_jelly',      amount: 5 }] } },
{ id: 'slime_red_shield'       , name: 'レッドスライムの盾'          , stats: { def:   7, mdef:   5 }, elements: { fire:    20            }, recipe: { price:  2500, materials: [{ id: 'slime_red_fluid',        amount: 25 }, { id: 'slime_red_jelly',        amount: 5 }] } },
{ id: 'slime_water_shield'     , name: 'ウォータースライムの盾'      , stats: { def:   7, mdef:   9 }, elements: { water:   20            }, recipe: { price:  3000, materials: [{ id: 'slime_water_fluid',      amount: 25 }, { id: 'slime_water_jelly',      amount: 5 }] } },
{ id: 'slime_fire_shield'      , name: 'ファイヤースライムの盾'      , stats: { def:  11, mdef:   9 }, elements: { fire:    20            }, recipe: { price:  3500, materials: [{ id: 'slime_fire_fluid',       amount: 25 }, { id: 'slime_fire_jelly',       amount: 5 }] } },
{ id: 'slime_ice_shield'       , name: 'アイススライムの盾'          , stats: { def:  11, mdef:  13 }, elements: { ice:     20            }, recipe: { price:  4000, materials: [{ id: 'slime_ice_fluid',        amount: 25 }, { id: 'slime_ice_jelly',        amount: 5 }] } },
{ id: 'slime_wind_shield'      , name: 'ウインドスライムの盾'        , stats: { def:  15, mdef:  13 }, elements: { wind:    20            }, recipe: { price:  4500, materials: [{ id: 'slime_wind_fluid',       amount: 25 }, { id: 'slime_wind_jelly',       amount: 5 }] } },
{ id: 'slime_thunder_shield'   , name: 'サンダースライムの盾'        , stats: { def:  15, mdef:  17 }, elements: { thunder: 20            }, recipe: { price:  5000, materials: [{ id: 'slime_thunder_fluid',    amount: 25 }, { id: 'slime_thunder_jelly',    amount: 5 }] } },
{ id: 'slime_flower_shield'    , name: 'フラワースライムの盾'        , stats: { def:  19, mdef:  17 }, elements: { grass:   20            }, recipe: { price:  5500, materials: [{ id: 'slime_flower_fluid',     amount: 25 }, { id: 'slime_flower_jelly',     amount: 5 }] } },
{ id: 'slime_grass_shield'     , name: 'グラススライムの盾'          , stats: { def:  19, mdef:  21 }, elements: { grass:   25            }, recipe: { price:  6000, materials: [{ id: 'slime_grass_fluid',      amount: 25 }, { id: 'slime_grass_jelly',      amount: 5 }] } },
{ id: 'slime_dark_shield'      , name: 'ダークスライムの盾'          , stats: { def:  23, mdef:  21 }, elements: { dark:    25            }, recipe: { price:  6500, materials: [{ id: 'slime_dark_fluid',       amount: 25 }, { id: 'slime_dark_jelly',       amount: 5 }] } },
{ id: 'slime_earth_shield'     , name: 'アーススライムの盾'          , stats: { def:  23, mdef:  25 }, elements: { earth:   20            }, recipe: { price:  7000, materials: [{ id: 'slime_earth_fluid',      amount: 25 }, { id: 'slime_earth_jelly',      amount: 5 }] } },
{ id: 'slime_king_shield'      , name: 'キングスライムの盾'          , stats: { def:  27, mdef:  29 }, elements: { water:   15, grass: 15 }, recipe: { price:  7000, materials: [{ id: 'slime_king_fluid',       amount: 25 }, { id: 'slime_king_jelly',       amount: 5 }] } },
{ id: 'slime_angel_shield'     , name: 'エンジェルスライムの盾'      , stats: { def:  27, mdef:  25 }, elements: { light:   20            }, recipe: { price:  7500, materials: [{ id: 'slime_angel_fluid',      amount: 25 }, { id: 'slime_angel_jelly',      amount: 5 }] } },
{ id: 'slime_angel_king_shield', name: 'エンジェルキングスライムの盾', stats: { def:  31, mdef:  29 }, elements: { light:   30, dark:  30 }, recipe: { price:  7500, materials: [{ id: 'slime_angel_king_fluid', amount: 25 }, { id: 'slime_angel_king_jelly', amount: 5 }] } },
{ id: 'spider_cave_shield'     , name: 'ケイブスパイダーの盾'        , stats: { def:  35, mdef:  33 }, elements: {                        }, recipe: { price:  8000, materials: [{ id: 'spider_cave_venom',      amount: 250 }, { id: 'spider_cave_silk',       amount: 50 }] } },
{ id: 'spider_poison_shield'   , name: 'ポイズンスパイダーの盾'      , stats: { def:  39, mdef:  37 }, elements: {                        }, recipe: { price:  8500, materials: [{ id: 'spider_poison_venom',    amount: 250 }, { id: 'spider_poison_silk',     amount: 50 }] } },
{ id: 'spider_trapdoor_shield' , name: 'トラップドアスパイダーの盾'  , stats: { def:  43, mdef:  41 }, elements: {                        }, recipe: { price:  9000, materials: [{ id: 'spider_trapdoor_venom',  amount: 250 }, { id: 'spider_trapdoor_silk',   amount: 50 }] } },
{ id: 'weaver_web_shield'      , name: 'ウェブウィーバーの盾'        , stats: { def:  47, mdef:  45 }, elements: {                        }, recipe: { price:  9500, materials: [{ id: 'weaver_web_venom',       amount: 25 }, { id: 'weaver_web_silk',        amount: 5 }] } },
{ id: 'spitter_acid_shield'    , name: 'アシッドスピッターの盾'      , stats: { def:  51, mdef:  49 }, elements: {                        }, recipe: { price: 10000, materials: [{ id: 'spitter_acid_venom',     amount: 25 }, { id: 'spitter_acid_silk',      amount: 5 }] } },
{ id: 'arachnid_shadow_shield' , name: 'シャドウアラクニドの盾'      , stats: { def:  55, mdef:  53 }, elements: {                        }, recipe: { price: 10500, materials: [{ id: 'arachnid_shadow_venom',  amount: 25 }, { id: 'arachnid_shadow_silk',   amount: 5 }] } },
{ id: 'tick_blood_shield'      , name: 'ブラッドティックの盾'        , stats: { def:  59, mdef:  57 }, elements: {                        }, recipe: { price: 11000, materials: [{ id: 'tick_blood_venom',       amount: 25 }, { id: 'tick_blood_silk',        amount: 5 }] } },
{ id: 'crawler_bone_shield'    , name: 'ボーンクロウラーの盾'        , stats: { def:  63, mdef:  61 }, elements: {                        }, recipe: { price: 11500, materials: [{ id: 'crawler_bone_venom',     amount: 25 }, { id: 'crawler_bone_silk',      amount: 5 }] } },
{ id: 'swarm_spider_shield'    , name: 'スパイダースウォームの盾'    , stats: { def:  67, mdef:  65 }, elements: {                        }, recipe: { price: 12000, materials: [{ id: 'swarm_spider_venom',     amount: 250 }, { id: 'swarm_spider_silk',      amount: 50 }] } },
{ id: 'spider_dark_shield'     , name: 'ダークウィドウの盾'          , stats: { def:  71, mdef:  69 }, elements: {                        }, recipe: { price: 12500, materials: [{ id: 'spider_dark_venom',      amount: 250 }, { id: 'spider_dark_silk',       amount: 50 }] } },
{ id: 'weaver_golden_shield'   , name: 'ゴールデンウィーバーの盾'    , stats: { def:  75, mdef:  73 }, elements: {                        }, recipe: { price: 13000, materials: [{ id: 'weaver_golden_venom',    amount: 25 }, { id: 'weaver_golden_silk',     amount: 5 }] } },
{ id: 'arachnid_crystal_shield', name: 'クリスタルアラクニドの盾'    , stats: { def:  79, mdef:  77 }, elements: {                        }, recipe: { price: 13500, materials: [{ id: 'arachnid_crystal_venom', amount: 25 }, { id: 'arachnid_crystal_silk',  amount: 5 }] } },
{ id: 'boss_broodmother_shield', name: 'ブルードマザーの盾'          , stats: { def:  90, mdef:  88 }, elements: {                        }, recipe: { price: 15000, materials: [{ id: 'boss_broodmother_venom', amount: 250 }, { id: 'boss_broodmother_silk',  amount: 50 }] } },
{ id: 'boss_arachne_shield'    , name: 'アラクネ・クイーンの盾'      , stats: { def: 100, mdef:  98 }, elements: {                        }, recipe: { price: 16000, materials: [{ id: 'boss_arachne_venom',     amount: 25 }, { id: 'boss_arachne_silk',      amount: 5 }] } },
{ id: 'boss_deathweaver_shield', name: 'デスウィーバーの盾'          , stats: { def: 110, mdef: 108 }, recipe: { price: 18000, materials: [{ id: 'boss_deathweaver_venom', amount: 25 }, { id: 'boss_deathweaver_silk', amount: 5 }] } },
{ id: 'crisp_shield'           , name: 'クリスプシールド'                , stats: { def: 100, mdef: 100 }, recipe: { price: 20000, materials: [{ id: 'mat_crisp_shard', amount: 30 }, { id: 'mat_crisp_core', amount: 5 }] } },
{ id: 'geode_shield'           , name: 'ジオードシールド'                , stats: { def: 120, mdef:  90 }, recipe: { price: 21000, materials: [{ id: 'mat_geode_amethyst', amount: 30 }, { id: 'mat_geode_heart', amount: 5 }] } },
{ id: 'snow_frog_shield'      , name: '氷精の盾'                        , stats: { def: 90, mdef: 130 }, recipe: { price: 22000, materials: [{ id: 'mat_snow_crystal', amount: 30 }, { id: 'mat_snow_frog_dust', amount: 5 }] } },
{ id: 'crystalinos_shield'     , name: 'クリスタライノスシールド'        , stats: { def: 135, mdef: 110 }, recipe: { price: 23000, materials: [{ id: 'mat_crystalinos_horn', amount: 30 }, { id: 'mat_crystalinos_soul', amount: 10 }] } },
{ id: 'garnet_shield'          , name: 'ガーネットシールド'              , stats: { def: 120, mdef: 90 }, recipe: { price: 24000, materials: [{ id: 'mat_garnet_fang', amount: 30 }, { id: 'mat_garnet_pelt', amount: 5 }] } },
{ id: 'amber_shield'           , name: 'アンバーシールド'                , stats: { def: 130, mdef: 110 }, recipe: { price: 25000, materials: [{ id: 'mat_amber_scale', amount: 30 }, { id: 'mat_amber_venom', amount: 5 }] } },
{ id: 'beryl_shield'           , name: 'ベリルシールド'                  , stats: { def: 150, mdef: 140 }, recipe: { price: 26000, materials: [{ id: 'mat_beryl_core', amount: 30 }, { id: 'mat_beryl_reactor', amount: 15 }] } },
{ id: 'jewel_shield'           , name: 'ジュエルシールド'                , stats: { def: 140, mdef: 120 }, recipe: { price: 27000, materials: [{ id: 'mat_jewel_wing', amount: 30 }, { id: 'mat_jewel_blade', amount: 5 }] } },
{ id: 'fluorite_shield'        , name: 'フローライトシールド'            , stats: { def: 100, mdef: 150 }, recipe: { price: 28000, materials: [{ id: 'mat_fluorite_powder', amount: 30 }, { id: 'mat_fluorite_wing', amount: 5 }] } },
{ id: 'pyrite_shield'          , name: 'パイライトシールド'              , stats: { def: 130, mdef: 120 }, recipe: { price: 29000, materials: [{ id: 'mat_pyrite_scale', amount: 30 }, { id: 'mat_pyrite_fang', amount: 5 }] } },
{ id: 'luminous_shield'        , name: '光樹の盾'                        , stats: { def: 120, mdef: 180 }, recipe: { price: 32000, materials: [{ id: 'mat_luminous_leaf', amount: 30 }, { id: 'mat_luminous_sap', amount: 5 }] } },
{ id: 'opal_shield'            , name: 'オパールの盾'                    , stats: { def: 130, mdef: 190 }, recipe: { price: 35000, materials: [{ id: 'mat_opal_dust', amount: 30 }, { id: 'mat_opal_fragment', amount: 5 }] } },
{ id: 'diamond_shield'         , name: 'ダイヤモンドシールド'            , stats: { def: 210, mdef: 200 }, recipe: { price: 50000, materials: [{ id: 'mat_diamond_claw', amount: 40 }, { id: 'mat_diamond_laser_core', amount: 15 }] } },
{ id: 'regalia_shield'         , name: '王権の盾'                        , stats: { def: 250, mdef: 250 }, recipe: { price: 55000, materials: [{ id: 'mat_regalia_crown', amount: 40 }, { id: 'mat_regalia_sword', amount: 15 }] } },
{ id: 'genesis_shield'         , name: 'ジェネシスシールド'              , stats: { def: 200, mdef: 200 }, recipe: { price: 80000, materials: [{ id: 'mat_genesis_fragment', amount: 50 }, { id: 'mat_genesis_core', amount: 10 }] } },
].map(item => ({ ...item, slot: 'leftHand', image: `./assets/shield/${item.id}.webp` }));

