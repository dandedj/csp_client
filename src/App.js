import { Suspense, lazy, useEffect } from 'react';
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
const MapPlaques = lazy(() => import('./components/Plaques/MapPlaques'));
const ListPlaques = lazy(() => import('./components/Plaques/ListPlaques'));
const PlaqueDetail = lazy(() => import('./components/Plaques/PlaqueDetail'));

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
