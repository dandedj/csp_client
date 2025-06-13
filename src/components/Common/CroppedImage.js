import React from 'react';
import PropTypes from 'prop-types';
import { 
  getImageUrl, 
  getCroppedImageStyle, 
  getCroppedImageContainerStyle, 
  hasCroppingCoordinates,
  getImageAltText 
} from '../../utils/imageUtils';

/**
 * CroppedImage component that displays either a cropped portion of an image
 * or the full image if no cropping coordinates are available
 */
const CroppedImage = ({ 
  plaque, 
  size = 'medium', 
  width = 200, 
  height = 150, 
  className = '', 
  context = 'plaque',
  showFallback = true,
  ...props 
}) => {
  const imageUrl = getImageUrl(plaque, size);
  
  if (!imageUrl) {
    return showFallback ? (
      <div 
        className={`d-flex align-items-center justify-content-center bg-light ${className}`}
        style={{ width, height }}
      >
        <span className="text-muted">No image available</span>
      </div>
    ) : null;
  }

  const hasCropping = hasCroppingCoordinates(plaque);
  
  if (hasCropping) {
    // Display cropped image
    const containerStyle = getCroppedImageContainerStyle(plaque, width, height);
    const imageStyle = getCroppedImageStyle(plaque, size);
    
    return (
      <div 
        className={`cropped-image-container ${className}`}
        style={containerStyle}
        {...props}
      >
        <img
          src={imageUrl}
          alt={getImageAltText(plaque, context)}
          style={imageStyle}
          loading="lazy"
        />
      </div>
    );
  } else {
    // Display full image with standard styling
    return (
      <img
        src={imageUrl}
        alt={getImageAltText(plaque, context)}
        className={`img-fluid ${className}`}
        style={{ width, height, objectFit: 'cover' }}
        loading="lazy"
        {...props}
      />
    );
  }
};

CroppedImage.propTypes = {
  plaque: PropTypes.shape({
    photo: PropTypes.object,
    image_url: PropTypes.string,
    cropping_coordinates: PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number
    }),
    text: PropTypes.string,
    plaque_text: PropTypes.string
  }).isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
  context: PropTypes.oneOf(['thumbnail', 'card', 'detail', 'plaque']),
  showFallback: PropTypes.bool
};

export default CroppedImage; 