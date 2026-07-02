import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Card } from 'react-bootstrap';
import InscriptionPanel from './InscriptionPanel';
import PlaqueImage from '../Common/PlaqueImage';

/**
 * A single card in the list grid: the inscription excerpt as the face, a small
 * plaque crop, and actions to read the plaque or find it on the map.
 */
export default function PlaqueCard({ plaque, distanceLabel }) {
  const detailPath = `/detail/${plaque.id}`;
  const mapPath = `/?plaque=${encodeURIComponent(plaque.id)}`;

  return (
    <Card as="article" className="plaque-card h-100">
      <Link to={detailPath} className="plaque-card__media">
        <PlaqueImage
          plaque={plaque}
          kind="crop"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 360px"
          className="plaque-card__thumb"
        />
      </Link>
      <Card.Body className="plaque-card__body">
        <InscriptionPanel text={plaque.text} variant="excerpt" />
        {distanceLabel && <p className="wayfinding plaque-card__distance">{distanceLabel}</p>}
      </Card.Body>
      <Card.Footer className="plaque-card__actions">
        <Link to={detailPath} className="btn btn-primary btn-sm">
          Read plaque
        </Link>
        <Link to={mapPath} className="btn btn-outline-primary btn-sm">
          View on map
        </Link>
      </Card.Footer>
    </Card>
  );
}

PlaqueCard.propTypes = {
  plaque: PropTypes.shape({
    id: PropTypes.string.isRequired,
    text: PropTypes.string,
    photo: PropTypes.object
  }).isRequired,
  distanceLabel: PropTypes.string
};
