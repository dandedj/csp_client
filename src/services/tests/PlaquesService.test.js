import { PlaquesService } from '../PlaquesService';
import config from '../../config.json';

const envelope = (plaques, extra = {}) => ({
  plaques,
  total_count: plaques.length,
  limit: 2000,
  offset: 0,
  ...extra
});

const okResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: 'OK',
  json: vi.fn().mockResolvedValue(data)
});

let service;

beforeEach(() => {
  service = new PlaquesService();
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const calledUrl = (index = 0) => new URL(fetch.mock.calls[index][0]);

describe('listPlaques', () => {
  it('requests the summary projection and parses the envelope', async () => {
    fetch.mockResolvedValue(
      okResponse(envelope([{ id: 'a' }, { id: 'b' }], { total_count: 1238 }))
    );

    const result = await service.listPlaques({ fields: 'summary', limit: 5000 });

    const url = calledUrl();
    expect(url.origin + url.pathname).toBe(config.api.listPlaquesUrl);
    expect(url.searchParams.get('fields')).toBe('summary');
    expect(url.searchParams.get('limit')).toBe('5000');
    expect(result.plaques).toHaveLength(2);
    expect(result.totalCount).toBe(1238);
  });

  it('appends viewport bounds only when all four are numeric', async () => {
    fetch.mockResolvedValue(okResponse(envelope([])));

    await service.listPlaques({ bounds: { north: 1, south: 2, east: 3, west: 4 } });
    expect(calledUrl().searchParams.get('north')).toBe('1');

    fetch.mockClear();
    await service.listPlaques({ bounds: { north: 1, south: 2 } });
    expect(calledUrl().searchParams.has('north')).toBe(false);
  });

  it('passes the abort signal through to fetch', async () => {
    fetch.mockResolvedValue(okResponse(envelope([])));
    const controller = new AbortController();

    await service.listPlaques({ signal: controller.signal });

    expect(fetch.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it('throws with the server message on a non-ok response', async () => {
    fetch.mockResolvedValue(okResponse({ message: 'BigQuery exploded' }, 500));

    await expect(service.listPlaques()).rejects.toThrow('BigQuery exploded');
  });

  it('memoises identical requests within the TTL', async () => {
    fetch.mockResolvedValue(okResponse(envelope([{ id: 'a' }])));

    await service.listPlaques({ limit: 100 });
    await service.listPlaques({ limit: 100 });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('searchPlaques', () => {
  it('builds the search URL with the query and summary projection', async () => {
    fetch.mockResolvedValue(okResponse(envelope([{ id: 'a' }], { total_count: 49 })));

    const result = await service.searchPlaques({ query: 'rené', limit: 5000 });

    const url = calledUrl();
    expect(url.origin + url.pathname).toBe(config.api.searchPlaquesUrl);
    expect(url.searchParams.get('q')).toBe('rené');
    expect(url.searchParams.get('fields')).toBe('summary');
    expect(result.totalCount).toBe(49);
  });

  it('returns an empty envelope for a blank query without calling the server', async () => {
    const result = await service.searchPlaques({ query: '   ' });

    expect(fetch).not.toHaveBeenCalled();
    expect(result.plaques).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});

describe('getPlaque', () => {
  it('unwraps the { plaque } envelope from the detail endpoint', async () => {
    fetch.mockResolvedValue(okResponse({ plaque: { id: '123', text: 'Detail' } }));

    const result = await service.getPlaque('123');

    expect(fetch.mock.calls[0][0]).toBe(`${config.api.plaqueDetailUrl}/123`);
    expect(result.text).toBe('Detail');
  });

  it('returns null for a 404 and null id without fetching', async () => {
    fetch.mockResolvedValue(okResponse({ error: 'Plaque not found' }, 404));
    expect(await service.getPlaque('missing')).toBeNull();

    fetch.mockClear();
    expect(await service.getPlaque()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
