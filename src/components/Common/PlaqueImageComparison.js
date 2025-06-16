import React from 'react';
import PropTypes from 'prop-types';
import CroppedImage from './CroppedImage';
import { hasCroppedImageUrl, getCroppedImageUrl, getOriginalImageUrl } from '../../utils/imageUtils';

/**
 * PlaqueImageComparison component that shows both original and cropped images
 * side by side when cropped images are available
 */
const PlaqueImageComparison = ({
  plaque,
  size = 'medium',
  width = 300,
  height = 200,
  className = '',
  showBothWhenAvailable = true,
  ...props
}) => {
  const hasCropped = hasCroppedImageUrl(plaque);
  
  // If no cropped image available, just show the original
  if (!hasCropped || !showBothWhenAvailable) {
    return (
      <CroppedImage
        plaque={plaque}
        size={size}
        width={width}
        height={height}
        className={className}
        imageType="auto"
        {...props}
      />
    );
  }

  // Show both original and cropped side by side
  return (
    <div className={`plaque-image-comparison ${className}`} {...props}>
      <div className="row">
        <div className="col-md-6 mb-3">
          <div className="text-center">
            <h6 className="mb-2 text-muted">Original Photo</h6>
            <CroppedImage
              plaque={plaque}
              size={size}
              width="100%"
              height={height}
              imageType="original"
              className="border rounded"
              style={{objectFit: 'contain'}}
            />
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <div className="text-center">
            <h6 className="mb-2 text-muted">Detected Plaque</h6>
            <CroppedImage
              plaque={plaque}
              size={size}
              width="100%"
              height={height}
              imageType="cropped"
              className="border rounded"
              style={{objectFit: 'contain'}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

PlaqueImageComparison.propTypes = {
  plaque: PropTypes.shape({
    cropped_image_url: PropTypes.string,
    image_url: PropTypes.string,
    photo: PropTypes.object
  }).isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
  showBothWhenAvailable: PropTypes.bool
};

export default PlaqueImageComparison;