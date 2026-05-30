/**
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
    return window.location.hash.slice(1) || '/status';
  }

  /**
   * Handle route change - renders the matching page.
   */
  handleRoute() {
    const path = this.getCurrentRoute();
    if (path === this.currentRoute) return;

    this.currentRoute = path;
    const renderFn = this.routes.get(path);

    if (renderFn) {
      // Fade-out transition
      this.contentEl.style.opacity = '0';
      this.contentEl.style.transform = 'translateY(4px)';

      setTimeout(() => {
        this.contentEl.innerHTML = '';
        const content = renderFn();

        if (typeof content === 'string') {
          this.contentEl.innerHTML = content;
        } else if (content instanceof HTMLElement) {
          this.contentEl.appendChild(content);
        }

        // Fade-in transition
        requestAnimationFrame(() => {
          this.contentEl.style.opacity = '1';
          this.contentEl.style.transform = 'translateY(0)';
        });
      }, 150);
    }

    // Dispatch custom event for other components (e.g., nav bar)
    window.dispatchEvent(new CustomEvent('routechange', { detail: { path } }));
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
