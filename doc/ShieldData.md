/**
 * ====================================================================
 * 【ファイル名】ShieldData.js
 * 【役割】左手スロットに装備可能な「盾・副武器」のマスターデータを管理するファイルです。
 *         初心者でも簡単に新しい盾を追加できるように設計されています。
 * 
 * 【連携する主要ファイル】
 *   - js/features/equipment/EquipmentData.js: 武器や各種防具データを統合して参照するAPIを提供
 *   - js/features/town/ShopData.js         : ショップで販売・作成する装備品の設定
 * ====================================================================
 * 
 * --------------------------------------------------------------------
 * ■ 新しい盾を追加する手順 (フォーマット)
 * --------------------------------------------------------------------
 * 下記のテンプレートをコピーし、`shieldData` 配列の末尾に追加してください。
 * 
 * 【追加テンプレート】
 * ```javascript
 * {
 *     id:      'my_new_shield',    // [必須] 一意のID（英語、他と重複不可、スペースなし）
 *     name:    '新規の盾',         // [必須] ゲーム内に表示される名前
 *     pAtk:    0,                  // [必須] 物理攻撃力ボーナス（0以上の整数。不要なら0）
 *     pDef:    8,                  // [必須] 物理防御力ボーナス（0以上の整数。不要なら0）
 *     mAtk:    0,                  // [必須] 魔法攻撃力ボーナス（マイナス値で魔法攻撃力低下ペナルティ）
 *     mDef:    4,                  // [必須] 魔法防御力ボーナス（マイナス値で魔法防御力低下ペナルティ）
 *     spd:     -1,                 // [任意] 敏捷性ボーナス（マイナス値で素早さ低下、プラス値で素早さ上昇）
 *     element: 'none',             // [任意] 装備属性（必要に応じて指定）
 *     // [必須] 装備の画像名（例: 'wooden_shield.webp' 等。画像がない場合は適当な既存画像を指定）
 * }
 * ```
 */

export const shieldData = [
    { id: 'wooden_shield'      , name: '木の盾'            , pAtk: 0, pDef: 3 , mAtk: 0  , mDef: 1  , spd: 0 , element: 'none'    },
    { id: 'goblin_shield'      , name: 'ゴブリンの盾'      , pAtk: 0, pDef: 5 , mAtk: 0  , mDef: 1  , spd: 0 , element: 'none'    },
    { id: 'leaf_shield'        , name: '葉っぱの盾'        , pAtk: 0, pDef: 4 , mAtk: 0  , mDef: 3  , spd: 0 , element: 'earth'   },
    { id: 'magic_buckler'      , name: '魔法のバックラー'  , pAtk: 0, pDef: 2 , mAtk: 0  , mDef: 5  , spd: 0 , element: 'none'    },
    { id: 'iron_shield'        , name: '鉄の盾'            , pAtk: 0, pDef: 6 , mAtk: -2 , mDef: -2 , spd: -2, element: 'none'    },
    { id: 'slime_buckler'      , name: 'スライムバックラー', pAtk: 0, pDef: 8 , mAtk: 0  , mDef: 5  , spd: 0 , element: 'none'    },
    { id: 'knight_greatshield' , name: '騎士の大盾'        , pAtk: 0, pDef: 16, mAtk: -5 , mDef: -5 , spd: -3, element: 'none'    },
    { id: 'nature_shield'      , name: '大自然の盾'        , pAtk: 0, pDef: 12, mAtk: 0  , mDef: 15 , spd: -2, element: 'earth'   },
    { id: 'mirror_shield'      , name: 'ミラーシールド'    , pAtk: 0, pDef: 15, mAtk: 0  , mDef: 25 , spd: -1, element: 'none'    },
    { id: 'water_king_shield'  , name: '水王の盾'          , pAtk: 0, pDef: 25, mAtk: 0  , mDef: 25 , spd: 0 , element: 'water'   },
    { id: 'guardian_shield'    , name: '守護者の大盾'      , pAtk: 0, pDef: 35, mAtk: -10, mDef: -10, spd: -4, element: 'earth'   },
    { id: 'holy_barrier'       , name: 'ホーリーバリア'    , pAtk: 0, pDef: 30, mAtk: 0  , mDef: 40 , spd: -1, element: 'light'   },
    { id: 'poison_golem_shield', name: '猛毒のゴーレム盾'  , pAtk: 0, pDef: 35, mAtk: 15 , mDef: 25 , spd: -2, element: 'dark'    },
    { id: 'plasma_shield'      , name: 'プラズマシールド'  , pAtk: 0, pDef: 45, mAtk: 25 , mDef: 35 , spd: -1, element: 'thunder' },
    { id: 'neo_aegis'          , name: 'ネオ・イージス'    , pAtk: 0, pDef: 80, mAtk: 0  , mDef: 70 , spd: -3, element: 'none'    },
    { id: 'stardust_shield'    , name: 'スターダストシールド', pAtk: 0, pDef: 150, mAtk: 0  , mDef: 140, spd: 0 , element: 'dark'    },
    { id: 'seraphim_shield'    , name: 'セラフィムシールド', pAtk: 0, pDef: 90 , mAtk: 20 , mDef: 100, spd: -1 , element: 'light'   },
    { id: 'magma_shield'       , name: 'マグマシールド'    , pAtk: 0, pDef: 200, mAtk: 0  , mDef: 150, spd: 0 , element: 'fire'    },
    { id: 'drake_scale_shield' , name: '竜鱗の盾'          , pAtk: 0, pDef: 300, mAtk: 0  , mDef: 250, spd: 0 , element: 'fire'    },
    { id: 'stone_tortoise_shield', name: '岩亀の甲羅盾'    , pAtk: 0, pDef: 120, mAtk: 0  , mDef: 50 , spd: -10, element: 'earth'   }
];
