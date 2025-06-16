import React from 'react';
import PropTypes from 'prop-types';
import { 
  getImageUrl, 
  getCroppedImageStyle, 
  getCroppedImageContainerStyle, 
  hasCroppingCoordinates,
  hasCroppedImageUrl,
  getCroppedImageUrl,
  getOriginalImageUrl,
  getImageAltText 
} from '../../utils/imageUtils';

/**
 * CroppedImage component that displays the cropped plaque image if available,
 * otherwise falls back to the original image or cropping coordinates
 */
const CroppedImage = ({ 
  plaque, 
  size = 'medium', 
  width = 200, 
  height = 150, 
  className = '', 
  context = 'plaque',
  showFallback = true,
  imageType = 'auto', // 'auto', 'cropped', 'original'
  style = {},
  ...props 
}) => {
  // Determine which image to show based on imageType and availability
  let imageUrl = null;
  let isUsingCroppedUrl = false;
  
  if (imageType === 'cropped' || (imageType === 'auto' && hasCroppedImageUrl(plaque))) {
    imageUrl = getCroppedImageUrl(plaque);
    isUsingCroppedUrl = !!imageUrl;
  }
  
  // Fall back to original image if no cropped URL or if specifically requested
  if (!imageUrl || imageType === 'original') {
    imageUrl = getOriginalImageUrl(plaque, size);
    isUsingCroppedUrl = false;
  }
  
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

  // Check if we need to fall back to old cropping coordinate method
  const hasCropping = !isUsingCroppedUrl && hasCroppingCoordinates(plaque);
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('CroppedImage debug:', {
      plaqueId: plaque?.id,
      imageType,
      isUsingCroppedUrl,
      hasCroppedImageUrl: hasCroppedImageUrl(plaque),
      hasCropping,
      croppedImageUrl: plaque?.cropped_image_url,
      croppingCoordinates: plaque?.cropping_coordinates,
      imageUrl,
      size,
      context
    });
  }
  
  if (isUsingCroppedUrl) {
    // Using the new cropped image URL - display directly
    const imageStyle = {
      width,
      ...(height === 'auto' ? {} : { height }),
      objectFit: style.objectFit || (height === 'auto' ? 'contain' : 'cover'),
      ...style
    };
    
    return (
      <img
        src={imageUrl}
        alt={getImageAltText(plaque, context)}
        className={`img-fluid ${className}`}
        style={imageStyle}
        loading="lazy"
        title="Cropped plaque image"
        {...props}
      />
    );
  } else if (hasCropping) {
    // Fall back to old cropping coordinate method for backward compatibility
    const coords = plaque.cropping_coordinates;
    
    // Calculate scale to zoom into the cropped region
    const scaleX = 1 / (coords.width || 1);
    const scaleY = 1 / (coords.height || 1);
    const scale = Math.min(scaleX, scaleY); // Use uniform scale to maintain aspect ratio
    
    // Calculate translation to center the cropped region
    const translateX = -(coords.x || 0) * 100;
    const translateY = -(coords.y || 0) * 100;
    
    const containerStyle = {
      width,
      height,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: '#f8f9fa'
    };
    
    const imageStyle = {
      width: '100%',
      height: 'auto',
      transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
      transformOrigin: '0 0',
      position: 'absolute',
      top: 0,
      left: 0
    };
    
    return (
      <div 
        className={`cropped-image-container ${className}`}
        style={containerStyle}
        title={`Cropped image: ${Math.round(coords.x * 100)}%, ${Math.round(coords.y * 100)}%, ${Math.round(coords.width * 100)}% × ${Math.round(coords.height * 100)}%`}
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
    const imageStyle = {
      width,
      ...(height === 'auto' ? {} : { height }),
      objectFit: style.objectFit || (height === 'auto' ? 'contain' : 'cover'),
      ...style
    };
    
    return (
      <img
        src={imageUrl}
        alt={getImageAltText(plaque, context)}
        className={`img-fluid ${className}`}
        style={imageStyle}
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
    cropped_image_url: PropTypes.string,
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
  showFallback: PropTypes.bool,
  imageType: PropTypes.oneOf(['auto', 'cropped', 'original']),
  style: PropTypes.object
};

export default CroppedImage; 