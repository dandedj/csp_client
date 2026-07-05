import {
  pathCentroid,
  latLonToLocal,
  nearestPointOnPath,
  signedLateralOffset,
  railParameter,
  railPlacement
} from '../geo3d';

describe('pathCentroid', () => {
  it('averages latitude and longitude', () => {
    const centroid = pathCentroid([
      [0, 0],
      [2, 4],
      [4, 8]
    ]);
    expect(centroid.lat).toBeCloseTo(2, 10);
    expect(centroid.lon).toBeCloseTo(4, 10);
  });

  it('returns the null island for an empty path', () => {
    expect(pathCentroid([])).toEqual({ lat: 0, lon: 0 });
  });
});

describe('latLonToLocal', () => {
  const origin = { lat: 34.8412, lon: -82.3989 };

  it('maps the origin to the local origin', () => {
    const { x, z } = latLonToLocal(origin.lat, origin.lon, origin);
    expect(x).toBeCloseTo(0, 9);
    expect(z).toBeCloseTo(0, 9);
  });

  it('scales one degree of latitude to ~111.32 km north (-z)', () => {
    const { x, z } = latLonToLocal(origin.lat + 1, origin.lon, origin);
    expect(x).toBeCloseTo(0, 6);
    // North is -z; one degree of latitude is 111.32 km.
    expect(-z).toBeCloseTo(111320, 0);
  });

  it('scales one degree of longitude by cos(latitude)', () => {
    const { x, z } = latLonToLocal(origin.lat, origin.lon + 1, origin);
    const expected = 111320 * Math.cos((origin.lat * Math.PI) / 180);
    expect(x).toBeCloseTo(expected, 0);
    expect(z).toBeCloseTo(0, 6);
  });

  it('places points east and south for higher lon and lower lat', () => {
    const { x, z } = latLonToLocal(origin.lat - 0.001, origin.lon + 0.001, origin);
    expect(x).toBeGreaterThan(0); // east
    expect(z).toBeGreaterThan(0); // south (below the origin latitude)
  });
});

describe('nearestPointOnPath', () => {
  const samples = [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
    { x: 20, z: 0 },
    { x: 30, z: 0 }
  ];

  it('finds the nearest sample and its planar distance', () => {
    const result = nearestPointOnPath(samples, 9, 3);
    expect(result.index).toBe(1);
    expect(result.x).toBe(10);
    expect(result.z).toBe(0);
    expect(result.distance).toBeCloseTo(Math.hypot(1, 3), 9);
  });

  it('returns an exact hit at distance zero', () => {
    const result = nearestPointOnPath(samples, 20, 0);
    expect(result.index).toBe(2);
    expect(result.distance).toBeCloseTo(0, 9);
  });

  it('works with any object exposing x and z (e.g. Vector3-like)', () => {
    const vectors = [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 5 }
    ];
    const result = nearestPointOnPath(vectors, 0, 4);
    expect(result.index).toBe(1);
    expect(result.distance).toBeCloseTo(1, 9);
  });

  it('reports an empty path as unreachable', () => {
    const result = nearestPointOnPath([], 0, 0);
    expect(result.index).toBe(-1);
    expect(result.distance).toBe(Infinity);
  });
});

describe('signedLateralOffset', () => {
  // Path point at the origin, tangent pointing +z (north into the scene).
  const path = { x: 0, z: 0 };
  const tangent = { x: 0, z: 1 };

  it('is positive to the left of the travel direction', () => {
    // Left of +z travel is -x.
    expect(signedLateralOffset(path, tangent, { x: -2, z: 0 })).toBeCloseTo(2, 9);
  });

  it('is negative to the right of the travel direction', () => {
    expect(signedLateralOffset(path, tangent, { x: 3, z: 0 })).toBeCloseTo(-3, 9);
  });

  it('ignores displacement along the tangent', () => {
    expect(signedLateralOffset(path, tangent, { x: 0, z: 9 })).toBeCloseTo(0, 9);
  });

  it('normalises the tangent internally', () => {
    expect(signedLateralOffset(path, { x: 0, z: 10 }, { x: -2, z: 0 })).toBeCloseTo(2, 9);
  });
});

describe('railParameter', () => {
  it('centres plaques in equal segments (no plaque at the ends)', () => {
    expect(railParameter(0, 4)).toBeCloseTo(0.125, 9);
    expect(railParameter(1, 4)).toBeCloseTo(0.375, 9);
    expect(railParameter(2, 4)).toBeCloseTo(0.625, 9);
    expect(railParameter(3, 4)).toBeCloseTo(0.875, 9);
  });

  it('spaces consecutive plaques by a uniform pitch of 1/n', () => {
    const n = 6;
    const pitch = railParameter(1, n) - railParameter(0, n);
    expect(pitch).toBeCloseTo(1 / n, 9);
    expect(railParameter(4, n) - railParameter(3, n)).toBeCloseTo(1 / n, 9);
  });

  it('puts a lone plaque at the midpoint and guards empty rails', () => {
    expect(railParameter(0, 1)).toBeCloseTo(0.5, 9);
    expect(railParameter(0, 0)).toBe(0);
  });
});

describe('railPlacement', () => {
  const curvePoint = { x: 0, z: 0 };
  const tangent = { x: 0, z: 1 }; // travelling +z; left normal is (-1, 0)

  it('offsets a left-side plaque to -x and faces it inward (+x)', () => {
    const spot = railPlacement(curvePoint, tangent, 1, 2);
    expect(spot.x).toBeCloseTo(-2, 9);
    expect(spot.z).toBeCloseTo(0, 9);
    // Inward is +x: rotation.y = atan2(1, 0) = +PI/2.
    expect(spot.facing).toBeCloseTo(Math.PI / 2, 9);
  });

  it('offsets a right-side plaque to +x and faces it inward (-x)', () => {
    const spot = railPlacement(curvePoint, tangent, -1, 2);
    expect(spot.x).toBeCloseTo(2, 9);
    expect(spot.z).toBeCloseTo(0, 9);
    expect(spot.facing).toBeCloseTo(-Math.PI / 2, 9);
  });

  it('places relative to the given curve point and normalises the tangent', () => {
    const spot = railPlacement({ x: 10, z: 5 }, { x: 0, z: 8 }, 1, 2);
    expect(spot.x).toBeCloseTo(8, 9); // 10 + (-1)*2
    expect(spot.z).toBeCloseTo(5, 9);
  });

  it('faces exactly opposite its outward offset direction', () => {
    const side = 1;
    const spot = railPlacement(curvePoint, { x: 1, z: 1 }, side, 3);
    // Outward direction from the curve point to the plaque.
    const outX = spot.x - curvePoint.x;
    const outZ = spot.z - curvePoint.z;
    const outwardYaw = Math.atan2(outX, outZ);
    // Facing is inward: 180° from outward.
    const delta = Math.abs(((spot.facing - outwardYaw + Math.PI) % (2 * Math.PI)) - Math.PI);
    expect(Math.min(delta, 2 * Math.PI - delta)).toBeCloseTo(Math.PI, 6);
  });
});
