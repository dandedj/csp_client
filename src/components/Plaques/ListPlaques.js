import { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Form, Button, Placeholder } from 'react-bootstrap';
import { usePlaques } from '../../context/PlaquesContext';
import {
  useGeolocation,
  haversineMeters,
  formatDistance
} from '../../hooks/useGeolocation';
import PlaqueCard from './PlaqueCard';

const PAGE_SIZE = 48;

function distanceMeters(plaque, location) {
  const loc = plaque?.location;
  if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
    return null;
  }
  return haversineMeters(location, loc);
}

function LoadingGrid() {
  return (
    <Row xs={1} md={2} lg={3} className="g-4" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <Col key={index}>
          <div className="plaque-card h-100 card">
            <Placeholder as="div" animation="glow" className="plaque-card__media">
              <Placeholder xs={12} className="plaque-card__thumb" />
            </Placeholder>
            <div className="card-body">
              <Placeholder as="p" animation="glow">
                <Placeholder xs={12} /> <Placeholder xs={10} /> <Placeholder xs={8} />
              </Placeholder>
            </div>
          </div>
        </Col>
      ))}
    </Row>
  );
}

export default function ListPlaques() {
  const {
    query,
    setQuery,
    results,
    resultsTotal,
    loading,
    error,
    isSearching,
    activeQuery,
    retry
  } = usePlaques();
  const { location } = useGeolocation();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortByNearest, setSortByNearest] = useState(false);

  useEffect(() => {
    document.title = 'All plaques · Cancer Survivors Park';
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeQuery, results, sortByNearest]);

  const ordered = useMemo(() => {
    if (!(sortByNearest && location)) return results;
    return [...results].sort(
      (a, b) =>
        (distanceMeters(a, location) ?? Infinity) -
        (distanceMeters(b, location) ?? Infinity)
    );
  }, [results, sortByNearest, location]);

  const visible = ordered.slice(0, visibleCount);

  return (
    <Container className="list-page py-4">
      <div className="list-page__head">
        <h1 className="page-title">All plaques</h1>
        <Form
          className="search-field"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <Form.Label htmlFor="list-search" className="visually-hidden">
            Search plaques
          </Form.Label>
          <Form.Control
            id="list-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names or words on a plaque"
            aria-label="Search names or words on a plaque"
          />
        </Form>
      </div>

      {error ? (
        <div className="state-message" role="alert">
          <p>The plaques couldn&apos;t load. Check your connection and try again.</p>
          <Button variant="primary" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="list-page__toolbar">
            <p className="results-count wayfinding" aria-live="polite">
              {loading && results.length === 0
                ? 'Loading plaques…'
                : `Showing ${Math.min(visible.length, resultsTotal)} of ${resultsTotal}`}
            </p>
            {location && (
              <Form.Check
                type="switch"
                id="sort-nearest"
                label="Sort by nearest"
                checked={sortByNearest}
                onChange={(event) => setSortByNearest(event.target.checked)}
              />
            )}
          </div>

          {loading && results.length === 0 ? (
            <LoadingGrid />
          ) : visible.length === 0 ? (
            <div className="state-message">
              {isSearching ? (
                <p>
                  No plaques match &lsquo;{activeQuery}&rsquo;. Try a shorter part of the
                  name.
                </p>
              ) : (
                <p>There are no plaques to show yet.</p>
              )}
            </div>
          ) : (
            <>
              <Row xs={1} md={2} lg={3} className="g-4">
                {visible.map((plaque) => (
                  <Col key={plaque.id}>
                    <PlaqueCard
                      plaque={plaque}
                      distanceLabel={
                        location
                          ? formatDistance(distanceMeters(plaque, location))
                          : null
                      }
                    />
                  </Col>
                ))}
              </Row>
              {visibleCount < ordered.length && (
                <div className="list-page__more">
                  <Button
                    variant="outline-primary"
                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  >
                    Show more
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Container>
  );
}
