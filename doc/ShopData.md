/**
 * ====================================================================
 * 【ファイル名】ShopData.js
 * 【役割】街のショップで販売・クラフト（素材から合成）できる商品ラインナップを
 *         定義・管理するファイルです。
 *         初心者でも簡単に新しい商品やクラフトレシピを追加できるように設計されています。
 * 
 * 【連携する主要ファイル】
 *   - js/features/town/ShopRenderer.js   : ショップ画面のUI描画と購入・クラフト処理
 *   - js/features/items/ItemData.js       : 販売される消費アイテムや必要素材の定義元
 *   - js/features/equipment/EquipmentData.js: 販売される装備品の定義元
 * ====================================================================
 * 
 * --------------------------------------------------------------------
 * ■ 新しいショップ商品を追加する手順 (フォーマット)
 * --------------------------------------------------------------------
 * 下記のテンプレートをコピーし、`shopData` 配列の末尾に追加してください。
 * 
 * 【追加テンプレート：通常の販売商品（ゴールドのみ）】
 * ```javascript
 *     { 
 *         itemId:       'potion_small', // [必須] 商品のアイテムIDまたは装備品ID
 *         price:        10,             // [必須] 販売価格（ゴールド）
 *         requirements: {}              // [必須] 空オブジェクトを指定（クラフト素材なし）
 *     },
 * ```
 * 
 * 【追加テンプレート：クラフト商品（ゴールド＋必要素材）】
 * ```javascript
 *     {
 *         itemId: 'slime_sword',        // [必須] 商品のアイテムIDまたは装備品ID
 *         price:  150,                  // [必須] 合成・クラフトに必要な手数料（ゴールド）
 *         requirements: { 
 *             'slime_jelly': 3,         // [任意] 必要素材IDと必要個数（素材は ItemData.js に定義が必要）
 *             'magic_stone': 1 
 *         }
 *     },
 * ```
 */

