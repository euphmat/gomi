/**

 * このファイルは素材やドロップアイテムなど、装備できないアイテムのデータをまとめたファイルです。
 * 
 * 素材・消費アイテムなどのデータ定義ファイル
 * 
 * 装備できないアイテム（モンスターのドロップ品など）を定義します。
 */

export const MATERIALS = [
  { id: 'slime_jelly', name: 'スライムのゼリー', price: 1 },
  { id: 'slime_core', name: 'スライムのコア', price: 10 },
  { id: 'slime_fluid', name: 'スライムの体液', price: 20 },
].map(item => ({ ...item, image: `./assets/material/${item.id}.webp` }));