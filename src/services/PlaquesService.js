import config from '../config.json';

const DEFAULT_TTL = 60_000; // Cache successful GETs for one minute.

/**
 * Thin client for the three CSP Cloud Functions (list, search, detail).
 *
 * The server envelope is `{ plaques, total_count, limit, offset }` for list and
 * search, and `{ plaque }` for detail. All calls accept an AbortSignal and
 * successful responses are memoised in a short-lived TTL cache keyed by URL.
 */
export class PlaquesService {
  constructor(ttl = DEFAULT_TTL) {
    this.ttl = ttl;
    this.cache = new Map();
  }

  buildUrl(base, params) {
    const url = new URL(base);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  async request(url, { signal, cache = true } = {}) {
    if (cache) {
      const hit = this.cache.get(url);
      if (hit && hit.expires > Date.now()) return hit.data;
    }

    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: { Accept: 'application/json' },
      signal
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message =
        (data && (data.message || data.error)) ||
        response.statusText ||
        `Request failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    if (cache) {
      this.cache.set(url, { data, expires: Date.now() + this.ttl });
    }
    return data;
  }

  clearCache() {
    this.cache.clear();
  }

  parseEnvelope(data, fallbackLimit, fallbackOffset) {
    const plaques = Array.isArray(data?.plaques) ? data.plaques : [];
    return {
      plaques,
      totalCount: Number(data?.total_count ?? plaques.length),
      limit: Number(data?.limit ?? fallbackLimit),
      offset: Number(data?.offset ?? fallbackOffset)
    };
  }

  /**
   * Fetch a page of plaques, optionally filtered by a map viewport.
   */
  async listPlaques({
    fields = 'summary',
    limit = 2000,
    offset = 0,
    confidenceThreshold,
    sortBy,
    bounds,
    signal
  } = {}) {
    const params = { fields, limit, offset };
    if (confidenceThreshold !== undefined) {
      params.confidence_threshold = confidenceThreshold;
    }
    if (sortBy) params.sort_by = sortBy;
    if (
      bounds &&
      ['north', 'south', 'east', 'west'].every(
        (k) => typeof bounds[k] === 'number'
      )
    ) {
      params.north = bounds.north;
      params.south = bounds.south;
      params.east = bounds.east;
      params.west = bounds.west;
    }

    const url = this.buildUrl(config.api.listPlaquesUrl, params);
    const data = await this.request(url, { signal });
    return this.parseEnvelope(data, limit, offset);
  }

  /**
   * Full-text search over plaque text. Returns an empty envelope for a blank
   * query rather than hitting the server (which would 400).
   */
  async searchPlaques({
    query,
    fields = 'summary',
    limit = 2000,
    offset = 0,
    confidenceThreshold,
    sortBy,
    signal
  } = {}) {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      return { plaques: [], totalCount: 0, limit, offset };
    }

    const params = { q: trimmed, fields, limit, offset };
    if (confidenceThreshold !== undefined) {
      params.confidence_threshold = confidenceThreshold;
    }
    if (sortBy) params.sort_by = sortBy;

    const url = this.buildUrl(config.api.searchPlaquesUrl, params);
    const data = await this.request(url, { signal });
    return this.parseEnvelope(data, limit, offset);
  }

  /**
   * Fetch a single plaque in the full projection. Returns null when the plaque
   * does not exist (404); other failures throw.
   */
  async getPlaque(id, { signal } = {}) {
    if (!id) return null;
    const url = `${config.api.plaqueDetailUrl}/${encodeURIComponent(id)}`;
    try {
      const data = await this.request(url, { signal });
      return data?.plaque ?? null;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }
}

// Module-level singleton shared across the app (one cache, one instance).
export const plaquesService = new PlaquesService();

export default plaquesService;
