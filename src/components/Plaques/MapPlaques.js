import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Form, Button, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { BiCurrentLocation } from 'react-icons/bi';
import { usePlaques } from '../../context/PlaquesContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import InscriptionPanel from './InscriptionPanel';
import 'leaflet/dist/leaflet.css';

// Approximate centre of Cancer Survivors Park, Greenville, SC.
const INITIAL_CENTER = [34.841326395062595, -82.39848640537643];
const INITIAL_ZOOM = 18;
const MAX_ZOOM = 19;

const markerIcon = (color) =>
  L.divIcon({
    className: 'plaque-marker',
    html: `<span class="plaque-marker__dot" style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10]
  });

const VERDIGRIS = '#3E7A66';
const BRONZE = '#A8834B';

function markerLatLng(plaque) {
  const loc = plaque?.location;
  if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
    return null;
  }
  return [loc.latitude, loc.longitude];
}

function UserLocationMarker({ location }) {
  if (!location) return null;
  const icon = L.divIcon({
    className: 'user-marker',
    html: '<span class="user-marker__dot"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
  return (
    <Marker position={[location.latitude, location.longitude]} icon={icon} zIndexOffset={1000}>
      <Popup>You are here</Popup>
    </Marker>
  );
}

/**
 * Captures the Leaflet map instance, frames the park on first load, and pans to
 * a deep-linked marker (`?plaque=<id>`), spiderfying its cluster and opening
 * the popup.
 */
function MapController({ parkGeoJSON, plaqueParam, results, clusterRef, markerRefs }) {
  const map = useMap();
  const didFrame = useRef(false);

  useEffect(() => {
    if (didFrame.current || plaqueParam || !parkGeoJSON) return;
    try {
      const bounds = L.geoJSON(parkGeoJSON).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
        didFrame.current = true;
      }
    } catch {
      /* ignore malformed geojson */
    }
  }, [map, parkGeoJSON, plaqueParam]);

  useEffect(() => {
    if (!plaqueParam) return;
    const target = results.find((plaque) => plaque.id === plaqueParam);
    if (!target) return;
    const latLng = markerLatLng(target);
    const marker = markerRefs.current[plaqueParam];
    const cluster = clusterRef.current;
    if (marker && cluster && typeof cluster.zoomToShowLayer === 'function') {
      cluster.zoomToShowLayer(marker, () => marker.openPopup());
    } else if (latLng) {
      map.setView(latLng, MAX_ZOOM);
    }
  }, [map, plaqueParam, results, clusterRef, markerRefs]);

  return null;
}

export default function MapPlaques() {
  const { query, setQuery, results, resultsTotal, loading, error, retry } = usePlaques();
  const { location, getCurrentLocation } = useGeolocation();
  const [searchParams] = useSearchParams();
  const plaqueParam = searchParams.get('plaque');

  const [parkGeoJSON, setParkGeoJSON] = useState(null);
  const clusterRef = useRef(null);
  const markerRefs = useRef({});

  useEffect(() => {
    document.title = 'Map · Cancer Survivors Park';
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/geo/park.geojson', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setParkGeoJSON(data))
      .catch(() => {
        /* park outline is decorative; ignore load failures */
      });
    return () => controller.abort();
  }, []);

  const geoJsonStyle = useMemo(
    () => ({ color: VERDIGRIS, weight: 2, opacity: 0.6, fillOpacity: 0.08 }),
    []
  );
  const verdigrisPin = useMemo(() => markerIcon(VERDIGRIS), []);
  const bronzePin = useMemo(() => markerIcon(BRONZE), []);

  const markers = results.filter((plaque) => markerLatLng(plaque));

  return (
    <div className="map-page">
      <div className="map-page__bar">
        <Form
          className="search-field search-field--floating"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <Form.Label htmlFor="map-search" className="visually-hidden">
            Search plaques
          </Form.Label>
          <Form.Control
            id="map-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names or words on a plaque"
            aria-label="Search names or words on a plaque"
          />
        </Form>
        <Button
          variant="light"
          className="map-page__locate"
          onClick={getCurrentLocation}
          aria-label="Find my location"
          title="Find my location"
        >
          <BiCurrentLocation aria-hidden="true" />
        </Button>
        <p className="map-page__count wayfinding" aria-live="polite">
          {loading ? (
            <Spinner animation="border" size="sm" role="status" aria-label="Loading" />
          ) : (
            `${markers.length} of ${resultsTotal}`
          )}
        </p>
      </div>

      {error && (
        <div className="map-page__error" role="alert">
          <span>The plaques couldn&apos;t load. Check your connection and try again.</span>
          <Button variant="primary" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      <MapContainer
        center={INITIAL_CENTER}
        zoom={INITIAL_ZOOM}
        minZoom={10}
        maxZoom={MAX_ZOOM}
        scrollWheelZoom
        className="map-page__map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={MAX_ZOOM}
        />
        {parkGeoJSON && <GeoJSON data={parkGeoJSON} style={geoJsonStyle} />}
        <UserLocationMarker location={location} />

        <MarkerClusterGroup
          ref={clusterRef}
          chunkedLoading
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          maxClusterRadius={50}
        >
          {markers.map((plaque) => {
            const isSelected = plaque.id === plaqueParam;
            return (
              <Marker
                key={plaque.id}
                position={markerLatLng(plaque)}
                icon={isSelected ? bronzePin : verdigrisPin}
                zIndexOffset={isSelected ? 500 : 0}
                ref={(instance) => {
                  if (instance) markerRefs.current[plaque.id] = instance;
                  else delete markerRefs.current[plaque.id];
                }}
              >
                <Popup>
                  <div className="marker-popup">
                    <InscriptionPanel text={plaque.text} variant="popup" />
                    <Link to={`/detail/${plaque.id}`} className="btn btn-primary btn-sm">
                      Read plaque
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>

        <MapController
          parkGeoJSON={parkGeoJSON}
          plaqueParam={plaqueParam}
          results={results}
          clusterRef={clusterRef}
          markerRefs={markerRefs}
        />
      </MapContainer>
    </div>
  );
}
