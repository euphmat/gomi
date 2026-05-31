/**
 * ====================================================================
 * 【ファイル名】BodyData.js
 * 【役割】体スロットに装備可能な「体装備（鎧・服）」のマスターデータを管理するファイルです。
 *         初心者でも簡単に新しい体装備を追加できるように設計されています。
 * 
 * 【連携する主要ファイル】
 *   - js/features/equipment/EquipmentData.js: 武器や各種防具データを統合して参照するAPIを提供
 *   - js/features/town/ShopData.js         : ショップで販売・作成する装備品の設定
 * ====================================================================
 * 
 * --------------------------------------------------------------------
 * ■ 新しい体装備を追加する手順 (フォーマット)
 * --------------------------------------------------------------------
 * 下記のテンプレートをコピーし、`bodyData` 配列の末尾に追加してください。
 * 
 * 【追加テンプレート】
 * ```javascript
 * {
 *     id:      'my_new_armor',     // [必須] 一意のID（英語、他と重複不可、スペースなし）
 *     name:    '新規の鎧',         // [必須] ゲーム内に表示される名前
 *     pAtk:    0,                  // [必須] 物理攻撃力ボーナス（0以上の整数。不要なら0）
 *     pDef:    15,                 // [必須] 物理防御力ボーナス（0以上の整数。不要なら0）
 *     mAtk:    0,                  // [必須] 魔法攻撃力ボーナス（マイナス値で魔法攻撃力低下ペナルティ）
 *     mDef:    5,                  // [必須] 魔法防御力ボーナス（マイナス値で魔法防御力低下ペナルティ）
 *     spd:     -2,                 // [任意] 敏捷性ボーナス（マイナス値で素早さ低下、プラス値で素早さ上昇）
 *     element: 'none',             // [任意] 装備属性（必要に応じて指定）
 *     // [必須] 装備の画像名（例: 'cloth_armor.webp' 等。画像がない場合は適当な既存画像を指定）
 * }
 * ```
 */

