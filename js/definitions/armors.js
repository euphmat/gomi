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
    { id: 'spider_cave_armor'     , name: 'ケイブスパイダーアーマー'        , stats: { def: 52, mdef: 50 }  , recipe: { price: 8000, materials: [{ id: 'spider_cave_fang', amount: 25 }, { id: 'spider_cave_venom', amount: 5 }] } },
    { id: 'spider_poison_armor'   , name: 'ポイズンスパイダーアーマー'      , stats: { def: 58, mdef: 55 }  , recipe: { price: 8500, materials: [{ id: 'spider_poison_fang', amount: 25 }, { id: 'spider_poison_venom', amount: 5 }] } },
    { id: 'spider_trapdoor_armor' , name: 'トラップドアスパイダーアーマー'  , stats: { def: 64, mdef: 60 }  , recipe: { price: 9000, materials: [{ id: 'spider_trapdoor_fang', amount: 25 }, { id: 'spider_trapdoor_venom', amount: 5 }] } },
    { id: 'weaver_web_armor'      , name: 'ウェブウィーバーアーマー'        , stats: { def: 70, mdef: 66 }  , recipe: { price: 9500, materials: [{ id: 'weaver_web_fang', amount: 25 }, { id: 'weaver_web_venom', amount: 5 }] } },
    { id: 'spitter_acid_armor'    , name: 'アシッドスピッターアーマー'      , stats: { def: 76, mdef: 72 }  , recipe: { price: 10000, materials: [{ id: 'spitter_acid_fang', amount: 25 }, { id: 'spitter_acid_venom', amount: 5 }] } },
    { id: 'arachnid_shadow_armor' , name: 'シャドウアラクニドアーマー'      , stats: { def: 82, mdef: 78 }  , recipe: { price: 10500, materials: [{ id: 'arachnid_shadow_fang', amount: 25 }, { id: 'arachnid_shadow_venom', amount: 5 }] } },
    { id: 'tick_blood_armor'      , name: 'ブラッドティックアーマー'        , stats: { def: 88, mdef: 84 }  , recipe: { price: 11000, materials: [{ id: 'tick_blood_fang', amount: 25 }, { id: 'tick_blood_venom', amount: 5 }] } },
    { id: 'crawler_bone_armor'    , name: 'ボーンクロウラーアーマー'        , stats: { def: 94, mdef: 90 }  , recipe: { price: 11500, materials: [{ id: 'crawler_bone_fang', amount: 25 }, { id: 'crawler_bone_venom', amount: 5 }] } },
    { id: 'swarm_spider_armor'    , name: 'スパイダースウォームアーマー'    , stats: { def: 100, mdef: 96 } , recipe: { price: 12000, materials: [{ id: 'swarm_spider_fang', amount: 25 }, { id: 'swarm_spider_venom', amount: 5 }] } },
    { id: 'spider_dark_armor'     , name: 'ダークウィドウアーマー'          , stats: { def: 106, mdef: 102 }, recipe: { price: 12500, materials: [{ id: 'spider_dark_fang', amount: 25 }, { id: 'spider_dark_venom', amount: 5 }] } },
    { id: 'weaver_golden_armor'   , name: 'ゴールデンウィーバーアーマー'    , stats: { def: 112, mdef: 108 }, recipe: { price: 13000, materials: [{ id: 'weaver_golden_fang', amount: 25 }, { id: 'weaver_golden_venom', amount: 5 }] } },
    { id: 'arachnid_crystal_armor', name: 'クリスタルアラクニドアーマー'    , stats: { def: 118, mdef: 114 }, recipe: { price: 13500, materials: [{ id: 'arachnid_crystal_fang', amount: 25 }, { id: 'arachnid_crystal_venom', amount: 5 }] } },
    { id: 'boss_broodmother_armor', name: 'ブルードマザーアーマー'          , stats: { def: 130, mdef: 125 }, recipe: { price: 15000, materials: [{ id: 'boss_broodmother_fang', amount: 25 }, { id: 'boss_broodmother_venom', amount: 5 }] } },
    { id: 'boss_arachne_armor'    , name: 'アラクネ・クイーンアーマー'      , stats: { def: 140, mdef: 135 }, recipe: { price: 16000, materials: [{ id: 'boss_arachne_fang', amount: 25 }, { id: 'boss_arachne_venom', amount: 5 }] } },
    { id: 'boss_deathweaver_armor', name: 'デスウィーバーアーマー'          , stats: { def: 150, mdef: 145 }, recipe: { price: 18000, materials: [{ id: 'boss_deathweaver_fang', amount: 25 }, { id: 'boss_deathweaver_venom', amount: 5 }] } },
].map(item => ({ ...item, slot: 'armor', image: `./assets/armor/${item.id}.webp` }));
