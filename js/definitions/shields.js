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
  { id: 'wooden_shield', name: '木の盾', stats: { def: 2, mdef: 1 }, elements: {} },
  // スライムの森
  { id: 'slime_blue_shield', name: 'ブルースライムの盾', stats: { def: 3, mdef: 1 }, elements: { water: 5 }, recipe: { price: 500, materials: [{ id: 'slime_blue_fluid', amount: 25 }, { id: 'slime_blue_jelly', amount: 5 }] } },
  { id: 'slime_green_shield', name: 'グリーンスライムの盾', stats: { def: 3, mdef: 5 }, elements: { grass: 20 }, recipe: { price: 2000, materials: [{ id: 'slime_green_fluid', amount: 25 }, { id: 'slime_green_jelly', amount: 5 }] } },
  { id: 'slime_red_shield', name: 'レッドスライムの盾', stats: { def: 7, mdef: 5 }, elements: { fire: 20 }, recipe: { price: 2500, materials: [{ id: 'slime_red_fluid', amount: 25 }, { id: 'slime_red_jelly', amount: 5 }] } },
  { id: 'slime_water_shield', name: 'ウォータースライムの盾', stats: { def: 7, mdef: 9 }, elements: { water: 20 }, recipe: { price: 3000, materials: [{ id: 'slime_water_fluid', amount: 25 }, { id: 'slime_water_jelly', amount: 5 }] } },
  { id: 'slime_fire_shield', name: 'ファイヤースライムの盾', stats: { def: 11, mdef: 9 }, elements: { fire: 20 }, recipe: { price: 3500, materials: [{ id: 'slime_fire_fluid', amount: 25 }, { id: 'slime_fire_jelly', amount: 5 }] } },
  { id: 'slime_ice_shield', name: 'アイススライムの盾', stats: { def: 11, mdef: 13 }, elements: { ice: 20 }, recipe: { price: 4000, materials: [{ id: 'slime_ice_fluid', amount: 25 }, { id: 'slime_ice_jelly', amount: 5 }] } },
  { id: 'slime_wind_shield', name: 'ウインドスライムの盾', stats: { def: 15, mdef: 13 }, elements: { wind: 20 }, recipe: { price: 4500, materials: [{ id: 'slime_wind_fluid', amount: 25 }, { id: 'slime_wind_jelly', amount: 5 }] } },
  { id: 'slime_thunder_shield', name: 'サンダースライムの盾', stats: { def: 15, mdef: 17 }, elements: { thunder: 20 }, recipe: { price: 5000, materials: [{ id: 'slime_thunder_fluid', amount: 25 }, { id: 'slime_thunder_jelly', amount: 5 }] } },
  { id: 'slime_flower_shield', name: 'フラワースライムの盾', stats: { def: 19, mdef: 17 }, elements: { grass: 20 }, recipe: { price: 5500, materials: [{ id: 'slime_flower_fluid', amount: 25 }, { id: 'slime_flower_jelly', amount: 5 }] } },
  { id: 'slime_grass_shield', name: 'グラススライムの盾', stats: { def: 19, mdef: 21 }, elements: { grass: 25 }, recipe: { price: 6000, materials: [{ id: 'slime_grass_fluid', amount: 25 }, { id: 'slime_grass_jelly', amount: 5 }] } },
  { id: 'slime_dark_shield', name: 'ダークスライムの盾', stats: { def: 23, mdef: 21 }, elements: { dark: 25 }, recipe: { price: 6500, materials: [{ id: 'slime_dark_fluid', amount: 25 }, { id: 'slime_dark_jelly', amount: 5 }] } },
  { id: 'slime_earth_shield', name: 'アーススライムの盾', stats: { def: 23, mdef: 25 }, elements: { earth: 20 }, recipe: { price: 7000, materials: [{ id: 'slime_earth_fluid', amount: 25 }, { id: 'slime_earth_jelly', amount: 5 }] } },
  { id: 'slime_king_shield', name: 'キングスライムの盾', stats: { def: 27, mdef: 29 }, elements: { water: 15, grass: 15 }, recipe: { price: 7000, materials: [{ id: 'slime_king_fluid', amount: 25 }, { id: 'slime_king_jelly', amount: 5 }] } },
  { id: 'slime_angel_shield', name: 'エンジェルスライムの盾', stats: { def: 27, mdef: 25 }, elements: { light: 20 }, recipe: { price: 7500, materials: [{ id: 'slime_angel_fluid', amount: 25 }, { id: 'slime_angel_jelly', amount: 5 }] } },
  { id: 'slime_angel_king_shield', name: 'エンジェルキングスライムの盾', stats: { def: 31, mdef: 29 }, elements: { light: 30, dark: 30 }, recipe: { price: 7500, materials: [{ id: 'slime_angel_king_fluid', amount: 25 }, { id: 'slime_angel_king_jelly', amount: 5 }] } },
  { id: 'slime_amethyst_buckler', name: 'アメジストバックラー', stats: { def: 35, mdef: 40 }, elements: { light: 10, dark: 10 }, recipe: { price: 8000, materials: [{ id: 'slime_amethyst_shard', amount: 25 }, { id: 'slime_amethyst_crystal', amount: 5 }] } },
  { id: 'slime_tiger_eye_shield', name: '猛虎の盾', stats: { def: 45, mdef: 30 }, elements: { earth: 10 }, recipe: { price: 8500, materials: [{ id: 'slime_tiger_eye_stone', amount: 25 }, { id: 'slime_tiger_eye_fang', amount: 5 }] } },
  { id: 'slime_king_devil_shield', name: '悪魔王の魔盾', stats: { def: 55, mdef: 55 }, elements: { dark: 20 }, recipe: { price: 10000, materials: [{ id: 'slime_king_devil_horn', amount: 25 }, { id: 'slime_king_devil_wing', amount: 5 }] } },

  // 黄金のスライム島
  { id: 'gold_slime_buckler', name: '黄金のバックラー', stats: { def: 70, hp: 100 }, elements: { light: 10 }, recipe: { price: 100000, materials: [{ id: 'mat_gold_slime_drop', amount: 10 }, { id: 'mat_golden_core', amount: 5 }] } },
  { id: 'gold_king_shield', name: '黄金王の盾', stats: { def: 80, hp: 100 }, elements: { light: 30 }, recipe: { price: 500000, materials: [{ id: 'mat_gold_king_jelly', amount: 10 }, { id: 'mat_royal_gold_core', amount: 5 }] } },
  { id: 'kaiser_gold_aegis', name: '帝王の神聖盾', stats: { def: 100, hp: 100 }, elements: { light: 50 }, recipe: { price: 1000000, materials: [{ id: 'mat_gold_kaiser_fluid', amount: 10 }, { id: 'mat_emperor_gold_core', amount: 5 }] } },

  // 蜘蛛の洞窟
  { id: 'spider_cave_shield', name: 'ケイブスパイダーの盾', stats: { def: 35, mdef: 33 }, elements: {}, recipe: { price: 8000, materials: [{ id: 'spider_cave_venom', amount: 250 }, { id: 'spider_cave_silk', amount: 50 }] } },
  { id: 'spider_poison_shield', name: 'ポイズンスパイダーの盾', stats: { def: 39, mdef: 37 }, elements: {}, recipe: { price: 8500, materials: [{ id: 'spider_poison_venom', amount: 250 }, { id: 'spider_poison_silk', amount: 50 }] } },
  { id: 'spider_trapdoor_shield', name: 'トラップドアスパイダーの盾', stats: { def: 43, mdef: 41 }, elements: {}, recipe: { price: 9000, materials: [{ id: 'spider_trapdoor_venom', amount: 250 }, { id: 'spider_trapdoor_silk', amount: 50 }] } },
  { id: 'weaver_web_shield', name: 'ウェブウィーバーの盾', stats: { def: 47, mdef: 45 }, elements: {}, recipe: { price: 9500, materials: [{ id: 'weaver_web_venom', amount: 25 }, { id: 'weaver_web_silk', amount: 5 }] } },
  { id: 'spitter_acid_shield', name: 'アシッドスピッターの盾', stats: { def: 51, mdef: 49 }, elements: {}, recipe: { price: 10000, materials: [{ id: 'spitter_acid_venom', amount: 25 }, { id: 'spitter_acid_silk', amount: 5 }] } },
  { id: 'arachnid_shadow_shield', name: 'シャドウアラクニドの盾', stats: { def: 55, mdef: 53 }, elements: {}, recipe: { price: 10500, materials: [{ id: 'arachnid_shadow_venom', amount: 25 }, { id: 'arachnid_shadow_silk', amount: 5 }] } },
  { id: 'tick_blood_shield', name: 'ブラッドティックの盾', stats: { def: 59, mdef: 57 }, elements: {}, recipe: { price: 11000, materials: [{ id: 'tick_blood_venom', amount: 25 }, { id: 'tick_blood_silk', amount: 5 }] } },
  { id: 'crawler_bone_shield', name: 'ボーンクロウラーの盾', stats: { def: 63, mdef: 61 }, elements: {}, recipe: { price: 11500, materials: [{ id: 'crawler_bone_venom', amount: 25 }, { id: 'crawler_bone_silk', amount: 5 }] } },
  { id: 'swarm_spider_shield', name: 'スパイダースウォームの盾', stats: { def: 67, mdef: 65 }, elements: {}, recipe: { price: 12000, materials: [{ id: 'swarm_spider_venom', amount: 250 }, { id: 'swarm_spider_silk', amount: 50 }] } },
  { id: 'spider_dark_shield', name: 'ダークウィドウの盾', stats: { def: 71, mdef: 69 }, elements: {}, recipe: { price: 12500, materials: [{ id: 'spider_dark_venom', amount: 250 }, { id: 'spider_dark_silk', amount: 50 }] } },
  { id: 'weaver_golden_shield', name: 'ゴールデンウィーバーの盾', stats: { def: 75, mdef: 73 }, elements: {}, recipe: { price: 13000, materials: [{ id: 'weaver_golden_venom', amount: 25 }, { id: 'weaver_golden_silk', amount: 5 }] } },
  { id: 'arachnid_crystal_shield', name: 'クリスタルアラクニドの盾', stats: { def: 79, mdef: 77 }, elements: {}, recipe: { price: 13500, materials: [{ id: 'arachnid_crystal_venom', amount: 25 }, { id: 'arachnid_crystal_silk', amount: 5 }] } },
  { id: 'boss_broodmother_shield', name: 'ブルードマザーの盾', stats: { def: 90, mdef: 88 }, elements: {}, recipe: { price: 15000, materials: [{ id: 'boss_broodmother_venom', amount: 250 }, { id: 'boss_broodmother_silk', amount: 50 }] } },
  { id: 'boss_arachne_shield', name: 'アラクネ・クイーンの盾', stats: { def: 100, mdef: 98 }, elements: {}, recipe: { price: 16000, materials: [{ id: 'boss_arachne_venom', amount: 25 }, { id: 'boss_arachne_silk', amount: 5 }] } },
  { id: 'boss_deathweaver_shield', name: 'デスウィーバーの盾', stats: { def: 110, mdef: 108 }, recipe: { price: 18000, materials: [{ id: 'boss_deathweaver_venom', amount: 25 }, { id: 'boss_deathweaver_silk', amount: 5 }] } },

  // クリスタルの洞窟
  { id: 'crisp_shield', name: 'クリスプシールド', stats: { def: 100, mdef: 100 }, recipe: { price: 20000, materials: [{ id: 'mat_crisp_shard', amount: 30 }, { id: 'mat_crisp_core', amount: 5 }] } },
  { id: 'geode_shield', name: 'ジオードシールド', stats: { def: 120, mdef: 90 }, recipe: { price: 21000, materials: [{ id: 'mat_geode_amethyst', amount: 30 }, { id: 'mat_geode_heart', amount: 5 }] } },
  { id: 'snow_frog_shield', name: '氷蛙の盾', stats: { def: 90, mdef: 130 }, recipe: { price: 22000, materials: [{ id: 'mat_snow_crystal', amount: 30 }, { id: 'mat_snow_frog_dust', amount: 5 }] } },
  { id: 'crystalinos_shield', name: 'クリスタライノスシールド', stats: { def: 135, mdef: 110 }, recipe: { price: 23000, materials: [{ id: 'mat_crystalinos_horn', amount: 30 }, { id: 'mat_crystalinos_soul', amount: 10 }] } },
  { id: 'garnet_shield', name: 'ガーネットシールド', stats: { def: 120, mdef: 90 }, recipe: { price: 24000, materials: [{ id: 'mat_garnet_fang', amount: 30 }, { id: 'mat_garnet_pelt', amount: 5 }] } },
  { id: 'amber_shield', name: 'アンバーシールド', stats: { def: 130, mdef: 110 }, recipe: { price: 25000, materials: [{ id: 'mat_amber_scale', amount: 30 }, { id: 'mat_amber_venom', amount: 5 }] } },
  { id: 'beryl_shield', name: 'ベリルシールド', stats: { def: 150, mdef: 140 }, recipe: { price: 26000, materials: [{ id: 'mat_beryl_core', amount: 30 }, { id: 'mat_beryl_reactor', amount: 15 }] } },
  { id: 'jewel_shield', name: 'ジュエルシールド', stats: { def: 140, mdef: 120 }, recipe: { price: 27000, materials: [{ id: 'mat_jewel_wing', amount: 30 }, { id: 'mat_jewel_blade', amount: 5 }] } },
  { id: 'fluorite_shield', name: 'フローライトシールド', stats: { def: 100, mdef: 150 }, recipe: { price: 28000, materials: [{ id: 'mat_fluorite_powder', amount: 30 }, { id: 'mat_fluorite_wing', amount: 5 }] } },
  { id: 'pyrite_shield', name: 'パイライトシールド', stats: { def: 130, mdef: 120 }, recipe: { price: 29000, materials: [{ id: 'mat_pyrite_scale', amount: 30 }, { id: 'mat_pyrite_fang', amount: 5 }] } },
  { id: 'luminous_shield', name: '光樹の盾', stats: { def: 120, mdef: 180 }, recipe: { price: 32000, materials: [{ id: 'mat_luminous_leaf', amount: 30 }, { id: 'mat_luminous_sap', amount: 5 }] } },
  { id: 'opal_shield', name: 'オパールの盾', stats: { def: 130, mdef: 190 }, recipe: { price: 35000, materials: [{ id: 'mat_opal_dust', amount: 30 }, { id: 'mat_opal_fragment', amount: 5 }] } },
  { id: 'diamond_shield', name: 'ダイヤモンドシールド', stats: { def: 210, mdef: 200 }, recipe: { price: 50000, materials: [{ id: 'mat_diamond_claw', amount: 40 }, { id: 'mat_diamond_laser_core', amount: 15 }] } },
  { id: 'regalia_shield', name: '王権の盾', stats: { def: 250, mdef: 250 }, recipe: { price: 55000, materials: [{ id: 'mat_regalia_crown', amount: 40 }, { id: 'mat_regalia_sword', amount: 15 }] } },
  { id: 'genesis_shield', name: 'ジェネシスシールド', stats: { def: 200, mdef: 200 }, recipe: { price: 80000, materials: [{ id: 'mat_genesis_fragment', amount: 50 }, { id: 'mat_genesis_core', amount: 10 }] } },

  // 亡霊の廃城
  { id: 'rust_guard_shield', name: '錆びついた近衛盾', stats: { def: 150, mdef: 50 }, recipe: { price: 5000, materials: [{ id: 'mat_rust_armor', amount: 30 }, { id: 'mat_grudge_soul', amount: 5 }] } },
  { id: 'dust_pan_shield', name: 'ダストパンシールド', stats: { def: 80, mdef: 120 }, recipe: { price: 4800, materials: [{ id: 'mat_dust_cloth', amount: 30 }, { id: 'mat_spider_web', amount: 5 }] } },
  { id: 'chandelier_shield', name: 'シャンデリアシールド', stats: { def: 120, mdef: 120 }, elements: { fire: 20 }, recipe: { price: 5200, materials: [{ id: 'mat_cursed_glass', amount: 30 }, { id: 'mat_blue_flame', amount: 5 }] } },
  { id: 'magic_ward_book', name: '魔除けの書', stats: { def: 50, mdef: 200 }, recipe: { price: 5500, materials: [{ id: 'mat_forbidden_page', amount: 30 }, { id: 'mat_magic_ink', amount: 5 }] } },
  { id: 'canvas_shield', name: 'キャンバスシールド', stats: { def: 100, mdef: 150 }, recipe: { price: 5100, materials: [{ id: 'mat_old_canvas', amount: 30 }, { id: 'mat_gold_frame', amount: 5 }] } },
  { id: 'shadow_guard', name: 'シャドウガード', stats: { def: 130, mdef: 100, spd: 10 }, recipe: { price: 5300, materials: [{ id: 'mat_shadow_fur', amount: 30 }, { id: 'mat_hound_fang', amount: 5 }] } },
  { id: 'rat_hide_shield', name: 'ラットハイドシールド', stats: { def: 140, mdef: 80 }, recipe: { price: 4900, materials: [{ id: 'mat_rat_tail', amount: 30 }, { id: 'mat_plague_blood', amount: 5 }] } },
  { id: 'glitter_shield', name: 'グリッターシールド', stats: { def: 250, mdef: 250 }, recipe: { price: 15000, materials: [{ id: 'mat_pure_gold', amount: 30 }, { id: 'mat_glitter_gem', amount: 5 }] } },
  { id: 'imperator_shield', name: 'インペレイターシールド', stats: { def: 300, mdef: 200 }, recipe: { price: 18000, materials: [{ id: 'mat_broken_crown', amount: 30 }, { id: 'mat_king_soul', amount: 5 }] } },
  { id: 'origin_ward', name: 'オリジンウォード', stats: { def: 150, mdef: 350 }, recipe: { price: 20000, materials: [{ id: 'mat_necromancer_robe', amount: 30 }, { id: 'mat_origin_core', amount: 5 }] } },

  // 精霊の唄う谷
  { id: 'leaf_buckler', name: '葉っぱの小盾', stats: { def: 280, hp: 140 }, elements: { wind: 20 }, recipe: { price: 190000, materials: [{ id: 'mat_humming_leaf_vein', amount: 40 }, { id: 'mat_wind_song_dew', amount: 10 }] } },
  { id: 'lamplight_defender', name: '灯火の護り手', stats: { def: 290, hp: 145 }, elements: { light: 20 }, recipe: { price: 195000, materials: [{ id: 'mat_glow_bug_shell', amount: 40 }, { id: 'mat_resonance_phosphorus', amount: 10 }] } },
  { id: 'wind_cutter_shield', name: '風切りの円盾', stats: { def: 300, hp: 150 }, elements: { wind: 20 }, recipe: { price: 200000, materials: [{ id: 'mat_pixie_dust', amount: 40 }, { id: 'mat_breeze_wing', amount: 10 }] } },
  { id: 'bark_round_shield', name: '樹皮のラウンドシールド', stats: { def: 310, hp: 155 }, elements: { grass: 20 }, recipe: { price: 205000, materials: [{ id: 'mat_singing_root', amount: 40 }, { id: 'mat_mandragora_leaf', amount: 10 }] } },
  { id: 'bell_chime_parrying_shield', name: '鈴音のパリィシールド', stats: { def: 320, hp: 160 }, elements: { wind: 20 }, recipe: { price: 210000, materials: [{ id: 'mat_bell_feather', amount: 40 }, { id: 'mat_swallow_beak', amount: 10 }] } },
  { id: 'phantom_shield', name: '幽鬼の盾', stats: { def: 330, hp: 165 }, elements: { dark: 20 }, recipe: { price: 215000, materials: [{ id: 'mat_echo_ectoplasm', amount: 40 }, { id: 'mat_wisp_flame', amount: 10 }] } },
  { id: 'lizard_leather_tower_shield', name: '蜥蜴革のタワーシールド', stats: { def: 340, hp: 170 }, elements: { earth: 20 }, recipe: { price: 220000, materials: [{ id: 'mat_flute_scale', amount: 40 }, { id: 'mat_lizard_throat', amount: 10 }] } },
  { id: 'wind_spirit_ecu', name: '風精のエキュ', stats: { def: 350, hp: 175 }, elements: { wind: 20 }, recipe: { price: 225000, materials: [{ id: 'mat_sylph_garment', amount: 40 }, { id: 'mat_melody_orb', amount: 10 }] } },
  { id: 'flowing_water_buckler', name: '流水のバックラー', stats: { def: 360, hp: 180 }, elements: { water: 20 }, recipe: { price: 230000, materials: [{ id: 'mat_water_chime_jelly', amount: 40 }, { id: 'mat_echo_water', amount: 10 }] } },
  { id: 'great_wood_heavy_shield', name: '大木の重盾', stats: { def: 370, hp: 185 }, elements: { grass: 20 }, recipe: { price: 235000, materials: [{ id: 'mat_treant_bark', amount: 40 }, { id: 'mat_kodama_branch', amount: 10 }] } },
  { id: 'wing_claw_kite_shield', name: '翼爪のカイトシールド', stats: { def: 380, hp: 190 }, elements: { wind: 20 }, recipe: { price: 240000, materials: [{ id: 'mat_griffon_feather', amount: 40 }, { id: 'mat_chanting_beak', amount: 10 }] } },
  { id: 'coral_shield', name: '珊瑚の盾', stats: { def: 390, hp: 195 }, elements: { water: 20 }, recipe: { price: 245000, materials: [{ id: 'mat_siren_scale', amount: 40 }, { id: 'mat_phantom_tear', amount: 10 }] } },
  { id: 'rock_wall_shield', name: '岩石の壁盾', stats: { def: 400, hp: 200 }, elements: { earth: 20 }, recipe: { price: 250000, materials: [{ id: 'mat_resonance_stone', amount: 40 }, { id: 'mat_golem_joint', amount: 10 }] } },
  { id: 'dragon_bone_shield', name: '竜骨の盾', stats: { def: 410, hp: 205 }, elements: { wind: 20 }, recipe: { price: 255000, materials: [{ id: 'mat_harp_scale', amount: 40 }, { id: 'mat_gale_fang', amount: 10 }] } },
  { id: 'teardrop_shield', name: '涙滴の盾', stats: { def: 420, hp: 210 }, elements: { water: 20 }, recipe: { price: 260000, materials: [{ id: 'mat_requiem_water', amount: 40 }, { id: 'mat_undine_veil', amount: 10 }] } },
  { id: 'hymn_divine_shield', name: '聖歌の神盾', stats: { def: 430, hp: 215 }, elements: { light: 20 }, recipe: { price: 265000, materials: [{ id: 'mat_white_deer_fur', amount: 40 }, { id: 'mat_hymn_antler', amount: 10 }] } },
  { id: 'thunder_roar_shield', name: '雷鳴の盾', stats: { def: 440, hp: 220 }, elements: { thunder: 20 }, recipe: { price: 270000, materials: [{ id: 'mat_storm_feather', amount: 40 }, { id: 'mat_thunder_bird_beak', amount: 10 }] } },
  { id: 'swan_song_tower_shield', name: '絶唱のタワーシールド', stats: { def: 450, hp: 225 }, elements: { dark: 20 }, recipe: { price: 275000, materials: [{ id: 'mat_spirit_knight_armor', amount: 40 }, { id: 'mat_swan_song_blade', amount: 10 }] } },
  { id: 'eternal_aegis', name: 'エターナルイージス', stats: { def: 460, hp: 230 }, recipe: { price: 280000, materials: [{ id: 'mat_echo_dragon_scale', amount: 40 }, { id: 'mat_eternal_fang', amount: 10 }] } },
  { id: 'origin_guard', name: 'オリジンガード', stats: { def: 470, hp: 235 }, recipe: { price: 285000, materials: [{ id: 'mat_genesis_song_fragment', amount: 40 }, { id: 'mat_creation_tear', amount: 10 }] } },

].map(item => ({ ...item, slot: 'leftHand', image: `./assets/shield/${item.id}.webp` }));

