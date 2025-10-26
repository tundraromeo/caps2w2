/**
 * Centralized API Configuration
 * Single source of truth for all API endpoints
 * 
 * Usage:
 * import { API_BASE_URL, getApiUrl } from '@/app/lib/apiConfig';
 * 
 * const url = getApiUrl('backend.php');
 * // or
 * const url = `${API_BASE_URL}/backend.php`;
 */

// Get base URL from environment variable with fallback
const getBaseUrl = () => {
  // Debug logging
  console.log('🔍 Environment variable NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
  console.log('🔍 Node Environment:', process.env.NODE_ENV);
  
  // Use environment variable if available
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    console.log('✅ Using configured API URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // Check if we're in production (Vercel)
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isVercel || isProduction) {
    console.error('❌ CRITICAL: NEXT_PUBLIC_API_BASE_URL not set in production!');
    console.error('Please add NEXT_PUBLIC_API_BASE_URL environment variable in Vercel settings.');
    console.error('Expected format: https://your-domain.com/backend/Api');
    
    // Return a placeholder that will show an error - better than using localhost
    return 'https://MISSING-BACKEND-URL.vercel.app';
  }
  
  // Fallback to local development URL (only for localhost)
  const localUrl = 'http://localhost/caps2w2/backend/Api';
  console.log('⚠️ Using local development URL (localhost only):', localUrl);
  return localUrl;
};

export const API_BASE_URL = getBaseUrl();

/**
 * Get full API URL for a specific endpoint
 * @param {string} endpoint - API endpoint filename (e.g., 'backend.php')
 * @returns {string} Full API URL
 */
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const fullUrl = `${API_BASE_URL}/${cleanEndpoint}`;
  
  return fullUrl;
};

/**
 * Common API endpoints
 */
export const API_ENDPOINTS = {
  // Main backend
  BACKEND: 'backend.php',
  LOGIN: 'login.php',
  
  // Specific APIs
  SALES: 'sales_api.php',
  TRANSFER: 'transfer_api.php',
  CONVENIENCE: 'convenience_store_api.php',
  PHARMACY: 'pharmacy_api.php',
  
  // Purchase Orders
  PURCHASE_ORDER: 'purchase_order_api.php',
  PURCHASE_ORDER_SIMPLE: 'purchase_order_api_simple.php',
  CREATE_PURCHASE_ORDER: 'create_purchase_order_api.php',
  
  // Stock Management
  STOCK_ADJUSTMENT: 'batch_stock_adjustment_api.php',
  STOCK_SUMMARY: 'stock_summary_api.php',
  BATCH_TRACKING: 'batch_tracking.php',
  
  // Returns & Exchanges
  POS_RETURN: 'pos_return_api.php',
  POS_EXCHANGE: 'pos_exchange_api.php',
  
  // Transfers
  FIFO_TRANSFER: 'fifo_transfer_api.php',
  BATCH_TRANSFER: 'batch_transfer_api.php',
  INVENTORY_TRANSFER: 'inventory_transfer_api.php',
  
  // Dashboard & Reports
  DASHBOARD_SALES: 'dashboard_sales_api.php',
  DASHBOARD_RETURN: 'dashboard_return_api.php',
  DASHBOARD_TRANSFER: 'dashboard_transfer_api.php',
  COMBINED_REPORTS: 'combined_reports_api.php',
  
  // Printing
  PRINT_RECEIPT: 'print-receipt-fixed-width.php',
  QZ_TRAY_RECEIPT: 'qz-tray-receipt.php',
  
  // Other
  BARCODE: 'barcode_api.php',
  WAREHOUSE_PRODUCT_NAME: 'warehouse_product_name_api.php',
  INVENTORY: 'inventory_api.php',
  PRODUCTS: 'products_api.php',
  BATCH_FUNCTIONS: 'batch_functions_api.php',
  GET_TRANSFERRED_BATCHES: 'get_transferred_batches_api.php',
};

/**
 * Get full URL for a named endpoint
 * @param {string} endpointName - Name from API_ENDPOINTS
 * @returns {string} Full API URL
 */
export const getNamedApiUrl = (endpointName) => {
  const endpoint = API_ENDPOINTS[endpointName];
  if (!endpoint) {
    return getApiUrl('backend.php'); // fallback
  }
  return getApiUrl(endpoint);
};

/**
 * Check if API is configured properly
 * @returns {boolean}
 */
export const isApiConfigured = () => {
  return !!process.env.NEXT_PUBLIC_API_BASE_URL;
};

/**
 * Get API configuration status for debugging
 * @returns {object}
 */
export const getApiConfigStatus = () => {
  return {
    baseUrl: API_BASE_URL,
    isConfigured: isApiConfigured(),
    usingDefault: !process.env.NEXT_PUBLIC_API_BASE_URL,
    environment: process.env.NODE_ENV,
  };
};

// Export default
export default {
  API_BASE_URL,
  API_ENDPOINTS,
  getApiUrl,
  getNamedApiUrl,
  isApiConfigured,
  getApiConfigStatus,
};

