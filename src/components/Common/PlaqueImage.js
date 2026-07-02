import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const EMPTY_TEXT = 'No text available';

/**
 * The plaque's transcribed text, or an empty string when there is none.
 */
export function plaqueText(plaque) {
  const text = plaque?.text;
  if (!text || text === EMPTY_TEXT) return '';
  return text;
}

function excerpt(text, max = 80) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function altFor(plaque, kind) {
  const text = excerpt(plaqueText(plaque), 90);
  if (kind === 'photo') {
    return text
      ? `Photo of the plaque in the park reading: ${text}`
      : 'Photo of a plaque in Cancer Survivors Park';
  }
  return text
    ? `Plaque inscription: ${text}`
    : 'A plaque in Cancer Survivors Park';
}

/**
 * Ordered list of candidate sources. The multi-size `urls.*` variants do not
 * exist in storage yet (they 404 today), so they are wired for the future via
 * srcSet but every use falls back through the real assets on error.
 */
function candidatesFor(plaque, kind) {
  const photo = plaque?.photo || {};
  const urls = photo.urls || {};
  const responsive = (urls.small || urls.medium || urls.large)
    ? {
        src: urls.medium || urls.large || urls.small,
        srcSet: [
          urls.small && `${urls.small} 480w`,
          urls.medium && `${urls.medium} 960w`,
          urls.large && `${urls.large} 1600w`
        ]
          .filter(Boolean)
          .join(', ')
      }
    : null;

  const chain =
    kind === 'photo'
      ? [responsive, photo.url && { src: photo.url }, photo.original_url && { src: photo.original_url }, photo.plaque_url && { src: photo.plaque_url }]
      : [photo.plaque_url && { src: photo.plaque_url }, photo.cropped_url && { src: photo.cropped_url }, responsive, photo.url && { src: photo.url }, photo.original_url && { src: photo.original_url }];

  return chain.filter(Boolean);
}

/**
 * Single image element for a plaque. `kind="crop"` renders the cropped plaque
 * image (list thumbnails, detail crop); `kind="photo"` renders the wider
 * context photo. Both centralise the srcSet + onError fallback behaviour.
 */
export default function PlaqueImage({
  plaque,
  kind = 'crop',
  sizes,
  className = '',
  style,
  loading = 'lazy',
  ...rest
}) {
  const candidates = useMemo(() => candidatesFor(plaque, kind), [plaque, kind]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  if (candidates.length === 0 || index >= candidates.length) {
    return (
      <div
        className={`plaque-image-empty ${className}`}
        style={style}
        role="img"
        aria-label={altFor(plaque, kind)}
      >
        <span>No image available</span>
      </div>
    );
  }

  const current = candidates[index];

  return (
    <img
      src={current.src}
      srcSet={current.srcSet}
      sizes={current.srcSet ? sizes : undefined}
      alt={altFor(plaque, kind)}
      className={className}
      style={style}
      loading={loading}
      decoding="async"
      onError={() => setIndex((i) => i + 1)}
      {...rest}
    />
  );
}

PlaqueImage.propTypes = {
  plaque: PropTypes.shape({
    text: PropTypes.string,
    photo: PropTypes.object
  }),
  kind: PropTypes.oneOf(['crop', 'photo']),
  sizes: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  loading: PropTypes.string
};