export const bodyData = [
    { id: 'cloth_armor'         , name: '布の服'              , pAtk: 0 , pDef: 2 , mAtk: 0  , mDef: 1  , spd: 0  , element: 'none'    },
    { id: 'leather_armor'       , name: '革の鎧'              , pAtk: 0 , pDef: 5 , mAtk: 0  , mDef: 2  , spd: 0  , element: 'none'    },
    { id: 'bat_wing_armor'      , name: 'コウモリの鎧'        , pAtk: 0 , pDef: 7 , mAtk: 0  , mDef: 3  , spd: 2  , element: 'none'    },
    { id: 'mage_robe'           , name: '魔導士のローブ'      , pAtk: 0 , pDef: 2 , mAtk: 4  , mDef: 6  , spd: 0  , element: 'none'    },
    { id: 'chain_mail'          , name: 'チェインメイル'      , pAtk: 0 , pDef: 8 , mAtk: -2 , mDef: -2 , spd: -3 , element: 'none'    },
    { id: 'pure_robe'           , name: '純白のローブ'        , pAtk: 0 , pDef: 3 , mAtk: 6  , mDef: 8  , spd: 0  , element: 'none'    },
    { id: 'thunder_cloak'       , name: '雷電の外套'          , pAtk: 0 , pDef: 6 , mAtk: 0  , mDef: 8  , spd: 3  , element: 'thunder' },
    { id: 'goblin_plate'        , name: 'ゴブリンの重鎧'      , pAtk: 0 , pDef: 14, mAtk: -5 , mDef: -5 , spd: -3 , element: 'none'    },
    { id: 'dark_cloak'          , name: '漆黒の外套'          , pAtk: 0 , pDef: 5 , mAtk: 10 , mDef: 5  , spd: 5  , element: 'none'    },
    { id: 'vampire_cloak'       , name: '吸血鬼の外套'        , pAtk: 0 , pDef: 8 , mAtk: 8  , mDef: 12 , spd: 4  , element: 'none'    },
    { id: 'ice_king_cloak'      , name: '氷結王の大外套'      , pAtk: 0 , pDef: 20, mAtk: 0  , mDef: 20 , spd: 2  , element: 'ice'     },
    { id: 'thunder_king_cloak'  , name: '雷電王の大外套'      , pAtk: 0 , pDef: 12, mAtk: 0  , mDef: 15 , spd: 15 , element: 'thunder' },
    { id: 'flame_king_cloak'    , name: '炎王の大外套'        , pAtk: 0 , pDef: 15, mAtk: 0  , mDef: 25 , spd: 5  , element: 'fire'    },
    { id: 'nano_suit'           , name: 'ナノスーツ'          , pAtk: 0 , pDef: 22, mAtk: 0  , mDef: 15 , spd: 8  , element: 'thunder' },
    { id: 'wind_king_cloak'     , name: '疾風王の大外套'      , pAtk: 0 , pDef: 10, mAtk: 0  , mDef: 10 , spd: 25 , element: 'wind'    },
    { id: 'lich_robe'           , name: '死霊術師のローブ'    , pAtk: 0 , pDef: 6 , mAtk: 20 , mDef: 20 , spd: -1 , element: 'none'    },
    { id: 'water_king_cloak'    , name: '水流王の大外套'      , pAtk: 0 , pDef: 18, mAtk: 0  , mDef: 25 , spd: 5  , element: 'water'   },
    { id: 'rock_king_armor'     , name: '岩王の鎧'            , pAtk: 0 , pDef: 35, mAtk: -10, mDef: -10, spd: -5 , element: 'earth'   },
    { id: 'rock_king_cloak'     , name: '剛岩王の大外套'      , pAtk: 0 , pDef: 40, mAtk: 0  , mDef: 10 , spd: -10, element: 'earth'   },
    { id: 'dark_king_cloak'     , name: '常闇王の大外套'      , pAtk: 5 , pDef: 15, mAtk: 20 , mDef: 15 , spd: 10 , element: 'dark'    },
    { id: 'king_cloak'          , name: '真王の外套'          , pAtk: 10, pDef: 30, mAtk: 10 , mDef: 30 , spd: 5  , element: 'none'    },
    { id: 'knight_golem_armor'  , name: '騎士ゴーレムの鎧'    , pAtk: 0 , pDef: 50, mAtk: -20, mDef: -20, spd: -5 , element: 'none'    },
    { id: 'golem_mail'          , name: 'ゴーレムメイル'      , pAtk: 0 , pDef: 65, mAtk: -25, mDef: -25, spd: -6 , element: 'earth'   },
    { id: 'seraphim_armor'      , name: 'セラフィムの聖鎧'    , pAtk: 0 , pDef: 70, mAtk: 0  , mDef: 55 , spd: 0  , element: 'light'   },
    { id: 'cosmic_robe'         , name: 'コズミックローブ'    , pAtk: 0 , pDef: 50, mAtk: 65 , mDef: 70 , spd: 10 , element: 'dark'    },
    { id: 'dark_slime_cloak'    , name: '闇のスライムマント'  , pAtk: 0 , pDef: 24, mAtk: 0  , mDef: 6  , spd: 0  , element: 'none'    },
    { id: 'flame_king_mantle'   , name: '炎王のゲルマント'    , pAtk: 0 , pDef: 39, mAtk: 0  , mDef: 18 , spd: 0  , element: 'none'    },
    { id: 'water_king_armor'    , name: '水王のゲルアーマー'  , pAtk: 0 , pDef: 45, mAtk: 0  , mDef: 24 , spd: 0  , element: 'none'    },
    { id: 'rock_king_plate'     , name: '岩王のゲルプレート'  , pAtk: 0 , pDef: 63, mAtk: 0  , mDef: 36 , spd: 0  , element: 'none'    },
    { id: 'dark_king_robe'      , name: '闇王のゲルローブ'    , pAtk: 0 , pDef: 45, mAtk: 0  , mDef: 24 , spd: 0  , element: 'none'    },
    { id: 'goblin_knight_mail'  , name: 'ゴブリンナイトメイル', pAtk: 0 , pDef: 57, mAtk: 0  , mDef: 33 , spd: 0  , element: 'none'    },
    { id: 'goblin_king_armor'   , name: 'ゴブリン王の覇装'    , pAtk: 0 , pDef: 45, mAtk: 0  , mDef: 24 , spd: 0  , element: 'none'    },
    { id: 'skeleton_breastplate', name: 'スケルトンの胸当て'  , pAtk: 0 , pDef: 36, mAtk: 0  , mDef: 15 , spd: 0  , element: 'none'    },
    { id: 'guardian_stone_armor', name: '守護石の重鎧'        , pAtk: 0 , pDef: 75, mAtk: 0  , mDef: 48 , spd: 0  , element: 'none'    },
    { id: 'stardust_armor'      , name: 'スターダストアーマー', pAtk: 0 , pDef: 220, mAtk: 0  , mDef: 220, spd: 0  , element: 'dark'    },
    { id: 'lava_armor'          , name: 'ラーヴァアーマー'    , pAtk: 0 , pDef: 300, mAtk: 0  , mDef: 200, spd: 0  , element: 'fire'    },
    { id: 'drake_armor'         , name: '竜鱗の鎧'            , pAtk: 0 , pDef: 450, mAtk: 0  , mDef: 350, spd: 0  , element: 'fire'    },
    { id: 'ash_cloud_cloak'     , name: '灰雲の外套'          , pAtk: 0 , pDef: 50 , mAtk: 50 , mDef: 50 , spd: 50 , element: 'wind'    }
];
