import { render, screen } from '@testing-library/react';
import App from '../App';

// Firebase analytics cannot initialize in jsdom, so stub the modules App uses
// at import time.
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({}))
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => ({})),
  logEvent: vi.fn()
}));

// Leaflet needs a real DOM-sized container, so replace react-leaflet with
// lightweight passthrough stubs for this smoke test. useMap must return a
// stable reference so effects keyed on the map object don't loop forever.
vi.mock('react-leaflet', () => {
  const Passthrough = ({ children }) => <div>{children}</div>;
  const stubMap = {
    getBounds: () => ({
      getNorth: () => 0,
      getSouth: () => 0,
      getEast: () => 0,
      getWest: () => 0
    }),
    on: () => {},
    off: () => {}
  };
  return {
    MapContainer: Passthrough,
    TileLayer: () => null,
    Marker: Passthrough,
    Popup: Passthrough,
    GeoJSON: () => null,
    useMap: () => stubMap
  };
});

beforeEach(() => {
  // The default route mounts MapPlaques which fetches the park GeoJSON and the
  // plaque list on mount; return benign empty payloads.
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({})
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('renders the application shell with the site header', () => {
  render(<App />);

  const branding = screen.getAllByText(/Cancer Survivor Park/i);
  expect(branding.length).toBeGreaterThan(0);
});
