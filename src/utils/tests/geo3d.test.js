import { pathCentroid, latLonToLocal, nearestPointOnPath } from '../geo3d';

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
