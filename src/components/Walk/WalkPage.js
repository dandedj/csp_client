import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlaques } from '../../context/PlaquesContext';
import { pathCentroid, latLonToLocal } from '../../utils/geo3d';
import InscriptionPanel from '../Plaques/InscriptionPanel';
import WalkScene from './WalkScene';

const WALK_PATH_URL = '/geo/walk_path.json';

const CANVAS_LABEL =
  'Interactive 3D walk through Cancer Survivors Park. Drag to look around, ' +
  'and hold the walk buttons or press W and S to move along the path.';

/**
 * Probe for a usable WebGL context without keeping it around. Guards the whole
 * 3D scene so a browser without WebGL gets the friendly fallback instead of a
 * blank canvas.
 */
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch (error) {
    return false;
  }
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function WalkFallback() {
  return (
    <div className="walk-fallback">
      <div className="state-message" role="alert">
        <p>This browser can’t display the 3D walk.</p>
        <Link to="/map" className="btn btn-primary">
          Explore the park on the map
        </Link>
      </div>
    </div>
  );
}

/** Catches a WebGL context-creation throw from the Canvas and shows the map link. */
class WalkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('The 3D walk failed to start', error);
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function WalkPage() {
  const { allPlaques } = usePlaques();

  const [points, setPoints] = useState(null);
  const [pathFailed, setPathFailed] = useState(false);
  const [selected, setSelected] = useState(null);
  const [autoWalk, setAutoWalk] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);

  const controlsRef = useRef({ t: 0, yaw: 0, pitch: 0, forward: 0, back: 0, autoWalk: false });
  const progressRef = useRef(null);

  const webglOk = useMemo(() => isWebGLAvailable(), []);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  // Page title.
  useEffect(() => {
    const previous = document.title;
    document.title = 'Walk the park · Cancer Survivors Park';
    return () => {
      document.title = previous;
    };
  }, []);

  // Load the walking path.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch(WALK_PATH_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`walk_path.json responded ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (active) {
          setPoints(Array.isArray(data.points) ? data.points : []);
        }
      })
      .catch((error) => {
        if (!active || error.name === 'AbortError') {
          return;
        }
        console.error('Failed to load the walk path', error);
        setPathFailed(true);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  // Auto-walk defaults on, but stays off when the visitor prefers reduced motion.
  useEffect(() => {
    const auto = !reducedMotion;
    setAutoWalk(auto);
    controlsRef.current.autoWalk = auto;
  }, [reducedMotion]);

  // Fade the controls hint after a few seconds.
  useEffect(() => {
    const timer = window.setTimeout(() => setHintVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  // Escape closes the plaque card.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Project the path and every plaque with coordinates into local metres.
  const sceneData = useMemo(() => {
    if (!points || points.length < 2) {
      return null;
    }
    const origin = pathCentroid(points);
    const pathLocal = points.map(([lat, lon]) => latLonToLocal(lat, lon, origin));
    const placements = allPlaques
      .filter(
        (plaque) =>
          plaque.location &&
          Number.isFinite(plaque.location.latitude) &&
          Number.isFinite(plaque.location.longitude)
      )
      .map((plaque) => {
        const { x, z } = latLonToLocal(
          plaque.location.latitude,
          plaque.location.longitude,
          origin
        );
        return {
          id: plaque.id,
          text: plaque.text,
          url: plaque.photo?.plaque_url || null,
          x,
          z
        };
      });
    return { pathLocal, placements };
  }, [points, allPlaques]);

  const handleSelect = useCallback((placement) => setSelected(placement), []);

  const handleCanvasReady = useCallback(({ gl }) => {
    gl.domElement.setAttribute('aria-label', CANVAS_LABEL);
    gl.domElement.setAttribute('role', 'img');
  }, []);

  const holdMove = useCallback(
    (direction, active) => () => {
      controlsRef.current[direction] = active ? 1 : 0;
    },
    []
  );

  const toggleAutoWalk = useCallback(() => {
    setAutoWalk((current) => {
      const next = !current;
      controlsRef.current.autoWalk = next;
      return next;
    });
  }, []);

  if (!webglOk || pathFailed) {
    return (
      <div className="walk">
        <WalkFallback />
      </div>
    );
  }

  if (!sceneData) {
    return (
      <div className="walk">
        <div className="walk__loading" role="status" aria-live="polite">
          <span className="visually-hidden">Loading the walk…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="walk">
      <WalkErrorBoundary fallback={<WalkFallback />}>
        <WalkScene
          pathLocal={sceneData.pathLocal}
          placements={sceneData.placements}
          controlsRef={controlsRef}
          progressRef={progressRef}
          onSelect={handleSelect}
          onCanvasReady={handleCanvasReady}
        />
      </WalkErrorBoundary>

      <div className="walk-chip">
        <span className="walk-chip__title">Walk the park</span>
        <span className="walk-chip__count">{sceneData.placements.length} plaques</span>
      </div>

      <p className={`walk-hint${hintVisible ? '' : ' walk-hint--hidden'}`} aria-hidden="true">
        Drag to look · Hold ▲ to walk
      </p>

      <div className="walk-controls">
        <button
          type="button"
          className="walk-btn walk-btn--auto"
          aria-pressed={autoWalk}
          onClick={toggleAutoWalk}
        >
          {autoWalk ? 'Auto-walk: on' : 'Auto-walk: off'}
        </button>
        <div className="walk-controls__move">
          <button
            type="button"
            className="walk-btn walk-btn--move"
            aria-label="Hold to walk forward"
            onPointerDown={holdMove('forward', true)}
            onPointerUp={holdMove('forward', false)}
            onPointerLeave={holdMove('forward', false)}
            onPointerCancel={holdMove('forward', false)}
          >
            ▲
          </button>
          <button
            type="button"
            className="walk-btn walk-btn--move"
            aria-label="Hold to walk back"
            onPointerDown={holdMove('back', true)}
            onPointerUp={holdMove('back', false)}
            onPointerLeave={holdMove('back', false)}
            onPointerCancel={holdMove('back', false)}
          >
            ▼
          </button>
        </div>
      </div>

      <div
        className="walk-progress"
        role="progressbar"
        aria-label="Progress along the walk"
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className="walk-progress__fill" ref={progressRef} />
      </div>

      {selected && (
        <div className="walk-card" role="dialog" aria-label="Plaque inscription">
          <button
            type="button"
            className="walk-card__dismiss"
            aria-label="Close"
            onClick={() => setSelected(null)}
          >
            ×
          </button>
          <InscriptionPanel text={selected.text} variant="popup" />
          <div className="walk-card__actions">
            <Link
              to={`/detail/${encodeURIComponent(selected.id)}`}
              className="btn btn-primary btn-sm"
            >
              Read plaque
            </Link>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
