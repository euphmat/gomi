/**
 * 画面の高さに基づいて、1ページに表示するアイテム数を動的に計算するユーティリティ。
 * 
 * ショップ、倉庫、図鑑、ダンジョン選択などのページ送り機能で使用します。
 */

/**
 * scrollContainer の実際の高さから、ページに収まるアイテム数を計算する。
 * scrollContainer が未マウントの場合は window.innerHeight からの推定にフォールバックする。
 * 
 * @param {Object} options
 * @param {'list'|'grid'} options.viewMode - 表示モード
 * @param {HTMLElement} [options.scrollContainer] - アイテムが描画されるスクロール可能コンテナ
 * @param {number} [options.listItemHeight=64]  - リスト表示時の1行の高さ(px) gap込み
 * @param {number} [options.gridItemHeight=76]  - グリッド表示時の1セルの高さ(px) gap込み
 * @param {number} [options.gridCols=5]         - グリッド表示時の列数
 * @param {number} [options.minItems=3]         - 最低表示数
 * @param {number} [options.maxItems=100]       - 最大表示数
 * @returns {number} 1ページに表示するアイテム数
 */
export function calcItemsPerPage({
  viewMode = 'list',
  scrollContainer = null,
  listItemHeight = 64,
  gridItemHeight = 76,
  gridCols = 5,
  minItems = 3,
  maxItems = 100,
} = {}) {
  // scrollContainer が DOM にマウント済みなら実測値を使う
  let availableHeight;
  let currentGridItemHeight = gridItemHeight;

  if (scrollContainer && scrollContainer.clientHeight > 0) {
    // clientHeight から上下の padding を引いた「正味の高さ」を算出
    const style = window.getComputedStyle(scrollContainer);
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    availableHeight = scrollContainer.clientHeight - paddingTop - paddingBottom;
    
    // グリッド表示の場合、コンテナ幅からアイテムの実高さを正確に計算する (aspect-square想定)
    if (viewMode === 'grid') {
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const availableWidth = scrollContainer.clientWidth - paddingLeft - paddingRight;
      
      // Tailwind gap-1.5 は 6px
      const gap = 6; 
      const itemWidth = (availableWidth - (gap * (gridCols - 1))) / gridCols;
      // セルは正方形 + 下のgap
      currentGridItemHeight = itemWidth + gap;
    }
  } else {
    // フォールバック: window 高さからヘッダー+ナビ+タブ+フィルター+ページネーションを概算で引く
    availableHeight = window.innerHeight - 280;
  }

  if (availableHeight <= 0) availableHeight = 300; // 安全策

  if (viewMode === 'grid') {
    const rows = Math.max(1, Math.floor(availableHeight / currentGridItemHeight));
    const count = rows * gridCols;
    return Math.max(minItems, Math.min(maxItems, count));
  } else {
    const count = Math.max(1, Math.floor(availableHeight / listItemHeight));
    return Math.max(minItems, Math.min(maxItems, count));
  }
}
