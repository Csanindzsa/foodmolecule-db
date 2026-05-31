/**
 * Application environment configuration
 * 
 * This file centralizes all environment-specific URLs and settings.
 * Edit these values to change API endpoints and frontend URLs.
 */

// Base URLs
export const API_BASE_URL = "http://localhost:8000";
export const API_V1_BASE_URL = `${API_BASE_URL}/api/v1`;
export const FRONTEND_BASE_URL = "http://localhost:5173";
export const KOFI_SUPPORT_URL = "https://ko-fi.com/nutrii";

// API Endpoints - built using the base URL
export const API_ENDPOINTS = {
  // Authentication
  login: `${API_BASE_URL}/token/`,
  tokenVerify: `${API_BASE_URL}/token/verify/`,
  tokenRefresh: `${API_BASE_URL}/token/refresh/`,
  register: `${API_BASE_URL}/create-user/`,
  confirmEmail: `${API_BASE_URL}/confirm-email/`,
  oauthStart: (provider: "google" | "apple") => `${API_BASE_URL}/auth/${provider}/start/`,
  oauthLink: (provider: "google" | "apple" | "kofi") => `${API_BASE_URL}/auth/${provider}/link/`,
  
  // User management
  editUser: `${API_BASE_URL}/users/edit/`,
  deleteUser: `${API_BASE_URL}/users/delete/`,
  
  // Basic entities
  restaurants: `${API_BASE_URL}/restaurants/`,
  foods: `${API_V1_BASE_URL}/foods/`,
  foodDetail: (foodId: number | string) => `${API_V1_BASE_URL}/foods/${foodId}/`,
  foodHealthIndex: (foodId: number | string) => `${API_V1_BASE_URL}/foods/${foodId}/health-index/`,
  foodStudies: (foodId: number | string) => `${API_V1_BASE_URL}/foods/${foodId}/studies/`,
  foodGuide: (foodId: number | string) => `${API_V1_BASE_URL}/foods/${foodId}/guide/`,
  foodSearch: (query: string) => `${API_V1_BASE_URL}/foods/search/?q=${encodeURIComponent(query)}`,
  ingredients: `${API_V1_BASE_URL}/molecules/`,
  ingredientDetail: (ingredientId: number | string) => `${API_V1_BASE_URL}/molecules/${ingredientId}/`,
  ingredientSearch: (query: string) => `${API_V1_BASE_URL}/molecules/search/?q=${encodeURIComponent(query)}`,
  categories: `${API_V1_BASE_URL}/categories/`,
  processingMethods: `${API_V1_BASE_URL}/processing-methods/`,
  recentStudies: `${API_V1_BASE_URL}/studies/recent/`,
  stats: `${API_V1_BASE_URL}/stats/`,
  locations: `${API_BASE_URL}/locations/`,
  
  // Food operations
  createFood: `${API_BASE_URL}/foods/create/`,
  approvableFoods: `${API_BASE_URL}/foods/approvable/`,
  acceptFood: (foodId: number | string) => `${API_BASE_URL}/food/${foodId}/accept/`,
  proposeChange: `${API_BASE_URL}/food-changes/propose-change/`,
  proposeRemoval: (foodId: number | string) => `${API_BASE_URL}/food/${foodId}/propose-removal/`,
  
  // Food change approvals
  foodChangeUpdates: `${API_BASE_URL}/food-changes/updates/`,
  foodChangeDeletions: `${API_BASE_URL}/food-changes/deletions/`,
  approveChange: (changeId: number | string) => `${API_BASE_URL}/food-changes/${changeId}/approve-change/`,
  approveRemoval: (changeId: number | string) => `${API_BASE_URL}/food-changes/${changeId}/approve-removal/`,
  
  // Frontend URLs for redirects and email links
  frontendConfirmEmail: (token: string) => `${FRONTEND_BASE_URL}/confirm-email/${token}`,
};

/**
 * Helper function to update the API base URL at runtime
 * Useful for switching between environments
 */
export const updateApiBaseUrl = (newUrl: string) => {
  // This only updates the variable in memory for the current session
  (window as any).__API_BASE_URL = newUrl;
  
  // To actually use the updated URL, you would need to:
  // 1. Reload components that use these endpoints
  // 2. Or implement a more complex state management solution
  console.log(`API base URL updated to: ${newUrl}`);
};

/**
 * Helper function to get the current API base URL
 * Allows for runtime updates through updateApiBaseUrl
 */
export const getApiBaseUrl = () => {
  return (window as any).__API_BASE_URL || API_BASE_URL;
};
