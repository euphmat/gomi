/**
 * このファイルはアクセサリー（指輪やネックレスなど）のデータをまとめたファイルです。
 * 
 * アクセサリーのデータ定義ファイル
 * 
 * ステータスを補助する指輪やネックレスなどです。
 * 
 * テンプレート（各項目は省略可能、省略された値は 0 として扱われます）
 *    stats:         { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
 *    elements:      { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
 *    ailments:      { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
 */

export const ACCESSORIES = [
  // スライムの森
  { id: 'slime_blue_ring', name: 'ブルースライムリング', stats: { hp: 10, def: 2, mdef: 1 }, recipe: { price: 500, materials: [{ id: 'slime_blue_jelly', amount: 25 }, { id: 'slime_blue_core', amount: 15 }, { id: 'slime_blue_fluid', amount: 5 }] } },
  { id: 'slime_green_ring', name: 'グリーンスライムリング', stats: { hp: 20, def: 3, mdef: 5 }, recipe: { price: 1000, materials: [{ id: 'slime_green_jelly', amount: 25 }, { id: 'slime_green_core', amount: 15 }, { id: 'slime_green_fluid', amount: 5 }] } },
  { id: 'slime_red_ring', name: 'レッドスライムリング', stats: { hp: 30, def: 7, mdef: 5 }, recipe: { price: 1500, materials: [{ id: 'slime_red_jelly', amount: 25 }, { id: 'slime_red_core', amount: 15 }, { id: 'slime_red_fluid', amount: 5 }] } },
  { id: 'slime_water_ring', name: 'ウォータースライムリング', stats: { hp: 40, def: 7, mdef: 9 }, recipe: { price: 2000, materials: [{ id: 'slime_water_jelly', amount: 25 }, { id: 'slime_water_core', amount: 15 }, { id: 'slime_water_fluid', amount: 5 }] } },
  { id: 'slime_fire_ring', name: 'ファイヤースライムリング', stats: { hp: 50, def: 11, mdef: 9 }, recipe: { price: 2500, materials: [{ id: 'slime_fire_jelly', amount: 25 }, { id: 'slime_fire_core', amount: 15 }, { id: 'slime_fire_fluid', amount: 5 }] } },
  { id: 'slime_ice_ring', name: 'アイススライムリング', stats: { hp: 60, def: 11, mdef: 13 }, recipe: { price: 3000, materials: [{ id: 'slime_ice_jelly', amount: 25 }, { id: 'slime_ice_core', amount: 15 }, { id: 'slime_ice_fluid', amount: 5 }] } },
  { id: 'slime_wind_ring', name: 'ウインドスライムリング', stats: { hp: 70, def: 15, mdef: 13 }, recipe: { price: 3500, materials: [{ id: 'slime_wind_jelly', amount: 25 }, { id: 'slime_wind_core', amount: 15 }, { id: 'slime_wind_fluid', amount: 5 }] } },
  { id: 'slime_thunder_ring', name: 'サンダースライムリング', stats: { hp: 80, def: 15, mdef: 17 }, recipe: { price: 4000, materials: [{ id: 'slime_thunder_jelly', amount: 25 }, { id: 'slime_thunder_core', amount: 15 }, { id: 'slime_thunder_fluid', amount: 5 }] } },
  { id: 'slime_flower_ring', name: 'フラワースライムリング', stats: { hp: 90, def: 19, mdef: 17 }, recipe: { price: 4500, materials: [{ id: 'slime_flower_jelly', amount: 25 }, { id: 'slime_flower_core', amount: 15 }, { id: 'slime_flower_fluid', amount: 5 }] } },
  { id: 'slime_grass_ring', name: 'グラススライムリング', stats: { hp: 100, def: 19, mdef: 21 }, recipe: { price: 5000, materials: [{ id: 'slime_grass_jelly', amount: 25 }, { id: 'slime_grass_core', amount: 15 }, { id: 'slime_grass_fluid', amount: 5 }] } },
  { id: 'slime_dark_ring', name: 'ダークスライムリング', stats: { hp: 110, def: 23, mdef: 21 }, recipe: { price: 5500, materials: [{ id: 'slime_dark_jelly', amount: 25 }, { id: 'slime_dark_core', amount: 15 }, { id: 'slime_dark_fluid', amount: 5 }] } },
  { id: 'slime_earth_ring', name: 'アーススライムリング', stats: { hp: 120, def: 23, mdef: 25 }, recipe: { price: 6000, materials: [{ id: 'slime_earth_jelly', amount: 25 }, { id: 'slime_earth_core', amount: 15 }, { id: 'slime_earth_fluid', amount: 5 }] } },
  { id: 'slime_angel_ring', name: 'エンジェルスライムリング', stats: { hp: 130, def: 27, mdef: 25 }, recipe: { price: 6500, materials: [{ id: 'slime_angel_jelly', amount: 25 }, { id: 'slime_angel_core', amount: 15 }, { id: 'slime_angel_fluid', amount: 5 }] } },
  { id: 'slime_king_ring', name: 'キングスライムリング', stats: { hp: 130, def: 27, mdef: 29 }, recipe: { price: 7000, materials: [{ id: 'slime_king_jelly', amount: 25 }, { id: 'slime_king_core', amount: 15 }, { id: 'slime_king_fluid', amount: 5 }] } },
  { id: 'slime_angel_king_ring', name: 'エンジェルキングスライムリング', stats: { hp: 150, def: 31, mdef: 29 }, recipe: { price: 7500, materials: [{ id: 'slime_angel_king_jelly', amount: 25 }, { id: 'slime_angel_king_core', amount: 15 }, { id: 'slime_angel_king_fluid', amount: 5 }] } },

  // 蜘蛛の洞窟
  { id: 'spider_cave_ring', name: 'ケイブスパイダーリング', stats: { hp: 160, def: 35, mdef: 33 }, recipe: { price: 8000, materials: [{ id: 'spider_cave_silk', amount: 250 }, { id: 'spider_cave_fang', amount: 150 }, { id: 'spider_cave_venom', amount: 50 }] } },
  { id: 'spider_poison_ring', name: 'ポイズンスパイダーリング', stats: { hp: 170, def: 38, mdef: 36 }, recipe: { price: 8500, materials: [{ id: 'spider_poison_silk', amount: 250 }, { id: 'spider_poison_fang', amount: 150 }, { id: 'spider_poison_venom', amount: 50 }] } },
  { id: 'spider_trapdoor_ring', name: 'トラップドアスパイダーリング', stats: { hp: 180, def: 42, mdef: 40 }, recipe: { price: 9000, materials: [{ id: 'spider_trapdoor_silk', amount: 250 }, { id: 'spider_trapdoor_fang', amount: 150 }, { id: 'spider_trapdoor_venom', amount: 50 }] } },
  { id: 'weaver_web_ring', name: 'ウェブウィーバーリング', stats: { hp: 190, def: 46, mdef: 44 }, recipe: { price: 9500, materials: [{ id: 'weaver_web_silk', amount: 25 }, { id: 'weaver_web_fang', amount: 15 }, { id: 'weaver_web_venom', amount: 5 }] } },
  { id: 'spitter_acid_ring', name: 'アシッドスピッターリング', stats: { hp: 200, def: 50, mdef: 48 }, recipe: { price: 10000, materials: [{ id: 'spitter_acid_silk', amount: 25 }, { id: 'spitter_acid_fang', amount: 15 }, { id: 'spitter_acid_venom', amount: 5 }] } },
  { id: 'arachnid_shadow_ring', name: 'シャドウアラクニドリング', stats: { hp: 210, def: 54, mdef: 52 }, recipe: { price: 10500, materials: [{ id: 'arachnid_shadow_silk', amount: 25 }, { id: 'arachnid_shadow_fang', amount: 15 }, { id: 'arachnid_shadow_venom', amount: 5 }] } },
  { id: 'tick_blood_ring', name: 'ブラッドティックリング', stats: { hp: 220, def: 58, mdef: 56 }, recipe: { price: 11000, materials: [{ id: 'tick_blood_silk', amount: 25 }, { id: 'tick_blood_fang', amount: 15 }, { id: 'tick_blood_venom', amount: 5 }] } },
  { id: 'crawler_bone_ring', name: 'ボーンクロウラーリング', stats: { hp: 230, def: 62, mdef: 60 }, recipe: { price: 11500, materials: [{ id: 'crawler_bone_silk', amount: 25 }, { id: 'crawler_bone_fang', amount: 15 }, { id: 'crawler_bone_venom', amount: 5 }] } },
  { id: 'swarm_spider_ring', name: 'スパイダースウォームリング', stats: { hp: 240, def: 66, mdef: 64 }, recipe: { price: 12000, materials: [{ id: 'swarm_spider_silk', amount: 250 }, { id: 'swarm_spider_fang', amount: 150 }, { id: 'swarm_spider_venom', amount: 50 }] } },
  { id: 'spider_dark_ring', name: 'ダークウィドウリング', stats: { hp: 250, def: 70, mdef: 68 }, recipe: { price: 12500, materials: [{ id: 'spider_dark_silk', amount: 250 }, { id: 'spider_dark_fang', amount: 150 }, { id: 'spider_dark_venom', amount: 50 }] } },
  { id: 'weaver_golden_ring', name: 'ゴールデンウィーバーリング', stats: { hp: 260, def: 75, mdef: 73 }, recipe: { price: 13000, materials: [{ id: 'weaver_golden_silk', amount: 25 }, { id: 'weaver_golden_fang', amount: 15 }, { id: 'weaver_golden_venom', amount: 5 }] } },
  { id: 'arachnid_crystal_ring', name: 'クリスタルアラクニドリング', stats: { hp: 270, def: 80, mdef: 78 }, recipe: { price: 13500, materials: [{ id: 'arachnid_crystal_silk', amount: 25 }, { id: 'arachnid_crystal_fang', amount: 15 }, { id: 'arachnid_crystal_venom', amount: 5 }] } },
  { id: 'boss_broodmother_ring', name: 'ブルードマザーリング', stats: { hp: 300, def: 90, mdef: 88 }, recipe: { price: 15000, materials: [{ id: 'boss_broodmother_silk', amount: 250 }, { id: 'boss_broodmother_fang', amount: 150 }, { id: 'boss_broodmother_venom', amount: 50 }] } },
  { id: 'boss_arachne_ring', name: 'アラクネ・クイーンリング', stats: { hp: 320, def: 100, mdef: 98 }, recipe: { price: 16000, materials: [{ id: 'boss_arachne_silk', amount: 25 }, { id: 'boss_arachne_fang', amount: 15 }, { id: 'boss_arachne_venom', amount: 5 }] } },
  { id: 'boss_deathweaver_ring', name: 'デスウィーバーリング', stats: { hp: 350, def: 110, mdef: 108 }, recipe: { price: 18000, materials: [{ id: 'boss_deathweaver_silk', amount: 25 }, { id: 'boss_deathweaver_fang', amount: 15 }, { id: 'boss_deathweaver_venom', amount: 5 }] } },

  // クリスタルの洞窟
  { id: 'crisp_ring', name: 'クリスプリング', stats: { hp: 400, def: 120, mdef: 120 }, recipe: { price: 20000, materials: [{ id: 'mat_crisp_shard', amount: 20 }, { id: 'mat_crisp_core', amount: 10 }, { id: 'mat_crisp_resonance_crystal', amount: 2 }] } },
  { id: 'geode_amulet', name: 'ジオードアミュレット', stats: { hp: 400, def: 100, mdef: 100 }, recipe: { price: 21000, materials: [{ id: 'mat_geode_shell', amount: 20 }, { id: 'mat_geode_amethyst', amount: 10 }, { id: 'mat_geode_heart', amount: 2 }] } },
  { id: 'snow_frog_amulet', name: '氷精のアミュレット', stats: { hp: 300, matk: 40, mdef: 150 }, recipe: { price: 22000, materials: [{ id: 'mat_snow_crystal', amount: 20 }, { id: 'mat_snow_frog_dust', amount: 10 }, { id: 'mat_snow_frog_spirit', amount: 2 }] } },
  { id: 'crystalinos_charm', name: 'クリスタライノスチャーム', stats: { hp: 450, atk: 40, def: 120 }, recipe: { price: 23000, materials: [{ id: 'mat_crystalinos_horn', amount: 20 }, { id: 'mat_crystalinos_armor', amount: 10 }, { id: 'mat_crystalinos_soul', amount: 2 }] } },
  { id: 'garnet_ring', name: 'ガーネットリング', stats: { hp: 500, atk: 40, spd: 15 }, recipe: { price: 24000, materials: [{ id: 'mat_garnet_fang', amount: 20 }, { id: 'mat_garnet_pelt', amount: 10 }, { id: 'mat_garnet_eye', amount: 2 }] } },
  { id: 'amber_bracelet', name: '琥珀の腕輪', stats: { hp: 600, def: 150, mdef: 100 }, recipe: { price: 25000, materials: [{ id: 'mat_amber_scale', amount: 20 }, { id: 'mat_amber_venom', amount: 10 }, { id: 'mat_amber_fossil', amount: 2 }] } },
  { id: 'beryl_ring', name: 'ベリルリング', stats: { hp: 500, def: 120, mdef: 120 }, recipe: { price: 26000, materials: [{ id: 'mat_beryl_stone', amount: 20 }, { id: 'mat_beryl_core', amount: 10 }, { id: 'mat_beryl_reactor', amount: 2 }] } },
  { id: 'jewel_ring', name: 'ジュエルリング', stats: { hp: 350, atk: 50, spd: 40 }, recipe: { price: 27000, materials: [{ id: 'mat_jewel_wing', amount: 20 }, { id: 'mat_jewel_blade', amount: 10 }, { id: 'mat_jewel_diamond', amount: 2 }] } },
  { id: 'fluorite_charm', name: 'フローライトチャーム', stats: { hp: 450, matk: 60, mdef: 160 }, recipe: { price: 28000, materials: [{ id: 'mat_fluorite_powder', amount: 20 }, { id: 'mat_fluorite_wing', amount: 10 }, { id: 'mat_fluorite_illusion', amount: 2 }] } },
  { id: 'pyrite_ring', name: 'パイライトリング', stats: { hp: 550, atk: 60, def: 140 }, recipe: { price: 29000, materials: [{ id: 'mat_pyrite_scale', amount: 20 }, { id: 'mat_pyrite_fang', amount: 10 }, { id: 'mat_pyrite_fool_gold', amount: 2 }] } },
  { id: 'luminous_ring', name: 'ルミナスリング', stats: { hp: 600, matk: 80, mdef: 150 }, recipe: { price: 32000, materials: [{ id: 'mat_luminous_leaf', amount: 20 }, { id: 'mat_luminous_sap', amount: 10 }, { id: 'mat_luminous_flower', amount: 2 }] } },
  { id: 'opal_pendant', name: 'オパールペンダント', stats: { hp: 700, matk: 80, mdef: 200 }, recipe: { price: 35000, materials: [{ id: 'mat_opal_dust', amount: 20 }, { id: 'mat_opal_fragment', amount: 10 }, { id: 'mat_opal_chaos', amount: 2 }] } },
  { id: 'diamond_ring', name: 'ダイヤモンドリング', stats: { hp: 800, def: 200, mdef: 200 }, recipe: { price: 50000, materials: [{ id: 'mat_diamond_scale', amount: 30 }, { id: 'mat_diamond_claw', amount: 10 }, { id: 'mat_diamond_laser_core', amount: 2 }] } },
  { id: 'regalia_ring', name: 'レガリアリング', stats: { hp: 900, atk: 80, matk: 80 }, recipe: { price: 55000, materials: [{ id: 'mat_regalia_shard', amount: 30 }, { id: 'mat_regalia_crown', amount: 10 }, { id: 'mat_regalia_sword', amount: 2 }] } },
  { id: 'genesis_ring', name: 'ジェネシスリング', stats: { hp: 1200, atk: 100, matk: 100, def: 100, mdef: 100, spd: 30 }, recipe: { price: 80000, materials: [{ id: 'mat_genesis_fragment', amount: 30 }, { id: 'mat_genesis_core', amount: 10 }, { id: 'mat_genesis_light', amount: 5 }] } },

  // 亡霊の廃城
  { id: 'rust_ring', name: '錆びついた指輪', stats: { atk: 50, def: 50 }, recipe: { price: 4000, materials: [{ id: 'mat_rust_armor', amount: 20 }, { id: 'mat_grudge_soul', amount: 5 }] } },
  { id: 'dust_ribbon', name: '塵埃のリボン', stats: { spd: 30, matk: 50 }, recipe: { price: 4200, materials: [{ id: 'mat_dust_cloth', amount: 20 }, { id: 'mat_spider_web', amount: 5 }] } },
  { id: 'blue_flame_pendant', name: '青炎のペンダント', stats: { matk: 60 }, elements: { fire: 20 }, recipe: { price: 4500, materials: [{ id: 'mat_blue_flame', amount: 20 }, { id: 'mat_cursed_glass', amount: 5 }] } },
  { id: 'madness_ring', name: '狂気の指輪', stats: { matk: 100 }, elements: { dark: 20 }, recipe: { price: 4800, materials: [{ id: 'mat_magic_ink', amount: 20 }, { id: 'mat_madness_cover', amount: 5 }] } },
  { id: 'hollow_necklace', name: '虚ろなる首飾り', stats: { hp: 200, mdef: 80 }, recipe: { price: 4600, materials: [{ id: 'mat_hollow_eye', amount: 20 }, { id: 'mat_gold_frame', amount: 5 }] } },
  { id: 'shadow_ring', name: '影の指輪', stats: { atk: 80, spd: 40 }, recipe: { price: 4700, materials: [{ id: 'mat_shadow_fur', amount: 20 }, { id: 'mat_hound_fang', amount: 5 }] } },
  { id: 'plague_amulet', name: '疫病のアミュレット', stats: { hp: 200 }, ailments: { poison: 50 }, recipe: { price: 4000, materials: [{ id: 'mat_plague_blood', amount: 20 }, { id: 'mat_corpse_flesh', amount: 5 }] } },
  { id: 'pure_gold_ring', name: '純金の指輪', stats: { atk: 100, matk: 100, def: 100, mdef: 100 }, recipe: { price: 10000, materials: [{ id: 'mat_pure_gold', amount: 20 }, { id: 'mat_glitter_gem', amount: 5 }] } },
  { id: 'broken_crown_ring', name: '崩れた王冠の指輪', stats: { hp: 1500, atk: 150 }, recipe: { price: 15000, materials: [{ id: 'mat_broken_crown', amount: 20 }, { id: 'mat_king_soul', amount: 5 }] } },
  { id: 'origin_core_ring', name: '災厄の根源リング', stats: { matk: 250 }, elements: { dark: 50 }, recipe: { price: 20000, materials: [{ id: 'mat_origin_core', amount: 20 }, { id: 'mat_forbidden_grimoire', amount: 5 }] } },

  // 精霊の唄う谷
  { id: 'humming_leaf_earring', name: '葉鳴りのピアス', stats: { matk: 280, spd: 140 }, elements: { wind: 20 }, recipe: { price: 190000, materials: [{ id: 'mat_humming_leaf_vein', amount: 40 }, { id: 'mat_wind_song_dew', amount: 10 }] } },
  { id: 'firefly_lantern', name: '蛍のランタン', stats: { matk: 290, spd: 145 }, elements: { light: 20 }, recipe: { price: 195000, materials: [{ id: 'mat_glow_bug_shell', amount: 40 }, { id: 'mat_resonance_phosphorus', amount: 10 }] } },
  { id: 'fairy_choker', name: '妖精のチョーカー', stats: { matk: 300, spd: 150 }, elements: { wind: 20 }, recipe: { price: 200000, materials: [{ id: 'mat_pixie_dust', amount: 40 }, { id: 'mat_breeze_wing', amount: 10 }] } },
  { id: 'singing_seed_pendant', name: '歌う種のペンダント', stats: { matk: 310, spd: 155 }, elements: { grass: 20 }, recipe: { price: 205000, materials: [{ id: 'mat_singing_root', amount: 40 }, { id: 'mat_mandragora_leaf', amount: 10 }] } },
  { id: 'swallow_anklet', name: '燕のアンクレット', stats: { matk: 320, spd: 160 }, elements: { wind: 20 }, recipe: { price: 210000, materials: [{ id: 'mat_bell_feather', amount: 40 }, { id: 'mat_swallow_beak', amount: 10 }] } },
  { id: 'wisp_flame_charm', name: 'ウィスプの灯火', stats: { matk: 330, spd: 165 }, elements: { dark: 20 }, recipe: { price: 215000, materials: [{ id: 'mat_echo_ectoplasm', amount: 40 }, { id: 'mat_wisp_flame', amount: 10 }] } },
  { id: 'dragon_flute_ring', name: '竜笛の指輪', stats: { matk: 340, spd: 170 }, elements: { earth: 20 }, recipe: { price: 220000, materials: [{ id: 'mat_flute_scale', amount: 40 }, { id: 'mat_lizard_throat', amount: 10 }] } },
  { id: 'melody_music_box', name: '旋律のオルゴール', stats: { matk: 350, spd: 175 }, elements: { wind: 20 }, recipe: { price: 225000, materials: [{ id: 'mat_sylph_garment', amount: 40 }, { id: 'mat_melody_orb', amount: 10 }] } },
  { id: 'water_drop_brooch', name: '水滴のブローチ', stats: { matk: 360, spd: 180 }, elements: { water: 20 }, recipe: { price: 230000, materials: [{ id: 'mat_water_chime_jelly', amount: 40 }, { id: 'mat_echo_water', amount: 10 }] } },
  { id: 'kodama_amulet', name: '木魂のお守り', stats: { matk: 370, spd: 185 }, elements: { grass: 20 }, recipe: { price: 235000, materials: [{ id: 'mat_treant_bark', amount: 40 }, { id: 'mat_kodama_branch', amount: 10 }] } },
  { id: 'chanting_feather_ornament', name: '詠唱の羽飾り', stats: { matk: 380, spd: 190 }, elements: { wind: 20 }, recipe: { price: 240000, materials: [{ id: 'mat_griffon_feather', amount: 40 }, { id: 'mat_chanting_beak', amount: 10 }] } },
  { id: 'phantom_voice_hairpin', name: '幻声の髪飾り', stats: { matk: 390, spd: 195 }, elements: { water: 20 }, recipe: { price: 245000, materials: [{ id: 'mat_siren_scale', amount: 40 }, { id: 'mat_phantom_tear', amount: 10 }] } },
  { id: 'resonance_core_charm', name: '共鳴のコア', stats: { matk: 400, spd: 200 }, elements: { earth: 20 }, recipe: { price: 250000, materials: [{ id: 'mat_resonance_stone', amount: 40 }, { id: 'mat_golem_joint', amount: 10 }] } },
  { id: 'harp_dragon_fang', name: 'ハープドラゴンの牙', stats: { matk: 410, spd: 205 }, elements: { wind: 20 }, recipe: { price: 255000, materials: [{ id: 'mat_harp_scale', amount: 40 }, { id: 'mat_gale_fang', amount: 10 }] } },
  { id: 'undine_veil_accessory', name: 'ウンディーネのヴェール', stats: { matk: 420, spd: 210 }, elements: { water: 20 }, recipe: { price: 260000, materials: [{ id: 'mat_requiem_water', amount: 40 }, { id: 'mat_undine_veil', amount: 10 }] } },
  { id: 'white_deer_horseshoe', name: '白鹿の蹄鉄', stats: { matk: 430, spd: 215 }, elements: { light: 20 }, recipe: { price: 265000, materials: [{ id: 'mat_white_deer_fur', amount: 40 }, { id: 'mat_hymn_antler', amount: 10 }] } },
  { id: 'wind_god_talisman', name: '風神の護符', stats: { matk: 440, spd: 220 }, elements: { thunder: 20 }, recipe: { price: 270000, materials: [{ id: 'mat_storm_feather', amount: 40 }, { id: 'mat_thunder_bird_beak', amount: 10 }] } },
  { id: 'knight_vow', name: '騎士の誓い', stats: { matk: 450, spd: 225 }, elements: { dark: 20 }, recipe: { price: 275000, materials: [{ id: 'mat_spirit_knight_armor', amount: 40 }, { id: 'mat_swan_song_blade', amount: 10 }] } },
  { id: 'eternal_dragon_scale', name: '悠久の竜鱗', stats: { matk: 460, spd: 230 }, recipe: { price: 280000, materials: [{ id: 'mat_echo_dragon_scale', amount: 40 }, { id: 'mat_eternal_fang', amount: 10 }] } },
  { id: 'genesis_crown', name: '創世の宝冠', stats: { matk: 470, spd: 235 }, recipe: { price: 285000, materials: [{ id: 'mat_genesis_song_fragment', amount: 40 }, { id: 'mat_creation_tear', amount: 10 }] } }
].map(item => ({ ...item, slot: 'accessory', image: `./assets/accessory/${item.id}.webp` }));
