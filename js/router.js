/**

 * このファイルは画面の切り替え（ルーティング）を担当するファイルです。
 * アドレス（URL）が変わった時に、どの画面（ステータスやお店など）を表示するかを管理しています。
 *
 * Hash-based SPA Router
 * 
 * Usage:
 *   const router = new Router(document.getElementById('content'));
 *   router.register('/status', renderStatusPage);
 *   router.start();
 */
export class Router {
  constructor(contentElement) {
    /** @type {Map<string, () => string | HTMLElement>} */
    this.routes = new Map();
    this.contentEl = contentElement;
    this.currentRoute = null;

    window.addEventListener('hashchange', () => this.handleRoute());
  }

  /**
   * Register a route with its render function.
   * @param {string} path - Route path (e.g., '/status')
   * @param {() => string | HTMLElement} renderFn - Function that returns HTML string or DOM element
   * @returns {Router} this (for chaining)
   */
  register(path, renderFn) {
    this.routes.set(path, renderFn);
    return this;
  }

  /**
   * Navigate to a path by updating the hash.
   * @param {string} path
   */
  navigate(path) {
    window.location.hash = path;
  }

  /**
   * Get current route path from hash.
   * @returns {string}
   */
  getCurrentRoute() {
    const route = window.location.hash.slice(1) || '/status';
    return route.split('?')[0];
  }

  /**
   * Handle route change - renders the matching page.
   */
  handleRoute() {
    const routeKey = window.location.hash.slice(1) || '/status';
    const path = this.getCurrentRoute();
    if (routeKey === this.currentRoute) return;

    const cleanupPromise = Promise.all(Array.from(this.contentEl.children).map(element => {
      if (typeof element.cleanup !== 'function') return Promise.resolve();
      return Promise.resolve(element.cleanup()).catch(error => {
        console.error('[Router] Error cleaning up outgoing route:', error);
      });
    }));

    this.currentRoute = routeKey;
    const renderFn = this.routes.get(path);

    if (renderFn) {
      // Smooth Fade-out transition
      this.contentEl.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
      this.contentEl.style.opacity = '0';
      this.contentEl.style.transform = 'translateY(4px) scale(0.99)';

      setTimeout(async () => {
        await cleanupPromise;
        if (this.currentRoute !== routeKey) return;
        this.contentEl.innerHTML = '';
        let content = renderFn();

        // Handle async render functions (Promise)
        if (content instanceof Promise) {
          content.then(resolvedContent => {
            if (this.currentRoute !== routeKey) return;
            if (typeof resolvedContent === 'string') {
              this.contentEl.innerHTML = resolvedContent;
            } else if (resolvedContent instanceof HTMLElement) {
              this.contentEl.appendChild(resolvedContent);
            }
            
            // Smooth Fade-in transition
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                this.contentEl.style.opacity = '1';
                this.contentEl.style.transform = 'translateY(0) scale(1)';
              });
            });
          }).catch(err => {
            console.error('[Router] Error rendering async route:', err);
            this.contentEl.innerHTML = '<div class="p-4 text-red-500">Error loading page</div>';
            this.contentEl.style.opacity = '1';
            this.contentEl.style.transform = 'translateY(0) scale(1)';
          });
        } else {
          // Synchronous handling
          if (typeof content === 'string') {
            this.contentEl.innerHTML = content;
          } else if (content instanceof HTMLElement) {
            this.contentEl.appendChild(content);
          }

          // Smooth Fade-in transition
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              this.contentEl.style.opacity = '1';
              this.contentEl.style.transform = 'translateY(0) scale(1)';
            });
          });
        }
      }, 200);
    }

    // Dispatch custom event for other components (e.g., nav bar)
    window.dispatchEvent(new CustomEvent('routechange', { detail: { path } }));
  }

  /**
   * Re-render the active route without changing its URL. This is used for
   * display-only preferences such as number notation.
   */
  refresh() {
    this.currentRoute = null;
    this.handleRoute();
  }

  /**
   * Start the router. Navigates to default route if no hash is set.
   */
  start() {
    if (!window.location.hash) {
      window.location.hash = '/status';
    } else {
      this.handleRoute();
    }
  }
}
