/**
 * Utility functions for handling responsive image URLs for Cancer Survivor Park plaques
 */

/**
 * Get the appropriate image URL based on the size and context
 * @param {Object} plaque - The plaque object containing photo information
 * @param {string} size - The desired image size ('small', 'medium', 'large')
 * @param {string} fallbackSize - Fallback size if preferred size is not available
 * @returns {string} The appropriate image URL
 */
export const getImageUrl = (plaque, size = 'medium', fallbackSize = 'medium') => {
  if (!plaque) {
    return null;
  }

  // Check for new multi-size URL structure
  if (plaque.photo?.urls) {
    return plaque.photo.urls[size] || 
           plaque.photo.urls[fallbackSize] || 
           plaque.photo.urls.medium || 
           plaque.photo.urls.large || 
           plaque.photo.urls.small ||
           plaque.photo.url;
  }

  // Fallback to legacy single URL structure
  return plaque.photo?.url || plaque.image_url;
};

/**
 * Get cropped image style based on cropping coordinates
 * @param {Object} plaque - The plaque object containing cropping coordinates
 * @param {string} size - The desired image size context
 * @returns {Object} CSS style object for cropped image display
 */
export const getCroppedImageStyle = (plaque, size = 'medium') => {
  if (!plaque?.cropping_coordinates) {
    return {};
  }

  const coords = plaque.cropping_coordinates;
  
  // Calculate the crop dimensions as percentages
  const cropX = (coords.x || 0) * 100;
  const cropY = (coords.y || 0) * 100;
  const cropWidth = (coords.width || 1) * 100;
  const cropHeight = (coords.height || 1) * 100;

  // Calculate the scale factor to show only the cropped area
  const scaleX = 100 / cropWidth;
  const scaleY = 100 / cropHeight;

  return {
    objectFit: 'none',
    objectPosition: `-${cropX * scaleX}% -${cropY * scaleY}%`,
    transform: `scale(${scaleX}, ${scaleY})`,
    transformOrigin: 'top left',
    width: '100%',
    height: '100%'
  };
};

/**
 * Get cropped image container style
 * @param {Object} plaque - The plaque object containing cropping coordinates
 * @param {number} displayWidth - The desired display width
 * @param {number} displayHeight - The desired display height
 * @returns {Object} CSS style object for the container
 */
export const getCroppedImageContainerStyle = (plaque, displayWidth, displayHeight) => {
  if (!plaque?.cropping_coordinates) {
    return {
      width: displayWidth,
      height: displayHeight,
      overflow: 'hidden'
    };
  }

  const coords = plaque.cropping_coordinates;
  const aspectRatio = (coords.width || 1) / (coords.height || 1);
  
  // Maintain aspect ratio while fitting within display dimensions
  let containerWidth = displayWidth;
  let containerHeight = displayHeight;
  
  if (displayWidth / displayHeight > aspectRatio) {
    containerWidth = displayHeight * aspectRatio;
  } else {
    containerHeight = displayWidth / aspectRatio;
  }

  return {
    width: containerWidth,
    height: containerHeight,
    overflow: 'hidden',
    position: 'relative',
    margin: '0 auto'
  };
};

/**
 * Check if plaque has cropping coordinates
 * @param {Object} plaque - The plaque object
 * @returns {boolean} True if cropping coordinates exist
 */
export const hasCroppingCoordinates = (plaque) => {
  return plaque?.cropping_coordinates && 
         typeof plaque.cropping_coordinates.x === 'number' &&
         typeof plaque.cropping_coordinates.y === 'number' &&
         typeof plaque.cropping_coordinates.width === 'number' &&
         typeof plaque.cropping_coordinates.height === 'number';
};

/**
 * Get thumbnail image URL (small size) for list views
 * @param {Object} plaque - The plaque object
 * @returns {string} Small image URL
 */
export const getThumbnailUrl = (plaque) => {
  return getImageUrl(plaque, 'small', 'medium');
};

/**
 * Get medium image URL for card views and modals
 * @param {Object} plaque - The plaque object
 * @returns {string} Medium image URL
 */
export const getCardImageUrl = (plaque) => {
  return getImageUrl(plaque, 'medium', 'large');
};

/**
 * Get large image URL for detail views
 * @param {Object} plaque - The plaque object
 * @returns {string} Large image URL
 */
export const getDetailImageUrl = (plaque) => {
  return getImageUrl(plaque, 'large', 'medium');
};

/**
 * Get the best available image URL for a given maximum width
 * @param {Object} plaque - The plaque object
 * @param {number} maxWidth - Maximum width needed for the image
 * @returns {string} Most appropriate image URL
 */
export const getResponsiveImageUrl = (plaque, maxWidth) => {
  if (maxWidth <= 200) {
    return getThumbnailUrl(plaque);
  } else if (maxWidth <= 800) {
    return getCardImageUrl(plaque);
  } else {
    return getDetailImageUrl(plaque);
  }
};

/**
 * Get image source set for responsive images
 * @param {Object} plaque - The plaque object
 * @returns {string} srcSet string for responsive images
 */
export const getImageSrcSet = (plaque) => {
  if (!plaque?.photo?.urls) {
    return null;
  }

  const urls = plaque.photo.urls;
  const srcSet = [];

  if (urls.small) {
    srcSet.push(`${urls.small} 150w`);
  }
  if (urls.medium) {
    srcSet.push(`${urls.medium} 600w`);
  }
  if (urls.large) {
    srcSet.push(`${urls.large} 1200w`);
  }

  return srcSet.length > 0 ? srcSet.join(', ') : null;
};

/**
 * Get sizes attribute for responsive images
 * @param {string} context - The context where the image is used ('thumbnail', 'card', 'detail')
 * @returns {string} sizes attribute value
 */
export const getImageSizes = (context) => {
  switch (context) {
    case 'thumbnail':
      return '(max-width: 768px) 80px, 150px';
    case 'card':
      return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px';
    case 'detail':
      return '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px';
    default:
      return '100vw';
  }
};

/**
 * Get alt text for plaque images
 * @param {Object} plaque - The plaque object
 * @param {string} context - The context for the alt text
 * @returns {string} Appropriate alt text
 */
export const getImageAltText = (plaque, context = 'plaque') => {
  if (!plaque) {
    return 'Cancer Survivor Park plaque image';
  }

  const plaqueText = plaque.text || plaque.plaque_text;
  const truncatedText = plaqueText 
    ? plaqueText.substring(0, 50) + (plaqueText.length > 50 ? '...' : '')
    : 'No description available';

  switch (context) {
    case 'thumbnail':
      return `Thumbnail of Cancer Survivor Park plaque: ${truncatedText}`;
    case 'detail':
      return `Photo of Cancer Survivor Park plaque with text: ${truncatedText}`;
    default:
      return `Photo of Cancer Survivor Park plaque: ${truncatedText}`;
  }
};