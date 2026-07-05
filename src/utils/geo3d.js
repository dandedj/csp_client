/**
 * Local metric projection helpers for the 3D park walk.
 *
 * The walk renders in a right-handed three.js scene where 1 world unit is 1
 * metre, y is up, and the ground is the x/z plane. Latitude/longitude are
 * flattened with an equirectangular projection centred on the path centroid —
 * over a ~440 m walk the distortion is well under a centimetre, and the maths
 * stays cheap and dependency-free (no three.js import, so this module tree
 * shakes cleanly and is unit-testable).
 *
 * Convention: x = metres east of origin, z = metres *south* of origin, so that
 * increasing latitude (north) maps to -z ("forward" into the default camera).
 */

// One degree of latitude is ~111.32 km everywhere; longitude shrinks by the
// cosine of the latitude.
const METRES_PER_DEGREE = 111320;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Average a list of `[lat, lon]` pairs into a single `{ lat, lon }` centroid.
 *
 * @param {Array<[number, number]>} points Latitude/longitude pairs.
 * @returns {{lat: number, lon: number}} The mean latitude and longitude.
 */
export function pathCentroid(points) {
  if (!points || points.length === 0) {
    return { lat: 0, lon: 0 };
  }
  let latSum = 0;
  let lonSum = 0;
  for (const [lat, lon] of points) {
    latSum += lat;
    lonSum += lon;
  }
  return { lat: latSum / points.length, lon: lonSum / points.length };
}

/**
 * Project a latitude/longitude to local scene metres relative to an origin.
 *
 * @param {number} lat Latitude in degrees.
 * @param {number} lon Longitude in degrees.
 * @param {{lat: number, lon: number}} origin Projection centre.
 * @returns {{x: number, z: number}} East metres (x) and south metres (z).
 */
export function latLonToLocal(lat, lon, origin) {
  const north = (lat - origin.lat) * METRES_PER_DEGREE;
  const east = (lon - origin.lon) * METRES_PER_DEGREE * Math.cos(toRadians(origin.lat));
  return { x: east, z: -north };
}

/**
 * Find the sample nearest to `(x, z)` on a polyline of `{x, z}` points.
 *
 * Used to orient each plaque toward the closest point on the walking path.
 * Any object exposing numeric `x` and `z` works (e.g. a THREE.Vector3), so the
 * curve can be sampled once and reused.
 *
 * @param {Array<{x: number, z: number}>} samples Polyline sample points.
 * @param {number} x Query x in metres.
 * @param {number} z Query z in metres.
 * @returns {{index: number, x: number, z: number, distance: number}} Nearest
 *   sample, its index, and its planar distance to the query point.
 */
export function nearestPointOnPath(samples, x, z) {
  let bestIndex = -1;
  let bestSquared = Infinity;
  for (let i = 0; i < samples.length; i += 1) {
    const dx = samples[i].x - x;
    const dz = samples[i].z - z;
    const squared = dx * dx + dz * dz;
    if (squared < bestSquared) {
      bestSquared = squared;
      bestIndex = i;
    }
  }
  if (bestIndex === -1) {
    return { index: -1, x: 0, z: 0, distance: Infinity };
  }
  const nearest = samples[bestIndex];
  return {
    index: bestIndex,
    x: nearest.x,
    z: nearest.z,
    distance: Math.sqrt(bestSquared)
  };
}
