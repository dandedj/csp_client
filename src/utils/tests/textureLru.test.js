import createTextureLRU from '../textureLru';

describe('createTextureLRU', () => {
  it('evicts the least-recently-used entry and disposes it', () => {
    const disposed = [];
    const lru = createTextureLRU(2, (value) => disposed.push(value));

    lru.set('a', 'A');
    lru.set('b', 'B');
    lru.set('c', 'C'); // over capacity → 'a' is the oldest

    expect(disposed).toEqual(['A']);
    expect(lru.has('a')).toBe(false);
    expect(lru.keys()).toEqual(['b', 'c']);
    expect(lru.size).toBe(2);
  });

  it('refreshes recency on get so a touched entry survives', () => {
    const disposed = [];
    const lru = createTextureLRU(2, (value) => disposed.push(value));

    lru.set('a', 'A');
    lru.set('b', 'B');
    lru.get('a'); // 'a' becomes most-recently-used
    lru.set('c', 'C'); // evicts 'b' instead of 'a'

    expect(disposed).toEqual(['B']);
    expect(lru.has('a')).toBe(true);
    expect(lru.has('b')).toBe(false);
  });

  it('disposes the replaced value when a key is overwritten', () => {
    const disposed = [];
    const lru = createTextureLRU(4, (value) => disposed.push(value));

    lru.set('a', 'A1');
    lru.set('a', 'A2');

    expect(disposed).toEqual(['A1']);
    expect(lru.get('a')).toBe('A2');
    expect(lru.size).toBe(1);
  });

  it('delete() removes and disposes a single entry', () => {
    const disposed = [];
    const lru = createTextureLRU(4, (value) => disposed.push(value));

    lru.set('a', 'A');
    lru.set('b', 'B');
    lru.delete('a');

    expect(disposed).toEqual(['A']);
    expect(lru.has('a')).toBe(false);
    expect(lru.size).toBe(1);
  });

  it('clear() disposes every entry', () => {
    const disposed = [];
    const lru = createTextureLRU(4, (value) => disposed.push(value));

    lru.set('a', 'A');
    lru.set('b', 'B');
    lru.clear();

    expect(disposed.sort()).toEqual(['A', 'B']);
    expect(lru.size).toBe(0);
  });

  it('passes both value and key to the eviction hook', () => {
    const evictions = [];
    const lru = createTextureLRU(1, (value, key) => evictions.push([key, value]));

    lru.set('a', 'A');
    lru.set('b', 'B'); // evicts 'a'

    expect(evictions).toEqual([['a', 'A']]);
  });
});
