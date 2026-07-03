import { Suspense, lazy, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Accordion,
  Button,
  Placeholder
} from 'react-bootstrap';
import { plaquesService } from '../../services/PlaquesService';
import {
  useGeolocation,
  haversineMeters,
  formatDistance
} from '../../hooks/useGeolocation';
import InscriptionPanel from './InscriptionPanel';
import PlaqueImage, { plaqueText } from '../Common/PlaqueImage';

const FindInPark = lazy(() => import('./FindInPark'));

const SERVICE_LABELS = {
  openai: 'OpenAI',
  claude: 'Claude',
  google_vision: 'Google Vision',
  gemini: 'Gemini'
};

function titleFor(plaque) {
  const text = plaqueText(plaque);
  if (!text) return 'Plaque';
  const firstLine = text.split('\n')[0].trim();
  return firstLine.length > 60 ? `${firstLine.slice(0, 60).trimEnd()}…` : firstLine;
}

/**
 * The source photo with the detected plaque outlined. Box coordinates are
 * detection-frame pixels; exif_data.image carries the frame dimensions, so
 * the overlay is positioned in percentages and survives responsive resizing.
 */
function PhotoWithHighlight({ plaque }) {
  const bbox = plaque.yolo_detection?.bbox;
  const frame = plaque.photo?.exif_data?.image;
  const box =
    bbox &&
    frame?.width > 0 &&
    frame?.height > 0 &&
    bbox.x2 > bbox.x1 &&
    bbox.y2 > bbox.y1
      ? {
          left: `${(bbox.x1 / frame.width) * 100}%`,
          top: `${(bbox.y1 / frame.height) * 100}%`,
          width: `${((bbox.x2 - bbox.x1) / frame.width) * 100}%`,
          height: `${((bbox.y2 - bbox.y1) / frame.height) * 100}%`
        }
      : null;

  return (
    <div className="photo-highlight">
      <PlaqueImage
        plaque={plaque}
        kind="photo"
        sizes="(max-width: 768px) 100vw, 50vw"
        className="detail-figure__img"
      />
      {box && <span className="photo-highlight__box" style={box} aria-hidden="true" />}
    </div>
  );
}

function agreementCopy(plaque, entries) {
  const responded = entries.filter(([, r]) => r && r.text).length;
  const agree = plaque.agreement_count || 0;
  const total = plaque.total_services || entries.length || 0;
  if (responded <= 1) {
    return responded === 1
      ? 'Only one AI service could read this plaque, so the transcription is less certain.'
      : null;
  }
  if (agree >= 2) {
    return `${agree} of ${total} AI readings match (ignoring case and spacing).`;
  }
  return `The ${responded} AI readings differ — the most consistent one is shown above.`;
}

function TranscriptionDetails({ plaque }) {
  const extractions = plaque.individual_extractions || {};
  const entries = Object.entries(extractions);
  const meta = agreementCopy(plaque, entries);

  return (
    <Accordion className="detail-accordion">
      <Accordion.Item eventKey="0">
        <Accordion.Header>Transcription details</Accordion.Header>
        <Accordion.Body>
          {meta && <p className="wayfinding detail-accordion__meta">{meta}</p>}
          {entries.length > 0 ? (
            <dl className="service-results">
              {entries.map(([service, result]) => (
                <div key={service} className="service-results__item">
                  <dt>{SERVICE_LABELS[service] || service}</dt>
                  <dd>
                    {result && result.text ? (
                      result.text
                    ) : (
                      <span className="text-muted">No text found</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-muted mb-0">No per-service transcription is available.</p>
          )}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}

export default function PlaqueDetail() {
  const { id } = useParams();
  const { location } = useGeolocation();
  const [plaque, setPlaque] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'missing' | 'error'

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setStatus('loading');
    document.title = 'Plaque · Cancer Survivors Park';
    plaquesService
      .getPlaque(id, { signal: controller.signal })
      .then((result) => {
        if (!active) return;
        if (!result) {
          setStatus('missing');
          return;
        }
        setPlaque(result);
        setStatus('ready');
      })
      .catch((error) => {
        if (!active || error.name === 'AbortError') return;
        setStatus('error');
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  useEffect(() => {
    if (status === 'ready' && plaque) {
      document.title = `${titleFor(plaque)} · Cancer Survivors Park`;
    }
  }, [status, plaque]);

  if (status === 'loading') {
    return (
      <Container className="detail-page py-4">
        <Placeholder as="div" animation="glow" className="inscription inscription--hero">
          <Placeholder xs={8} /> <Placeholder xs={6} /> <Placeholder xs={7} />
        </Placeholder>
      </Container>
    );
  }

  if (status === 'error' || status === 'missing') {
    return (
      <Container className="detail-page py-4">
        <div className="state-message" role="alert">
          <p>
            {status === 'missing'
              ? "We couldn't find that plaque."
              : "The plaques couldn't load. Check your connection and try again."}
          </p>
          <Link to="/plaques" className="btn btn-primary">
            Back to all plaques
          </Link>
        </div>
      </Container>
    );
  }

  const position = (() => {
    const loc = plaque.location;
    if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      return [loc.latitude, loc.longitude];
    }
    return null;
  })();
  const distanceLabel =
    location && position
      ? formatDistance(haversineMeters(location, { latitude: position[0], longitude: position[1] }))
      : null;

  return (
    <Container className="detail-page py-4">
      <Link to="/plaques" className="detail-page__back">
        ← All plaques
      </Link>

      <h1 className="visually-hidden">{titleFor(plaque)}</h1>

      <InscriptionPanel text={plaque.text} variant="hero" />

      <Row className="detail-page__images g-4">
        <Col xs={12} md={6}>
          <figure className="detail-figure">
            <PlaqueImage
              plaque={plaque}
              kind="crop"
              sizes="(max-width: 768px) 100vw, 50vw"
              className="detail-figure__img"
            />
            <figcaption className="wayfinding">The plaque</figcaption>
          </figure>
        </Col>
        <Col xs={12} md={6}>
          <figure className="detail-figure">
            <PhotoWithHighlight plaque={plaque} />
            <figcaption className="wayfinding">
              In the park
              {plaque.photo?.original_url && (
                <>
                  {' · '}
                  <a href={plaque.photo.original_url} target="_blank" rel="noopener noreferrer">
                    Open the original photo
                  </a>
                </>
              )}
            </figcaption>
          </figure>
        </Col>
      </Row>

      {position && (
        <section className="detail-section">
          <h2 className="section-title">Find it in the park</h2>
          {distanceLabel && <p className="wayfinding">{distanceLabel}</p>}
          <Suspense fallback={<div className="detail-map detail-map--loading" aria-hidden="true" />}>
            <FindInPark position={position} />
          </Suspense>
          <Button as={Link} to={`/?plaque=${encodeURIComponent(plaque.id)}`} variant="outline-primary" className="mt-3">
            View on map
          </Button>
        </section>
      )}

      <section className="detail-section">
        <TranscriptionDetails plaque={plaque} />
      </section>
    </Container>
  );
}
