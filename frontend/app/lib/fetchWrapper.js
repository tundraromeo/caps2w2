/**
 * Fetch Wrapper with CORS Support
 * Centralized fetch function with proper CORS configuration
 * Use this instead of direct fetch() calls to ensure CORS works properly
 */

import { API_BASE_URL } from './apiConfig';

/**
 * Enhanced fetch with CORS support
 * @param {string} url - Full URL or relative path
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function fetchWithCORS(url, options = {}) {
  // Merge default CORS options with custom options
  const defaultOptions = {
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: defaultOptions.headers,
  };

  try {
    const response = await fetch(url, finalOptions);
    return response;
  } catch (error) {
    // Network error occurred
    throw error;
  }
}

/**
 * POST request with CORS
 * @param {string} url - API endpoint URL
 * @param {object} data - Data to send in body
 * @returns {Promise<Response>}
 */
export async function postWithCORS(url, data = {}) {
  return fetchWithCORS(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * GET request with CORS
 * @param {string} url - API endpoint URL
 * @returns {Promise<Response>}
 */
export async function getWithCORS(url) {
  return fetchWithCORS(url, {
    method: 'GET',
  });
}

/**
 * Helper to get proper API URL
 * @param {string} endpoint - Endpoint filename (e.g., 'backend.php')
 * @returns {string} Full API URL
 */
export function getAPIUrl(endpoint) {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
}

// Export default for convenience
export default {
  fetch: fetchWithCORS,
  post: postWithCORS,
  get: getWithCORS,
  getAPIUrl,
};


