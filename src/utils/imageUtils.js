/**
 * Utility functions for handling responsive image URLs for Cancer Survivor Park plaques
 */

/**
 * Get the appropriate image URL based on the size and context
 * @param {Object} plaque - The plaque object containing photo information
 * @param {string} size - The desired image size ('small', 'medium', 'large')
 * @param {string} fallbackSize - Fallback size if preferred size is not available
 * @param {string} imageType - Type of image to get ('cropped', 'original', 'auto')
 * @returns {string} The appropriate image URL
 */
export const getImageUrl = (plaque, size = 'medium', fallbackSize = 'medium', imageType = 'auto') => {
  if (!plaque) {
    return null;
  }

  // If requesting cropped image specifically and it exists, return it
  if (imageType === 'cropped' && plaque.cropped_image_url) {
    return plaque.cropped_image_url;
  }

  // If requesting original image specifically, use the actual URL from database
  if (imageType === 'original') {
    // Use the actual URL from the database, not the constructed multi-size URLs
    return plaque.photo?.url || plaque.image_url;
  }

  // Auto mode: prefer cropped image if available, otherwise use original
  if (imageType === 'auto' && plaque.cropped_image_url) {
    return plaque.cropped_image_url;
  }

  // For all other cases, use the actual URL from the database
  // The multi-size URLs don't exist - they were a planned feature that wasn't implemented
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
  
  // Use clip-path for precise cropping
  const x1 = (coords.x || 0) * 100;
  const y1 = (coords.y || 0) * 100;
  const x2 = ((coords.x || 0) + (coords.width || 1)) * 100;
  const y2 = ((coords.y || 0) + (coords.height || 1)) * 100;

  return {
    width: '100%',
    height: 'auto',
    clipPath: `inset(${y1}% ${100 - x2}% ${100 - y2}% ${x1}%)`,
    // Keep the image at its natural size within the clipped area
    objectFit: 'cover',
    objectPosition: 'center'
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
  
  // Since we're using clip-path, we need to adjust the container size
  // to account for the fact that the clipped area is smaller than the full image
  const containerStyle = {
    width: displayWidth,
    height: displayHeight,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0'
  };

  return containerStyle;
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
 * Check if plaque has a cropped image URL
 * @param {Object} plaque - The plaque object
 * @returns {boolean} True if cropped image URL exists
 */
export const hasCroppedImageUrl = (plaque) => {
  return Boolean(plaque?.cropped_image_url);
};

/**
 * Get the cropped image URL if available
 * @param {Object} plaque - The plaque object
 * @returns {string|null} Cropped image URL or null
 */
export const getCroppedImageUrl = (plaque) => {
  return plaque?.cropped_image_url || null;
};

/**
 * Get the original image URL (never cropped)
 * @param {Object} plaque - The plaque object
 * @param {string} size - The desired image size
 * @returns {string|null} Original image URL
 */
export const getOriginalImageUrl = (plaque, size = 'medium') => {
  return getImageUrl(plaque, size, 'medium', 'original');
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
  // Multi-size URLs are not implemented - return null
  return null;
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