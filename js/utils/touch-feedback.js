const INTERACTIVE_SELECTOR = [
  'button:not(:disabled)',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="tab"]:not([aria-disabled="true"])',
  'a[href]',
  '[onclick]',
  '.cursor-pointer',
].join(',');

let initialized = false;
let pressedElement = null;
let releasedElement = null;
let releaseTimer = 0;

function clearPressedElement() {
  window.clearTimeout(releaseTimer);
  pressedElement?.classList.remove('touch-pressed');
  releasedElement?.classList.remove('touch-pressed');
  pressedElement = null;
  releasedElement = null;
  releaseTimer = 0;
}

function releasePressedElement() {
  if (!pressedElement) return;

  window.clearTimeout(releaseTimer);
  releasedElement?.classList.remove('touch-pressed');
  releasedElement = pressedElement;
  pressedElement = null;

  // A very quick tap can otherwise begin and end between paint frames.
  // Hold the visual confirmation briefly after release without delaying click.
  releaseTimer = window.setTimeout(() => {
    releasedElement?.classList.remove('touch-pressed');
    releasedElement = null;
    releaseTimer = 0;
  }, 70);
}

/**
 * Makes tap feedback consistent for controls created after initial render.
 * Pointer events cover touch, pen, and mouse without duplicate touch events.
 */
export function initTouchFeedback() {
  if (initialized) return;
  initialized = true;

  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const target = event.target instanceof Element
      ? event.target.closest(INTERACTIVE_SELECTOR)
      : null;
    if (!target || target.matches(':disabled') || target.getAttribute('aria-disabled') === 'true') return;

    clearPressedElement();
    pressedElement = target;
    target.classList.add('touch-pressed');
  }, { passive: true });

  document.addEventListener('pointerup', releasePressedElement, { passive: true });
  document.addEventListener('pointercancel', clearPressedElement, { passive: true });
  document.addEventListener('dragstart', clearPressedElement, { passive: true });
  document.addEventListener('contextmenu', clearPressedElement, { passive: true });
  document.addEventListener('scroll', clearPressedElement, { capture: true, passive: true });
  window.addEventListener('blur', clearPressedElement);
}
