import { render, screen } from '@testing-library/react';
import App from '../App';

// Firebase initialises at import time; stub it so jsdom does not try to reach
// the network. Analytics is only loaded in production, so no analytics mock is
// needed for this smoke test.
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({}))
}));

// Leaflet needs a real sized container; replace react-leaflet and the cluster
// group with lightweight passthroughs. Marker/cluster accept a ref.
vi.mock('react-leaflet', async () => {
  const React = await vi.importActual('react');
  const Pass = ({ children }) => React.createElement('div', null, children);
  const Marker = React.forwardRef(({ children }, ref) =>
    React.createElement('div', { ref }, children)
  );
  const stubMap = {
    fitBounds: () => {},
    setView: () => {},
    getZoom: () => 18
  };
  return {
    MapContainer: Pass,
    TileLayer: () => null,
    Marker,
    Popup: Pass,
    GeoJSON: () => null,
    useMap: () => stubMap
  };
});

vi.mock('react-leaflet-cluster', async () => {
  const React = await vi.importActual('react');
  const Cluster = React.forwardRef(({ children }, ref) =>
    React.createElement('div', { ref }, children)
  );
  return { default: Cluster };
});

beforeEach(() => {
  global.fetch = vi.fn((url) => {
    const body = String(url).includes('/list')
      ? { plaques: [], total_count: 0, limit: 5000, offset: 0 }
      : {};
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('renders the shell with the brand wordmark and navigation', async () => {
  render(<App />);

  expect(await screen.findByText('Cancer Survivors Park')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Map' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'All plaques' })).toBeInTheDocument();
});
