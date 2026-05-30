/**
 * Helper function to get the correct image path for a restaurant
 * This will return either an absolute image URL or a placeholder.
 * Local restaurant photo assets were removed during repository cleanup.
 */
export const getRestaurantImage = (imageValue: string | undefined, isLocalAsset?: boolean): string => {
  if (!imageValue) {
    return 'https://via.placeholder.com/300x180?text=Restaurant';
  }

  if (isLocalAsset || (!imageValue.startsWith('http://') && !imageValue.startsWith('https://'))) {
    return 'https://via.placeholder.com/300x180?text=Restaurant';
  }

  return imageValue;
};

/**
 * Default restaurant images that can be used when creating new restaurants
 */
export const defaultRestaurantImages = [
  'https://via.placeholder.com/300x180?text=Restaurant',
];

/**
 * Get a random default restaurant image
 */
export const getRandomRestaurantImage = (): string => {
  const randomIndex = Math.floor(Math.random() * defaultRestaurantImages.length);
  return defaultRestaurantImages[randomIndex];
};
