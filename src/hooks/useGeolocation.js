import { useCallback, useEffect, useState } from 'react';

const isMobileDevice = () =>
  /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;

/**
 * Great-circle distance between two {latitude, longitude} points, in metres.
 */
export function haversineMeters(from, to) {
  if (!from || !to) return null;
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Format a distance in metres as a short way-finding label.
 * e.g. 42 -> "~40 m away", 1400 -> "~1.4 km away".
 */
export function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return null;
  if (meters < 1000) {
    const rounded = meters < 100 ? Math.round(meters / 5) * 5 : Math.round(meters / 10) * 10;
    return `~${rounded} m away`;
  }
  return `~${(meters / 1000).toFixed(1)} km away`;
}

/**
 * Access the visitor's current location. On mobile the browser prompt is
 * requested on mount; on desktop it waits for an explicit request. Denials
 * are handled gracefully (location stays null, error is surfaced).
 */
export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const mobile = typeof navigator !== 'undefined' ? isMobileDevice() : false;

  const getCurrentLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Location is not available on this device.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setError(null);
        setLoading(false);
      },
      () => {
        setError('We could not get your location.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (mobile) getCurrentLocation();
  }, [mobile, getCurrentLocation]);

  return { location, error, loading, getCurrentLocation, isMobile: mobile };
}

export default useGeolocation;
