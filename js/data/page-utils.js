/**
 * ページング表示を、実際に画面上で使える領域へ合わせるためのユーティリティ。
 */

const toPixels = value => Number.parseFloat(value) || 0;

function getContentSize(element) {
  if (!element || element.clientHeight <= 0) return null;
  const style = window.getComputedStyle(element);
  return {
    height: Math.max(0, element.clientHeight - toPixels(style.paddingTop) - toPixels(style.paddingBottom)),
    width: Math.max(0, element.clientWidth - toPixels(style.paddingLeft) - toPixels(style.paddingRight)),
  };
}

function getGridColumnCount(itemContainer, fallback) {
  if (!itemContainer) return fallback;
  const columns = window.getComputedStyle(itemContainer).gridTemplateColumns;
  if (!columns || columns === 'none') return fallback;
  return Math.max(1, columns.split(/\s+/).filter(Boolean).length);
}

function getMeasuredItemHeight(itemContainer, fallback) {
  if (!itemContainer) return fallback;
  const heights = [...itemContainer.children]
    .filter(element => !element.hidden)
    .map(element => element.getBoundingClientRect().height)
    .filter(height => height > 0);
  return heights.length > 0 ? Math.max(...heights) : fallback;
}

/**
 * コンテナの実測縦幅と、描画済みカードの実寸から1ページの件数を求める。
 * 初回描画前だけ、引数の高さをフォールバックとして使用する。
 */
export function calcItemsPerPage({
  viewMode = 'list',
  scrollContainer = null,
  itemContainer = null,
  listItemHeight = 64,
  gridItemHeight = 76,
  gridCols = 5,
  minItems = 1,
  maxItems = 100,
} = {}) {
  const contentSize = getContentSize(scrollContainer);
  const availableHeight = contentSize?.height || Math.max(1, window.innerHeight - 280);
  const itemStyle = itemContainer ? window.getComputedStyle(itemContainer) : null;
  const rowGap = toPixels(itemStyle?.rowGap || itemStyle?.gap);
  const fallbackHeight = viewMode === 'grid' ? gridItemHeight : listItemHeight;
  let itemHeight = getMeasuredItemHeight(itemContainer, fallbackHeight);
  let columns = 1;

  if (viewMode === 'grid') {
    columns = getGridColumnCount(itemContainer, gridCols);

    // aspect-square のグリッドは、利用可能な横幅から初回でも正確に算出できる。
    if ((!itemContainer?.firstElementChild || itemHeight <= 0) && contentSize?.width) {
      const columnGap = toPixels(itemStyle?.columnGap || itemStyle?.gap) || 6;
      itemHeight = (contentSize.width - columnGap * (columns - 1)) / columns;
    }
  }

  const rows = Math.max(1, Math.floor((availableHeight + rowGap) / Math.max(1, itemHeight + rowGap)));
  const count = rows * columns;
  return Math.max(minItems, Math.min(maxItems, count));
}

/**
 * 画面回転、ウインドウ変更、親レイアウト変更時にページ件数を再計算する。
 * callback は実際の表示領域が変化した時だけ呼ばれる。
 */
export function observePageSize(element, callback) {
  if (!element || typeof callback !== 'function') return () => {};

  let frameId = 0;
  let lastWidth = -1;
  let lastHeight = -1;
  let wasConnected = false;

  const update = () => {
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(() => {
      if (!element.isConnected) {
        if (wasConnected) disconnect();
        return;
      }
      wasConnected = true;
      const width = Math.round(element.getBoundingClientRect().width);
      const height = Math.round(element.getBoundingClientRect().height);
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      callback();
    });
  };

  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
  observer?.observe(element);
  window.addEventListener('resize', update, { passive: true });
  window.visualViewport?.addEventListener('resize', update, { passive: true });

  const disconnect = () => {
    cancelAnimationFrame(frameId);
    observer?.disconnect();
    window.removeEventListener('resize', update);
    window.visualViewport?.removeEventListener('resize', update);
  };

  // DOMへ追加された後の初回実測。
  requestAnimationFrame(() => requestAnimationFrame(update));
  return disconnect;
}