export const shopData = [
    { itemId: 'potion_small'       , price:   60, requirements: {}                                                                                                                                                                                               },
    { itemId: 'antidote'           , price:   90, requirements: {}                                                                                                                                                                                               },
    { itemId: 'wooden_stick'       , price:   90, requirements: {}                                                                                                                                                                                               },
    { itemId: 'cloth_armor'        , price:  120, requirements: {}                                                                                                                                                                                               },
    { itemId: 'iron_ingot'         , price:  120, requirements: { 'iron_ore'        : 18 }                                                                                                                                                                       },
    { itemId: 'wooden_bow'         , price:  180, requirements: {}                                                                                                                                                                                               },
    { itemId: 'mana_potion'        , price:  240, requirements: { 'blue_jelly'      :  6, 'magic_stone'          :  6 }                                                                                                                                          },
    { itemId: 'power_elixir'       , price:  240, requirements: { 'potion_small'    :  6, 'mutant_dna'           : 12, 'slime_fluid'       : 30 }                                                                                                                 },
    { itemId: 'hyper_potion'       , price:  300, requirements: { 'potion_medium'   : 12, 'slime_fluid'          : 30 }                                                                                                                                          },
    { itemId: 'potion_medium'      , price:  300, requirements: {}                                                                                                                                                                                               },
    { itemId: 'short_sword'        , price:  300, requirements: {}                                                                                                                                                                                               },
    { itemId: 'leather_armor'      , price:  360, requirements: {}                                                                                                                                                                                               },
    { itemId: 'hand_axe'           , price:  480, requirements: {}                                                                                                                                                                                               },
    { itemId: 'mana_potion_large'  , price:  480, requirements: { 'mana_potion'     : 12, 'magic_stone'          : 12, 'pure_fluid'        : 18 }                                                                                                                 },
    { itemId: 'goblin_bow'         , price:  600, requirements: { 'goblin_arrow'    : 18, 'goblin_fang'          : 12 }                                                                                                                                          },
    { itemId: 'slime_buckler'      , price:  600, requirements: { 'wooden_shield'   :  6, 'slime_fluid'          : 60 }                                                                                                                                          },
    { itemId: 'goblin_helmet'      , price:  720, requirements: { 'iron_helm'       :  6, 'goblin_fang'          : 30, 'goblin_rag'        : 30 }                                                                                                                 },
    { itemId: 'goblin_shield'      , price:  720, requirements: { 'goblin_fang'     : 12, 'rotten_cloth'         : 12 }                                                                                                                                          },
    { itemId: 'iron_helm'          , price:  720, requirements: { 'leather_cap'     :  6, 'iron_ingot'           : 12 }                                                                                                                                          },
    { itemId: 'leaf_shield'        , price:  780, requirements: { 'leaf_fragment'   : 18, 'green_jelly'          :  6 }                                                                                                                                          },
    { itemId: 'water_hat'          , price:  840, requirements: { 'water_fragment'  : 18, 'aqua_jelly'           :  6 }                                                                                                                                          },
    { itemId: 'goblin_ring'        , price:  900, requirements: { 'goblin_fang'     : 12, 'magic_stone'          :  6 }                                                                                                                                          },
    { itemId: 'iron_shield'        , price:  900, requirements: { 'wooden_shield'   :  6, 'iron_ingot'           : 12 }                                                                                                                                          },
    { itemId: 'poison_ring'        , price:  900, requirements: { 'poison_fragment' : 12, 'magic_stone'          :  6 }                                                                                                                                          },
    { itemId: 'slime_sword'        , price:  900, requirements: { 'slime_jelly'     : 18 }                                                                                                                                                                       },
    { itemId: 'glowing_ring'       , price:  960, requirements: { 'light_fragment'  : 12, 'magic_stone'          :  6 }                                                                                                                                          },
    { itemId: 'hunter_bow'         , price:  960, requirements: { 'bat_wing'        : 18, 'magic_stone'          :  6 }                                                                                                                                          },
    { itemId: 'wind_boots'         , price: 1080, requirements: { 'wind_fragment'   : 18, 'cyan_jelly'           :  6 }                                                                                                                                          },
    { itemId: 'bat_wing_armor'     , price: 1200, requirements: { 'bat_wing'        : 12, 'rotten_cloth'         :  6 }                                                                                                                                          },
    { itemId: 'poison_bow'         , price: 1200, requirements: { 'poison_fragment' : 18, 'purple_jelly'         : 12 }                                                                                                                                          },
    { itemId: 'poison_dagger'      , price: 1200, requirements: { 'poison_fragment' : 18, 'purple_jelly'         :  6 }                                                                                                                                          },
    { itemId: 'ranger_hood'        , price: 1200, requirements: { 'leather_cap'     :  6, 'sharp_feather'        : 30, 'stealth_fabric'    : 12 }                                                                                                                 },
    { itemId: 'slime_saber'        , price: 1200, requirements: { 'slime_sword'     :  6, 'slime_core'           : 30, 'slime_fluid'       : 30 }                                                                                                                 },
    { itemId: 'flame_blade'        , price: 1320, requirements: { 'fire_fragment'   : 18, 'red_jelly'            :  6 }                                                                                                                                          },
    { itemId: 'forest_bow'         , price: 1320, requirements: { 'leaf_fragment'   : 18, 'wind_fragment'        : 12 }                                                                                                                                          },
    { itemId: 'flame_bow'          , price: 1440, requirements: { 'fire_fragment'   : 18, 'red_jelly'            : 12 }                                                                                                                                          },
    { itemId: 'ice_wand'           , price: 1440, requirements: { 'ice_fragment'    : 18, 'blue_jelly'           :  6 }                                                                                                                                          },
    { itemId: 'goblin_sword'       , price: 1500, requirements: { 'goblin_fang'     : 18, 'bone_fragment'        : 12 }                                                                                                                                          },
    { itemId: 'lucky_talisman'     , price: 1500, requirements: { 'guard_amulet'    :  6, 'lucky_coin'           : 12, 'merchant_pouch'    : 18 }                                                                                                                 },
    { itemId: 'thunder_cloak'      , price: 1560, requirements: { 'thunder_fragment': 24, 'yellow_jelly'         :  6 }                                                                                                                                          },
    { itemId: 'thunder_axe'        , price: 1680, requirements: { 'thunder_fragment': 18, 'yellow_jelly'         :  6 }                                                                                                                                          },
    { itemId: 'elixir'             , price: 1800, requirements: { 'king_jelly'      :  6, 'angel_feather'        :  6, 'dark_matter'       : 6 }                                                                                                                 },
    { itemId: 'goblin_killer_badge', price: 1800, requirements: { 'goblin_ear'      : 60, 'goblin_fang'          : 30 }                                                                                                                                          },
    { itemId: 'knight_greatshield' , price: 1800, requirements: { 'iron_shield'     :  6, 'knight_emblem'        : 12, 'broken_iron_scrap' : 30 }                                                                                                                 },
    { itemId: 'leaf_blade'         , price: 1800, requirements: { 'leaf_core'       : 12, 'leaf_fluid'           : 30, 'iron_ingot'        : 6 }                                                                                                                 },
    { itemId: 'miracle_potion'     , price: 1800, requirements: { 'elixir'          :  6, 'king_jewel'           :  6, 'pure_core'         : 12 }                                                                                                                 },
    { itemId: 'pure_robe'          , price: 1800, requirements: { 'light_fragment'  : 24, 'white_jelly'          :  6 }                                                                                                                                          },
    { itemId: 'shaman_amulet'      , price: 1800, requirements: { 'guard_amulet'    :  6, 'shaman_totem'         : 12, 'cursed_bone'       : 18 }                                                                                                                 },
    { itemId: 'assassin_ring'      , price: 2100, requirements: { 'power_ring'      :  6, 'poison_needle'        : 18, 'assassin_hood'     : 12 }                                                                                                                 },
    { itemId: 'dark_cloak'         , price: 2100, requirements: { 'dark_matter'     :  6, 'purple_jelly'         : 12 }                                                                                                                                          },
    { itemId: 'goblin_plate'       , price: 2100, requirements: { 'chain_mail'      :  6, 'knight_emblem'        : 18, 'broken_iron_scrap' : 30 }                                                                                                                 },
    { itemId: 'poison_whip'        , price: 2100, requirements: { 'poison_core'     : 12, 'poison_fluid'         : 30 }                                                                                                                                          },
    { itemId: 'gale_bow'           , price: 2280, requirements: { 'forest_bow'      :  6, 'wind_core'            : 18, 'wind_fluid'        : 30 }                                                                                                                 },
    { itemId: 'endless_quiver'     , price: 2400, requirements: { 'archer_quiver'   : 12, 'sharp_feather'        : 30 }                                                                                                                                          },
    { itemId: 'lava_greatsword'    , price: 2400, requirements: { 'flame_blade'     :  6, 'fire_core'            : 18, 'magma_fluid'       : 30 }                                                                                                                 },
    { itemId: 'nature_shield'      , price: 2400, requirements: { 'leaf_shield'     :  6, 'leaf_core'            : 18, 'leaf_fluid'        : 30, 'rock_king_jelly' : 6 }                                                                                          },
    { itemId: 'plague_ring'        , price: 2400, requirements: { 'poison_ring'     :  6, 'zombie_flesh'         : 30, 'rusty_nail'        : 30 }                                                                                                                 },
    { itemId: 'glacial_staff'      , price: 2520, requirements: { 'ice_wand'        :  6, 'ice_core'             : 18, 'frost_fluid'       : 30 }                                                                                                                 },
    { itemId: 'angel_bow'          , price: 2700, requirements: { 'angel_feather'   : 12, 'light_fragment'       : 12 }                                                                                                                                          },
    { itemId: 'shadow_slayer'      , price: 2700, requirements: { 'poison_dagger'   :  6, 'shadow_essence'       : 18, 'stealth_fabric'    : 18 }                                                                                                                 },
    { itemId: 'thunder_spear'      , price: 2700, requirements: { 'thunder_core'    : 12, 'thunder_fluid'        : 30, 'iron_ingot'        : 12 }                                                                                                                 },
    { itemId: 'dark_scythe'        , price: 3000, requirements: { 'dark_matter'     : 12, 'poison_fragment'      : 18 }                                                                                                                                          },
    { itemId: 'fire_jewel_ring'    , price: 3000, requirements: { 'power_ring'      :  6, 'fire_king_jewel'      :  6, 'fire_king_jelly'   : 6 }                                                                                                                 },
    { itemId: 'ice_jewel_ring'     , price: 3000, requirements: { 'guard_amulet'    :  6, 'ice_king_jewel'       :  6, 'ice_king_jelly'    : 6 }                                                                                                                 },
    { itemId: 'magic_stone'        , price: 3000, requirements: { 'fire_core'       :  6, 'ice_core'             :  6, 'thunder_core'      :  6, 'water_core'        :  6, 'wind_core'         :  6 }                                                          },
    { itemId: 'mirror_shield'      , price: 3000, requirements: { 'magic_buckler'   :  6, 'pure_core'            : 18, 'bionic_lens'       : 12 }                                                                                                                 },
    { itemId: 'rock_jewel_ring'    , price: 3000, requirements: { 'guard_amulet'    :  6, 'rock_king_jewel'      :  6, 'rock_king_jelly'   : 6 }                                                                                                                 },
    { itemId: 'thunder_jewel_ring' , price: 3000, requirements: { 'magic_ring'      :  6, 'thunder_king_jewel'   :  6, 'thunder_king_jelly': 6 }                                                                                                                 },
    { itemId: 'vampire_cloak'      , price: 3000, requirements: { 'bat_wing_armor'  :  6, 'bat_wing'             : 30, 'sonar_membrane'    : 18, 'bat_fang'        : 30 }                                                                                          },
    { itemId: 'water_jewel_ring'   , price: 3000, requirements: { 'guard_amulet'    :  6, 'water_king_jewel'     :  6, 'water_king_jelly'  : 6 }                                                                                                                 },
    { itemId: 'water_trident'      , price: 3000, requirements: { 'water_core'      : 12, 'water_fluid'          : 30, 'iron_ingot'        : 12 }                                                                                                                 },
    { itemId: 'wind_jewel_ring'    , price: 3000, requirements: { 'magic_ring'      :  6, 'wind_king_jewel'      :  6, 'wind_king_jelly'   : 6 }                                                                                                                 },
    { itemId: 'dark_jewel_ring'    , price: 3600, requirements: { 'power_ring'      :  6, 'dark_king_jewel'      :  6, 'dark_king_jelly'   : 6 }                                                                                                                 },
    { itemId: 'laser_blade'        , price: 3600, requirements: { 'robot_battery'   : 12, 'micro_processor'      : 12, 'thunder_fragment'  : 30 }                                                                                                                 },
    { itemId: 'sage_hat'           , price: 3600, requirements: { 'wizard_hat'      :  6, 'mage_tome'            : 12, 'crystallized_mana' : 30 }                                                                                                                 },
    { itemId: 'flame_king_cloak'   , price: 4800, requirements: { 'cloth_armor'     :  6, 'fire_king_membrane'   : 12, 'fire_king_jelly'   : 12 }                                                                                                                 },
    { itemId: 'guardian_pillar'    , price: 4800, requirements: { 'hand_axe'        :  6, 'gurdian_heart'        :  6, 'runic_stone_slate' : 18 }                                                                                                                 },
    { itemId: 'holy_staff'         , price: 4800, requirements: { 'angel_core'      : 12, 'angel_fluid'          : 30, 'angel_king_jelly'  : 6 }                                                                                                                 },
    { itemId: 'ice_king_cloak'     , price: 4800, requirements: { 'cloth_armor'     :  6, 'ice_king_membrane'    : 12, 'ice_king_jelly'    : 12 }                                                                                                                 },
    { itemId: 'king_sword'         , price: 4800, requirements: { 'king_jelly'      :  6, 'magic_stone'          : 30 }                                                                                                                                          },
    { itemId: 'lich_robe'          , price: 4800, requirements: { 'mage_robe'       :  6, 'ancient_skull'        : 18, 'sturdy_rib'        : 30, 'cursed_bone'     : 30 }                                                                                          },
    { itemId: 'rock_king_cloak'    , price: 4800, requirements: { 'cloth_armor'     :  6, 'rock_king_membrane'   : 12, 'rock_king_jelly'   : 12 }                                                                                                                 },
    { itemId: 'thunder_king_cloak' , price: 4800, requirements: { 'cloth_armor'     :  6, 'thunder_king_membrane': 12, 'thunder_king_jelly': 12 }                                                                                                                 },
    { itemId: 'water_king_cloak'   , price: 4800, requirements: { 'cloth_armor'     :  6, 'water_king_membrane'  : 12, 'water_king_jelly'  : 12 }                                                                                                                 },
    { itemId: 'wind_king_cloak'    , price: 4800, requirements: { 'cloth_armor'     :  6, 'wind_king_membrane'   : 12, 'wind_king_jelly'   : 12 }                                                                                                                 },
    { itemId: 'abyss_scythe'       , price: 5400, requirements: { 'dark_core'       : 12, 'dark_fluid'           : 30, 'dark_king_jelly'   : 6, 'iron_ingot'      : 18 }                                                                                          },
    { itemId: 'guardian_shield'    , price: 6000, requirements: { 'iron_shield'     :  6, 'gurdian_heart'        : 12, 'runic_stone_slate' : 30 }                                                                                                                 },
    { itemId: 'nano_suit'          , price: 6000, requirements: { 'cloth_armor'     :  6, 'robot_battery'        : 18, 'micro_processor'   : 18 }                                                                                                                 },
    { itemId: 'dark_king_cloak'    , price: 7200, requirements: { 'dark_cloak'      :  6, 'dark_king_membrane'   : 12, 'dark_king_jelly'   : 12 }                                                                                                                 },
    { itemId: 'emperor_crown'      , price: 7200, requirements: { 'king_crown'      :  6, 'goblin_king_scepter'  :  6, 'royal_goblin_fur'  : 18 }                                                                                                                 },
    { itemId: 'holy_barrier'       , price: 7200, requirements: { 'guardian_shield' :  6, 'angel_king_membrane'  : 12, 'angel_fluid'       : 30 }                                                                                                                 },
    { itemId: 'grand_emperor_sword', price: 9000, requirements: { 'king_sword'      :  6, 'king_jewel'           :  6, 'angel_king_jewel'  : 6, 'pure_core'       : 30 }                                                                                          },
    { itemId: 'king_cloak'         , price: 9000, requirements: { 'dark_cloak'      :  6, 'king_membrane'        : 12, 'king_jelly'        : 12 }                                                                                                                 },
    { itemId: 'all_cure_elixir'    , price: 12000, requirements: { 'fire_king_jelly' :  6, 'ice_king_jelly'       :  6, 'thunder_king_jelly': 6, 'water_king_jelly': 6, 'wind_king_jelly': 6, 'rock_king_jelly': 6, 'angel_king_jelly': 6, 'dark_king_jelly': 6 } },
    { itemId: 'golem_mail'         , price: 9000, requirements: { 'golem_stone'     : 18, 'armor_plate'          : 12, 'iron_ingot'        : 12 } },
    { itemId: 'hard_drill_lance'   , price: 9000, requirements: { 'drill_bit'       : 18, 'rotation_core'        :  6, 'iron_ingot'        : 18 } },
    { itemId: 'plasma_shield'      , price: 10800, requirements: { 'magnetic_rock'   : 18, 'plasma_tube'          : 12, 'iron_shield'       : 6 } },
    { itemId: 'explosive_axe'      , price: 10800, requirements: { 'explosive_powder': 18, 'heavy_hammer_head'    :  6, 'hand_axe'          : 6 } },
    { itemId: 'angel_crown'        , price: 12000, requirements: { 'holy_stone_feather': 12, 'white_marble'        : 18, 'magic_stone'       : 6 } },
    { itemId: 'seraphim_armor'     , price: 15000, requirements: { 'seraph_wing_stone': 12, 'divine_marble'        : 18, 'angel_feather'     : 12 } },
    { itemId: 'neo_aegis'          , price: 24000, requirements: { 'neo_alloy'       : 18, 'liquid_metal'         : 12, 'knight_shield_fragment': 18 } },
    { itemId: 'cosmic_robe'        , price: 30000, requirements: { 'nebula_fragment' : 18, 'dark_matter_rock'     : 12, 'dark_matter'       : 6 } },
    { itemId: 'stardust_armor'     , price: 48000, requirements: { 'stardust_gear'   : 18, 'nebula_fragment'      : 12, 'dark_matter_rock'  : 12 } },
    { itemId: 'stardust_shield'    , price: 36000, requirements: { 'stardust_gear'   : 12, 'cosmic_core'          :  6, 'dark_matter_rock'  : 6 } },


    { itemId: 'magma_hammer'           , price: 18000, requirements: { 'lava_stone'          : 18, 'heavy_stone_bone'    : 12, 'stone_shell'          : 12, 'guardian_rock'       : 6 } },
    { itemId: 'hellfire_lance'         , price: 21000, requirements: { 'elemental_flame'     : 12, 'salamander_scale'    : 12, 'hellhound_fang'       : 12, 'magma_venom'         : 6 } },
    { itemId: 'cerberus_claw'          , price: 27000, requirements: { 'cerberus_head_bone'  :  6, 'infernal_breath_sac' : 6, 'guardian_hound_chain' : 12, 'defense_breaker_claw': 6 } },
    { itemId: 'lava_demon_blade'       , price: 30000, requirements: { 'magma_heart'         :  6, 'melton_magma_body'   : 6, 'warrior_soul'         : 12, 'triple_action_core'  : 6 } },
    { itemId: 'fire_drake_sword'       , price: 48000, requirements: { 'drake_scale'         : 12, 'dragon_lord_horn'    : 6, 'scorched_tail'        : 12, 'explosive_dust'      : 12 } },
    { itemId: 'apocalypse_blade'       , price: 72000, requirements: { 'apocalypse_core'     :  6, 'hellfire_gland'      : 12, 'rage_blood'           : 18, 'corrupting_saliva'   : 12 } },
    { itemId: 'magma_shield'           , price: 15000, requirements: { 'lava_stone'          : 18, 'hellfire_armor_plate': 12, 'tortoise_meat'        : 12, 'iron_shield'         : 6 } },
    { itemId: 'drake_scale_shield'     , price: 36000, requirements: { 'drake_scale'         : 12, 'flamethrower_gland'  : 12, 'smokescreen_core'     : 6, 'guardian_shield'     : 6 } },
    { itemId: 'lava_helm'              , price: 12000, requirements: { 'lava_stone'          : 12, 'centipede_shell'     : 12, 'heat_resistant_fiber' : 12, 'iron_helm'           : 6 } },
    { itemId: 'drake_helm'             , price: 33000, requirements: { 'drake_scale'         : 12, 'crimson_fang'        : 18, 'vampiric_wing'        : 12, 'neo_alloy'           : 6 } },
    { itemId: 'lava_armor'             , price: 21000, requirements: { 'lava_stone'          : 24, 'hellish_fur'         : 18, 'creeping_leg'         : 12, 'chain_mail'          : 6 } },
    { itemId: 'drake_armor'            , price: 42000, requirements: { 'drake_scale'         : 24, 'fire_lizard_blood'   : 12, 'bat_blood'            : 18, 'dragon_lord_horn'    : 6 } },
    { itemId: 'burn_charm'             , price:  9000, requirements: { 'floating_ember'      : 12, 'fire_wisp_ash'       : 18, 'wisp_core'            : 6, 'magic_stone'         : 6 } },
    { itemId: 'lava_charm'             , price: 18000, requirements: { 'lava_stone'          : 12, 'summoning_ember'     : 12, 'berserker_axe_fragment': 12, 'magic_stone'         : 12 } },
    { itemId: 'magic_reflection_mirror', price: 36000, requirements: { 'magic_reflect_mirror':  6, 'lava_demon_heart'    : 6, 'echo_gem'             : 12, 'blinding_ash'        : 18 } },
    { itemId: 'drake_scale_charm'      , price: 30000, requirements: { 'drake_scale'         : 12, 'ash_cloud_gas'       : 18, 'evasive_breeze'       : 12, 'magic_stone'         : 18 } },

    // --- 新規追加: Club レシピ ---
    { itemId: 'bone_club'              , price:  1080, requirements: { 'bone_fragment'       : 18, 'cursed_bone'         : 6, 'sturdy_rib'           : 6 } },
    { itemId: 'iron_mace'              , price:  1500, requirements: { 'iron_ingot'          : 12, 'broken_iron_scrap'   : 18, 'heavy_pebble'         : 12 } },
    { itemId: 'magma_club'             , price:  4800, requirements: { 'lava_stone'          : 18, 'red_hot_rock'        : 12, 'fire_fragment'        : 30 } },
    { itemId: 'golem_club'             , price:  9000, requirements: { 'golem_stone'         : 30, 'heavy_hammer_head'   : 6, 'sturdy_handle'        : 12 } },
    { itemId: 'cosmic_mace'            , price: 60000, requirements: { 'nebula_fragment'     : 12, 'stardust_gear'       : 12, 'cosmic_core'          : 6 } },

    // --- 新規追加: Bow レシピ ---
    { itemId: 'bone_bow'               , price:  1200, requirements: { 'bone_fragment'       : 12, 'sturdy_rib'          : 12, 'sharp_feather'        : 18 } },
    { itemId: 'iron_bow'               , price:  1680, requirements: { 'iron_ingot'          : 12, 'conductive_wire'     : 12, 'goblin_arrow'         : 30 } },
    { itemId: 'plasma_bow'             , price:  7200, requirements: { 'plasma_tube'         : 12, 'conductive_wire'     : 18, 'thunder_fragment'     : 30 } },
    { itemId: 'golem_bow'              , price:  9600, requirements: { 'golem_stone'         : 18, 'ancient_clay'        : 12, 'conductive_wire'      : 24 } },
    { itemId: 'seraphim_bow'           , price: 48000, requirements: { 'seraph_wing_stone'   :  6, 'holy_stone_feather'  : 18, 'angelic_core'         : 6 } },

    // --- 新規追加: Whip レシピ ---
    { itemId: 'leather_whip'           , price:   900, requirements: { 'bat_wing'            : 18, 'goblin_rag'          : 12, 'stealth_fabric'       : 6 } },
    { itemId: 'chain_whip'             , price:  1680, requirements: { 'iron_ingot'          : 12, 'conductive_wire'     : 12, 'iron_joint'           : 6 } },
    { itemId: 'electric_whip'          , price:  4200, requirements: { 'conductive_wire'     : 24, 'sparking_core'       : 6, 'thunder_fluid'        : 18 } },
    { itemId: 'vine_whip'              , price:  8400, requirements: { 'leaf_fragment'       : 30, 'leaf_fluid'          : 18, 'creeping_leg'         : 18 } },
    { itemId: 'demon_whip'             , price: 27000, requirements: { 'guardian_hound_chain': 12, 'corrupting_saliva'   : 18, 'dark_matter'          : 12 } }
];
