/**

 * このファイルは素材やドロップアイテムなど、装備できないアイテムのデータをまとめたファイルです。
 * 
 * 素材・消費アイテムなどのデータ定義ファイル
 * 
 * 装備できないアイテム（モンスターのドロップ品など）を定義します。
 */

export const MATERIALS = [
  {
    id: 'slime_jelly',
    name: 'スライムのゼリー',
    image: './assets/material/slime_jelly.webp',
    // 素材なので stats（ステータス変化）や slot（装備場所）はありません。
    price: 5,   // 売却時の価値などのために値段を設定
  },
  {
    id: 'goblin_fang',
    name: 'ゴブリンの牙',
    image: './assets/material/goblin_fang.webp',
    price: 12,
  }
  // ↓ 新しい素材アイテムを追加する場合はここから下にコピー＆ペーストしてください
  
];
