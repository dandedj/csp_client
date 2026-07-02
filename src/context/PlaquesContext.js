import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { plaquesService } from '../services/PlaquesService';
import { useDebounce } from '../hooks/useDebounce';

const PlaquesContext = createContext(null);

// The full summary dataset is ~1,238 rows (~50KB gzipped); fetch it all once.
const DATASET_LIMIT = 5000;

/**
 * Owns the plaque dataset and the search query for the whole app.
 *
 * The summary dataset is fetched exactly once and shared by the map and list
 * views. The search query lives here (above the routes) so navigating between
 * views never resets it. When a query is active, `results` are the server
 * search results; otherwise they are the full dataset. Both fetches use an
 * AbortController and a stale-response guard so rapid typing or unmounts can
 * never apply an out-of-date response.
 */
export function PlaquesProvider({ children }) {
  const [allPlaques, setAllPlaques] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [dataStatus, setDataStatus] = useState('loading');
  const [reloadToken, setReloadToken] = useState(0);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const activeQuery = debouncedQuery.trim();
  const isSearching = activeQuery.length > 0;

  const [searchResults, setSearchResults] = useState([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchStatus, setSearchStatus] = useState('idle');

  // Fetch the full summary dataset once (re-run only on explicit retry).
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setDataStatus('loading');
    plaquesService
      .listPlaques({
        fields: 'summary',
        limit: DATASET_LIMIT,
        signal: controller.signal
      })
      .then((result) => {
        if (!active) return;
        setAllPlaques(result.plaques);
        setTotalCount(result.totalCount);
        setDataStatus('ready');
      })
      .catch((error) => {
        if (!active || error.name === 'AbortError') return;
        setDataStatus('error');
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken]);

  // Run a server search whenever the debounced query settles.
  useEffect(() => {
    if (!activeQuery) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearchStatus('idle');
      return undefined;
    }
    const controller = new AbortController();
    let active = true;
    setSearchStatus('loading');
    plaquesService
      .searchPlaques({
        query: activeQuery,
        fields: 'summary',
        limit: DATASET_LIMIT,
        signal: controller.signal
      })
      .then((result) => {
        if (!active) return;
        setSearchResults(result.plaques);
        setSearchTotal(result.totalCount);
        setSearchStatus('ready');
      })
      .catch((error) => {
        if (!active || error.name === 'AbortError') return;
        setSearchStatus('error');
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [activeQuery]);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  const value = useMemo(() => {
    const status = isSearching ? searchStatus : dataStatus;
    return {
      allPlaques,
      dataStatus,
      totalCount,
      query,
      setQuery,
      activeQuery,
      isSearching,
      results: isSearching ? searchResults : allPlaques,
      resultsTotal: isSearching ? searchTotal : totalCount,
      status,
      loading: status === 'loading',
      error: status === 'error',
      retry
    };
  }, [
    allPlaques,
    dataStatus,
    totalCount,
    query,
    activeQuery,
    isSearching,
    searchResults,
    searchTotal,
    searchStatus,
    retry
  ]);

  return (
    <PlaquesContext.Provider value={value}>{children}</PlaquesContext.Provider>
  );
}

export function usePlaques() {
  const context = useContext(PlaquesContext);
  if (!context) {
    throw new Error('usePlaques must be used within a PlaquesProvider');
  }
  return context;
}

export { PlaquesContext };
export default PlaquesContext;
