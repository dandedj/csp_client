import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: 'csp-plaques.firebaseapp.com',
  projectId: 'csp-plaques',
  storageBucket: 'csp-plaques.appspot.com',
  messagingSenderId: '316954750234',
  appId: '1:316954750234:web:a0bfb2e600f597a6bc90a3',
  measurementId: 'G-NZY0R89RSS'
};

let app = null;
try {
  app = initializeApp(firebaseConfig);
} catch {
  app = null;
}

let analyticsPromise;

/**
 * Record a page view. Analytics is only loaded in production and is imported
 * lazily so it stays out of the initial bundle. Failures are swallowed —
 * analytics must never break navigation.
 */
export function logPageView(path) {
  if (!app || !import.meta.env.PROD) return;
  analyticsPromise =
    analyticsPromise ||
    import('firebase/analytics')
      .then(async ({ getAnalytics, isSupported, logEvent }) => {
        const supported = await isSupported().catch(() => false);
        if (!supported) return null;
        return { logEvent, instance: getAnalytics(app) };
      })
      .catch(() => null);

  analyticsPromise.then((analytics) => {
    if (!analytics) return;
    analytics.logEvent(analytics.instance, 'page_view', {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title
    });
  });
}
