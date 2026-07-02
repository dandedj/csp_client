import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pin = L.divIcon({
  className: 'plaque-marker',
  html: '<span class="plaque-marker__dot" style="background:#A8834B"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

/**
 * A small, static locator map with a single marker. Lazy-loaded from the detail
 * page so the Leaflet chunk is deferred until this section renders.
 */
export default function FindInPark({ position }) {
  return (
    <MapContainer
      center={position}
      zoom={18}
      maxZoom={19}
      scrollWheelZoom={false}
      dragging={false}
      className="detail-map"
      aria-label="Map showing where this plaque is in the park"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Marker position={position} icon={pin} />
    </MapContainer>
  );
}
