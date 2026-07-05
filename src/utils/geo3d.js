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

/**
 * Signed lateral distance of a point from the path, measured along the path's
 * left normal. Positive is to the left of the travel direction; the magnitude
 * is the perpendicular distance in metres.
 *
 * @param {{x: number, z: number}} pathPoint Point on the path.
 * @param {{x: number, z: number}} tangent Path tangent at that point (need not
 *   be unit length — it is normalised internally).
 * @param {{x: number, z: number}} point The point to measure.
 * @returns {number} Signed perpendicular distance in metres.
 */
export function signedLateralOffset(pathPoint, tangent, point) {
  const length = Math.hypot(tangent.x, tangent.z) || 1;
  const tx = tangent.x / length;
  const tz = tangent.z / length;
  const dx = point.x - pathPoint.x;
  const dz = point.z - pathPoint.z;
  // 2-D cross product of the unit tangent with the offset vector, which equals
  // the offset projected onto the left normal N = (-tz, tx).
  return tx * dz - tz * dx;
}

/**
 * Evenly-spaced arc-length parameter for the i-th of n plaques on a rail. The
 * plaques are placed at the centres of n equal segments, so no plaque lands
 * exactly on the path's start or end and the spacing (pitch) is uniform.
 *
 * @param {number} index Zero-based plaque index within its side.
 * @param {number} count Number of plaques on that side.
 * @returns {number} Normalised arc-length parameter in [0, 1].
 */
export function railParameter(index, count) {
  if (count <= 0) {
    return 0;
  }
  return (index + 0.5) / count;
}

/**
 * Place a plaque on a side rail: offset a point on the path along that side's
 * outward normal by a fixed distance, and face the plaque inward
 * (perpendicular, toward the walkway).
 *
 * @param {{x: number, z: number}} curvePoint Point on the path at the plaque's
 *   rail parameter.
 * @param {{x: number, z: number}} tangent Path tangent there (need not be unit
 *   length — normalised internally).
 * @param {number} side +1 for the left of the travel direction, -1 for the
 *   right.
 * @param {number} offset Lateral distance from the path in metres.
 * @returns {{x: number, z: number, facing: number}} Display position and the
 *   inward-facing yaw (rotation about y).
 */
export function railPlacement(curvePoint, tangent, side, offset) {
  const length = Math.hypot(tangent.x, tangent.z) || 1;
  const tx = tangent.x / length;
  const tz = tangent.z / length;
  // Left normal is (-tz, tx); the outward normal for this side scales it by
  // the sign. The plaque sits outward and faces back inward.
  const outX = -tz * side;
  const outZ = tx * side;
  return {
    x: curvePoint.x + outX * offset,
    z: curvePoint.z + outZ * offset,
    facing: Math.atan2(-outX, -outZ)
  };
}
