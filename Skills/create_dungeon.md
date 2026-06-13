#　ダンジョンの実装

## ステップ 0. ダンジョンの作成とフラグの管理
- 実装するダンジョンの id : crystal_cave
- 実装するダンジョンのロックを解除するには、最新のダンジョン名を取得し、そのダンジョンをクリアした際にロックが解除されるようロジックを実装してください。

## ステップ 1. モンスターのステータス実装
以下のテンプレートを使用して、js/definitions/monsters.js 内にモンスターを実装してください。

### List of Monster IDs
#### 雑魚敵（10体）
- クリスプ（Crisp） 特徴: 水晶の小さなトゲを持つスライム状の魔物。突っつくとパキパキと音がする。
- ジオードタートル（Geode Turtle） 特徴: 甲羅の内側が紫水晶（アメジスト）の晶洞（ジオード）になっている、動きの鈍いカメ。
- スノウフロッグ（Snow Flare） 特徴: 雪の結晶に似た氷結晶の体を持つ、寒冷地に現れる小さな元素精霊。
- クリスタライノス（Crystalinos） 特徴: 全身が強固な水晶の装甲で覆われたサイ。突進は岩をも粉砕する。
- ガーネットウルフ（Garnet Wolf） 特徴: 柘榴石（ガーネット）の瞳と牙を持つ孤高の狼。群れを率いて旅人を襲う。

- アンバーレックス（Amber Rex） 特徴: 琥珀（アンバー）の中に古代の昆虫や毒を内包した、トカゲ型の捕食者。
- ベリル・ゴーレム（Beryl Golem） 特徴: 緑柱石（ベリル）の巨塊で組み上げられた遺跡の守護者。物理防御が非常に高い。
- ジュエル・マンティス（Jewel Mantis） 特徴: カマの部分が鋭利なダイヤモンドの刃になっている、美しいカマキリ。
- フローライト・パピヨン（Fluorite Papillon） 特徴: 蛍石（フローライト）の粉を振りまく巨大な蝶。幻覚や眠りを誘う。
- パイライト・サーペント（Pyrite Serpent） 特徴: 愚者の黄金と呼ばれる黄鉄鉱（パイライト）の鱗を持つ、金属質の結晶蛇。

#### レア敵（2 体）
- ルミナス・ジギタリス（Luminous Digitalis） 特徴: 植物の形をした結晶生命体。世界の魔力を吸い上げ、光の奔流に変えて放つ。
- ノーブル・オパール（Noble Opal） 特徴: 見る角度によって色を変える、遊色効果（プレイ・オブ・カラー）を持つカオスな精霊。

#### ボス（2 体）
- ダイヤモンド・ディザスター（Diamond Disaster） 特徴: 絶対的な硬度と、光を極大レーザーへと収束させて放つ最強の結晶竜。
- ハルモニア・レガリア（Harmonia Regalia） 特徴: 王権（レガリア）を模した結晶の剣や王冠が意思を持った、神の兵器。

#### レアボス（1 体）
- ジェネシス・プリズム（Genesis Prism） 特徴: 世界の始まりの光を内包する立方体の超存在。全ての属性魔法を無効化する。

### テンプレート
```js:template example
{
  id: 'slime', name: 'Slime',
  stats:    { hp: 0, mp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
  // Set the element based on the one associated with the monster's name. If no element comes to mind, leave it blank.
  elements: { fire: 0, water: 0, grass: 0, ice: 0, thunder: 0, wind: 0, earth: 0, light: 0, dark: 0 },
  // If the monster appears likely to use status ailment attacks, set a status ailment value as well. If no such association exists, leave it blank.
  ailments: { poison: 0, burn: 0, paralysis: 0, sleep: 0, confusion: 0, curse: 0, blind: 0, silence: 0 },
  rewards:  { exp: 0, jp: 0,  gold: 0 },
  // Must set 3 items. Implement low-probability to ultra-low-probability drop items. (3 materials)
  drops: [
    { itemId: 'item_name', rate: 5 },
    { itemId: 'rare_item_name', rate: 1 },
    { itemId: 'super_rare_item_name', rate: 0.1 },
  ],
  // Set the skills the monster is likely to use.
  actions: [ { name: 'Body Slam', chance: 10, execute: (attacker, defender, battle) => { battle.executeAttack(attacker, defender, false, { actionName: 'Body Slam', damageMultiplier: 2 }); } } ]
    }
```

## 3. ドロップする素材アイテムの実装
上記で設定したモンスターがドロップする素材アイテムとを実装してください。
重要 1：この段階では、アイテムの画像を準備しないでください。
重要 2：単調な素材ではなく、モンスターごとに、そのモンスターがドロップしそうな素材を連想すること。
- js/definitions/materials.js

## 3. ドロップした素材で作成できる装備アイテムの実装
上記で設定したモンスターがドロップする素材アイテムとを実装してください。
重要 1：この段階では、アイテムの画像を準備しないでください。
重要 2：同じような武器ではなく、そのモンスターをテーマとして、多種多様な武器を設定すること。
- js/definitions/accessories.js
- js/definitions/armors.js
- js/definitions/shields.js
- js/definitions/weapons.js

## 4. 武器アイテムのスキル実装
作成した装備アイテムに対して、スキルを実装してください。
- js/definitions/weapons.js

重要 ：同じようなスキルの使い回しは避けること。多種多様な効果とする。