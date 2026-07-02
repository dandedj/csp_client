import { PlaquesService } from '../PlaquesService';
import config from '../../config.json';

const service = new PlaquesService();

const mockFetchResponse = (data, ok = true, status = 200) => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Error',
  json: vi.fn().mockResolvedValue(data)
});

beforeEach(() => {
  global.fetch = vi.fn();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PlaquesService.getPlaques (search)', () => {
  it('builds the search URL with query and pagination params', async () => {
    fetch.mockResolvedValue(
      mockFetchResponse({ plaques: [], total_count: 0, filtered_count: 0 })
    );

    await service.getPlaques('memorial', 50, 100, 0, 'consensus');

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toBe(
      `${config.api.searchPlaquesUrl}?q=memorial&confidence_threshold=50&limit=100&offset=0&sort_by=consensus`
    );
  });

  it('normalizes plaques and returns pagination metadata', async () => {
    fetch.mockResolvedValue(
      mockFetchResponse({
        plaques: [{ id: '1', plaque_text: 'Hello' }],
        total_count: 5,
        filtered_count: 1
      })
    );

    const result = await service.getPlaques('hello');

    expect(result.plaques).toHaveLength(1);
    // plaque_text should be normalized into a text field
    expect(result.plaques[0].text).toBe('Hello');
    expect(result.totalCount).toBe(5);
    expect(result.filteredCount).toBe(1);
  });

  it('returns an empty result set on a non-ok response instead of throwing', async () => {
    fetch.mockResolvedValue(mockFetchResponse({ message: 'boom' }, false, 500));

    const result = await service.getPlaques('anything');

    expect(result.plaques).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});

describe('PlaquesService.getAllPlaques (list)', () => {
  it('builds the list URL with default params', async () => {
    fetch.mockResolvedValue(mockFetchResponse({ plaques: [], total_count: 0 }));

    await service.getAllPlaques();

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toBe(
      `${config.api.listPlaquesUrl}?confidence_threshold=50&grouped=false&limit=500&offset=0&sort_by=consensus`
    );
  });

  it('appends viewport bounds when provided', async () => {
    fetch.mockResolvedValue(mockFetchResponse({ plaques: [], total_count: 0 }));

    const bounds = { north: 1, south: 2, east: 3, west: 4 };
    await service.getAllPlaques(50, false, 500, 0, bounds);

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('&north=1&south=2&east=3&west=4');
  });
});

describe('PlaquesService.getPlaqueById (detail)', () => {
  it('requests the detail URL using the id path segment', async () => {
    fetch.mockResolvedValue(mockFetchResponse({ id: '123', plaque_text: 'Detail' }));

    const result = await service.getPlaqueById('123');

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toBe(`${config.api.plaqueDetailUrl}/123`);
    expect(result.text).toBe('Detail');
  });

  it('returns null when no id is provided', async () => {
    const result = await service.getPlaqueById();
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('PlaquesService.normalizeFields', () => {
  it('collapses an array text field to its first element', () => {
    const normalized = service.normalizeFields({ id: '1', text: ['first', 'second'] });
    expect(normalized.text).toBe('first');
  });

  it('maps image_url to a photo object', () => {
    const normalized = service.normalizeFields({ id: '1', image_url: 'https://x/y.jpg' });
    expect(normalized.photo).toEqual({ url: 'https://x/y.jpg' });
  });
});
