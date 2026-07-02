import { act, fireEvent, render, screen } from '@testing-library/react';
import { PlaquesProvider, usePlaques } from '../PlaquesContext';

const resp = (data) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: () => Promise.resolve(data)
});

const listEnvelope = { plaques: [{ id: 'a' }, { id: 'b' }], total_count: 2, limit: 5000, offset: 0 };
const searchEnvelope = { plaques: [{ id: 'a' }], total_count: 1, limit: 5000, offset: 0 };

function Consumer({ label }) {
  const { results } = usePlaques();
  return <span data-testid={label}>{results.length}</span>;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('PlaquesProvider dataset', () => {
  it('fetches the summary dataset once and shares it across consumers', async () => {
    global.fetch = vi.fn().mockResolvedValue(resp(listEnvelope));

    await act(async () => {
      render(
        <PlaquesProvider>
          <Consumer label="map" />
          <Consumer label="list" />
        </PlaquesProvider>
      );
    });

    expect(screen.getByTestId('map')).toHaveTextContent('2');
    expect(screen.getByTestId('list')).toHaveTextContent('2');

    const listCalls = fetch.mock.calls.filter((call) => String(call[0]).includes('/list'));
    expect(listCalls).toHaveLength(1);
    expect(listCalls[0][0]).toContain('fields=summary');
  });
});

describe('PlaquesProvider search', () => {
  function SearchHarness() {
    const { setQuery, results, activeQuery } = usePlaques();
    return (
      <div>
        <span data-testid="count">{results.length}</span>
        <span data-testid="query">{activeQuery}</span>
        <button type="button" onClick={() => setQuery('memorial')}>
          first
        </button>
        <button type="button" onClick={() => setQuery('memory')}>
          second
        </button>
      </div>
    );
  }

  it('debounces the query and aborts a superseded search request', async () => {
    vi.useFakeTimers();
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
    global.fetch = vi.fn((url) =>
      Promise.resolve(String(url).includes('/search') ? resp(searchEnvelope) : resp(listEnvelope))
    );

    await act(async () => {
      render(
        <PlaquesProvider>
          <SearchHarness />
        </PlaquesProvider>
      );
    });

    // First query settles after the debounce and issues one search request.
    await act(async () => {
      fireEvent.click(screen.getByText('first'));
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // A second query supersedes the first: its effect cleanup aborts the
    // in-flight request before issuing the new one.
    await act(async () => {
      fireEvent.click(screen.getByText('second'));
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    const searchCalls = fetch.mock.calls.filter((call) => String(call[0]).includes('/search'));
    expect(searchCalls.length).toBeGreaterThanOrEqual(1);
    expect(searchCalls[searchCalls.length - 1][1].signal).toBeInstanceOf(AbortSignal);
    expect(abortSpy).toHaveBeenCalled();
    expect(screen.getByTestId('query')).toHaveTextContent('memory');
  });
});
