import { lazy } from 'react';

const RELOAD_FLAG = 'csp-chunk-reload';

/**
 * React.lazy wrapper that self-heals after a deploy.
 *
 * When hosting is redeployed, content-hashed chunk filenames change; a
 * session that loaded the previous index.js gets a failed dynamic import
 * the next time it navigates to a lazy route. Reload once to pick up the
 * fresh index.html (served with no-cache), guarded by a sessionStorage
 * flag so a genuinely broken chunk can't cause a reload loop.
 */
export default function lazyWithReload(importer) {
  return lazy(() =>
    importer().then((module) => {
      sessionStorage.removeItem(RELOAD_FLAG);
      return module;
    }).catch((error) => {
      if (sessionStorage.getItem(RELOAD_FLAG)) {
        throw error;
      }
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
      // Keep Suspense pending while the reload happens.
      return new Promise(() => {});
    })
  );
}
