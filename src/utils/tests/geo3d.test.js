import {
  pathCentroid,
  latLonToLocal,
  nearestPointOnPath,
  signedLateralOffset,
  regularizedPosition
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

describe('regularizedPosition', () => {
  const path = { x: 0, z: 0 };
  const tangent = { x: 0, z: 1 }; // travelling +z, left normal is -x

  it('clamps an over-far plaque inward while keeping its side', () => {
    const result = regularizedPosition(path, tangent, { x: -12, z: 0 }, 1.4, 5);
    expect(result.rawOffset).toBeCloseTo(12, 9);
    expect(result.offset).toBeCloseTo(5, 9); // clamped to max
    expect(result.x).toBeCloseTo(-5, 9); // still left
    expect(result.z).toBeCloseTo(0, 9);
  });

  it('pushes a plaque sitting on the path out to the minimum band', () => {
    const result = regularizedPosition(path, tangent, { x: 0, z: 0 }, 1.4, 5);
    expect(Math.abs(result.offset)).toBeCloseTo(1.4, 9);
    expect(Math.abs(result.x)).toBeCloseTo(1.4, 9);
  });

  it('keeps a plaque already within the band where it is (side preserved)', () => {
    const result = regularizedPosition(path, tangent, { x: 3, z: 0 }, 1.4, 5);
    expect(result.rawOffset).toBeCloseTo(-3, 9);
    expect(result.offset).toBeCloseTo(-3, 9);
    expect(result.x).toBeCloseTo(3, 9); // still right
  });

  it('offsets relative to the path point, not the origin', () => {
    const result = regularizedPosition({ x: 10, z: 4 }, tangent, { x: 6, z: 4 }, 1.4, 5);
    // Plaque is 4m to the left (-x) of the path point → within band, preserved.
    expect(result.x).toBeCloseTo(6, 9);
    expect(result.z).toBeCloseTo(4, 9);
  });
});
