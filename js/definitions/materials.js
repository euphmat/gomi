/**

 * このファイルは素材やドロップアイテムなど、装備できないアイテムのデータをまとめたファイルです。
 * 
 * 素材・消費アイテムなどのデータ定義ファイル
 * 
 * 装備できないアイテム（モンスターのドロップ品など）を定義します。
 */

export const MATERIALS = [
  { id: 'slime_angel_jelly',      name: 'エンジェルスライムのゼリー'       },
  { id: 'slime_angel_core',       name: 'エンジェルスライムのコア'         },
  { id: 'slime_angel_fluid',      name: 'エンジェルスライムの体液'         },
  { id: 'slime_angel_king_jelly', name: 'エンジェルキングスライムのゼリー' },
  { id: 'slime_angel_king_core',  name: 'エンジェルキングスライムのコア'   },
  { id: 'slime_angel_king_fluid', name: 'エンジェルキングスライムの体液'   },
  { id: 'slime_blue_jelly',       name: 'ブルースライムのゼリー'           },
  { id: 'slime_blue_core',        name: 'ブルースライムのコア'             },
  { id: 'slime_blue_fluid',       name: 'ブルースライムの体液'             },
  { id: 'slime_dark_jelly',       name: 'ダークスライムのゼリー'           },
  { id: 'slime_dark_core',        name: 'ダークスライムのコア'             },
  { id: 'slime_dark_fluid',       name: 'ダークスライムの体液'             },
  { id: 'slime_earth_jelly',      name: 'アーススライムのゼリー'           },
  { id: 'slime_earth_core',       name: 'アーススライムのコア'             },
  { id: 'slime_earth_fluid',      name: 'アーススライムの体液'             },
  { id: 'slime_fire_jelly',       name: 'ファイヤースライムのゼリー'       },
  { id: 'slime_fire_core',        name: 'ファイヤースライムのコア'         },
  { id: 'slime_fire_fluid',       name: 'ファイヤースライムの体液'         },
  { id: 'slime_flower_jelly',     name: 'フラワースライムのゼリー'         },
  { id: 'slime_flower_core',      name: 'フラワースライムのコア'           },
  { id: 'slime_flower_fluid',     name: 'フラワースライムの体液'           },
  { id: 'slime_grass_jelly',      name: 'グラススライムのゼリー'           },
  { id: 'slime_grass_core',       name: 'グラススライムのコア'             },
  { id: 'slime_grass_fluid',      name: 'グラススライムの体液'             },
  { id: 'slime_green_jelly',      name: 'グリーンスライムのゼリー'         },
  { id: 'slime_green_core',       name: 'グリーンスライムのコア'           },
  { id: 'slime_green_fluid',      name: 'グリーンスライムの体液'           },
  { id: 'slime_ice_jelly',        name: 'アイススライムのゼリー'           },
  { id: 'slime_ice_core',         name: 'アイススライムのコア'             },
  { id: 'slime_ice_fluid',        name: 'アイススライムの体液'             },
  { id: 'slime_king_jelly',       name: 'キングスライムのゼリー'           },
  { id: 'slime_king_core',        name: 'キングスライムのコア'             },
  { id: 'slime_king_fluid',       name: 'キングスライムの体液'             },
  { id: 'slime_red_jelly',        name: 'レッドスライムのゼリー'           },
  { id: 'slime_red_core',         name: 'レッドスライムのコア'             },
  { id: 'slime_red_fluid',        name: 'レッドスライムの体液'             },
  { id: 'slime_thunder_jelly',    name: 'サンダースライムのゼリー'         },
  { id: 'slime_thunder_core',     name: 'サンダースライムのコア'           },
  { id: 'slime_thunder_fluid',    name: 'サンダースライムの体液'           },
  { id: 'slime_water_jelly',      name: 'ウォータースライムのゼリー'       },
  { id: 'slime_water_core',       name: 'ウォータースライムのコア'         },
  { id: 'slime_water_fluid',      name: 'ウォータースライムの体液'         },
  { id: 'slime_wind_jelly',       name: 'ウインドスライムのゼリー'         },
  { id: 'slime_wind_core',        name: 'ウインドスライムのコア'           },
  { id: 'slime_wind_fluid',       name: 'ウインドスライムの体液'           },
].map(item => ({ ...item, image: `./assets/material/${item.id}.webp` }));