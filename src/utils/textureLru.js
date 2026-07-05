/**
 * A tiny least-recently-used cache with an eviction hook.
 *
 * The walk uses this to bound the number of live WebGL textures: entries are
 * keyed by plaque id, and the `onEvict` callback disposes the GPU resource
 * (and reverts the plaque to its placeholder) when an entry falls out of the
 * cache. Recency is tracked by re-inserting on access, which relies on the
 * insertion-order guarantee of `Map`.
 *
 * @param {number} capacity Maximum number of retained entries.
 * @param {(value: *, key: *) => void} [onEvict] Called with the value (and key)
 *   whenever an entry leaves the cache — via capacity overflow, `delete`,
 *   replacement, or `clear`.
 * @returns {{
 *   get: (key: *) => *,
 *   set: (key: *, value: *) => *,
 *   delete: (key: *) => void,
 *   has: (key: *) => boolean,
 *   keys: () => Array<*>,
 *   clear: () => void,
 *   size: number
 * }}
 */
export default function createTextureLRU(capacity, onEvict) {
  const entries = new Map();

  const evict = (key) => {
    const value = entries.get(key);
    entries.delete(key);
    if (onEvict) {
      onEvict(value, key);
    }
  };

  return {
    get(key) {
      if (!entries.has(key)) {
        return undefined;
      }
      // Reinsert to mark this key as most-recently-used.
      const value = entries.get(key);
      entries.delete(key);
      entries.set(key, value);
      return value;
    },

    set(key, value) {
      if (entries.has(key)) {
        const previous = entries.get(key);
        entries.delete(key);
        if (previous !== value && onEvict) {
          onEvict(previous, key);
        }
      }
      entries.set(key, value);
      while (entries.size > capacity) {
        const oldest = entries.keys().next().value;
        evict(oldest);
      }
      return value;
    },

    delete(key) {
      if (entries.has(key)) {
        evict(key);
      }
    },

    has(key) {
      return entries.has(key);
    },

    keys() {
      return [...entries.keys()];
    },

    clear() {
      for (const key of [...entries.keys()]) {
        evict(key);
      }
    },

    get size() {
      return entries.size;
    }
  };
}
