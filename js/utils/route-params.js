/**
 * Reads and removes a one-shot parameter from the hash route.
 * This lets a page select an initial tab without leaving stale tab state in the URL.
 */
export function consumeHashRouteParam(name) {
  const rawRoute = window.location.hash.slice(1);
  const queryIndex = rawRoute.indexOf('?');
  if (queryIndex < 0) return null;

  const path = rawRoute.slice(0, queryIndex);
  const params = new URLSearchParams(rawRoute.slice(queryIndex + 1));
  if (!params.has(name)) return null;

  const value = params.get(name);
  params.delete(name);
  const remainingQuery = params.toString();
  const cleanHash = `#${path}${remainingQuery ? `?${remainingQuery}` : ''}`;
  window.history.replaceState(window.history.state, '', cleanHash);
  return value;
}
