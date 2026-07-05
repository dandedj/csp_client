import { Suspense, useEffect } from 'react';
import lazyWithReload from './utils/lazyWithReload';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation
} from 'react-router-dom';
import Header from './components/Common/Header';
import Footer from './components/Common/Footer';
import { PlaquesProvider } from './context/PlaquesContext';
import { logPageView } from './firebase';

// Route-based code splitting: the Leaflet-heavy map and the list/detail views
// each load in their own chunk, keeping the initial bundle small.
const MapPlaques = lazyWithReload(() => import('./components/Plaques/MapPlaques'));
const ListPlaques = lazyWithReload(() => import('./components/Plaques/ListPlaques'));
const PlaqueDetail = lazyWithReload(() => import('./components/Plaques/PlaqueDetail'));
// The three.js walk is heavy; keep it in its own lazy chunk so the initial
// bundle never pays for it.
const WalkPage = lazyWithReload(() => import('./components/Walk/WalkPage'));

function PageViewLogger() {
  const location = useLocation();
  useEffect(() => {
    logPageView(location.pathname);
  }, [location]);
  return null;
}

function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <span className="visually-hidden">Loading…</span>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <PageViewLogger />
      <PlaquesProvider>
        <div className="app-shell d-flex flex-column min-vh-100">
          <Header />
          <main className="flex-grow-1">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<MapPlaques />} />
                <Route path="/map" element={<MapPlaques />} />
                <Route path="/walk" element={<WalkPage />} />
                <Route path="/plaques" element={<ListPlaques />} />
                <Route path="/detail/:id" element={<PlaqueDetail />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </PlaquesProvider>
    </Router>
  );
}
