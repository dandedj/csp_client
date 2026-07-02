import PropTypes from 'prop-types';

const EMPTY_TEXT = 'No text available';

/**
 * The signature typographic treatment: the plaque's transcribed text rendered
 * as an engraving — Marcellus, letterspaced, centered, on a subtly darker fog
 * panel bounded by hairline verdigris rules.
 *
 * Variants:
 *  - `hero`    the detail-page centrepiece (full text, fades in)
 *  - `excerpt` the face of a list card (clamped to a few lines)
 *  - `popup`   the compact form inside a map marker popup
 */
export default function InscriptionPanel({ text, variant = 'hero' }) {
  const value = text && text !== EMPTY_TEXT ? text : null;
  const className = `inscription inscription--${variant}`;

  if (!value) {
    return (
      <div className={`${className} inscription--empty`}>
        Inscription not yet transcribed
      </div>
    );
  }

  return <div className={className}>{value}</div>;
}

InscriptionPanel.propTypes = {
  text: PropTypes.string,
  variant: PropTypes.oneOf(['hero', 'excerpt', 'popup'])
};
