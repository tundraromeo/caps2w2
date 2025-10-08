/**
 * Centralized API Handler for Enguio Project
 * Connects all PHP APIs to frontend components
 */

// API Configuration
const API_CONFIG = {
  BASE_URL: 'http://localhost/caps2e2/Api',
  USE_PROXY: false, // Set to false to use direct calls
  ENDPOINTS: {
    // Main backend API
    BACKEND: 'backend.php',
    
    // Specific APIs
    SALES: 'sales_api.php',
    TRANSFER: 'transfer_api.php',
    CONVENIENCE: 'convenience_store_api.php',
    PHARMACY: 'pharmacy_api.php',
    get_pharmacy_products_fifo: 'pharmacy_api.php',
    PURCHASE_ORDER: 'purchase_order_api_simple_clean.php',
    STOCK_ADJUSTMENT: 'stock_adjustment_consolidated.php',
    STOCK_SUMMARY: 'stock_summary_api.php',
    POS_RETURN: 'pos_return_api.php',
    FIFO_TRANSFER: 'fifo_transfer_api.php',
    BATCH_TRANSFER: 'batch_transfer_api.php'
  }
};

/**
 * Main API Handler Class
 */
class APIHandler {
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.endpoints = API_CONFIG.ENDPOINTS;
  }

  /**
   * Generic API call method
   * @param {string} endpoint - API endpoint
   * @param {string} action - Action to perform
   * @param {object} data - Data to send
   * @param {string} method - HTTP method (POST/GET)
   * @returns {Promise<object>} API response
   */
  async callAPI(endpoint, action, data = {}, method = 'POST') {
    const url = `${this.baseUrl}/${endpoint}`;
    
    try {
      const config = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (method === 'POST') {
        config.body = JSON.stringify({ action, ...data });
      } else if (method === 'GET' && action) {
        const urlWithAction = `${url}?action=${action}`;
        return this.makeRequest(urlWithAction, config);
      }

      return this.makeRequest(url, config);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Make HTTP request
   */
  async makeRequest(url, config) {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const text = await response.text();
    
    try {
      const result = JSON.parse(text);
      
      return result;
    } catch (jsonError) {
      
      throw new Error('Server returned invalid JSON');
    }
  }

  // ============= BACKEND API METHODS =============
  
  async testConnection() {
    return this.callAPI(this.endpoints.BACKEND, 'test_connection');
  }

  async login(credentials) {
    return this.callAPI(this.endpoints.BACKEND, 'login', credentials);
  }

  async getCategories() {
    return this.callAPI(this.endpoints.BACKEND, 'get_categories');
  }

  async getLocations() {
    return this.callAPI(this.endpoints.BACKEND, 'get_locations');
  }

  async getProducts(filters = {}) {
    return this.callAPI(this.endpoints.BACKEND, 'get_products', filters);
  }

  async getSuppliers() {
    return this.callAPI(this.endpoints.BACKEND, 'get_suppliers');
  }

  async getWarehouseData(filters = {}) {
    return this.callAPI(this.endpoints.BACKEND, 'get_warehouse_data', filters);
  }

  async getWarehouseKPIs(filters = {}) {
    return this.callAPI(this.endpoints.BACKEND, 'get_warehouse_kpis', filters);
  }

  async getWarehouseSupplyByProduct(filters = {}) {
    return this.callAPI(this.endpoints.BACKEND, 'get_warehouse_supply_by_product', filters);
  }

  async getWarehouseSupplyByLocation(filters = {}) {
    return this.callAPI(this.endpoints.BACKEND, 'get_warehouse_supply_by_location', filters);
  }

  async getWarehouseStockoutItems(filters = {}) {
    return this.callAPI(this.endpoints.BACKEND, 'get_warehouse_stockout_items', filters);
  }

  async getWarehouseProductKPIs(filters = {}) {
    return this.callAPI(this.endpoints.BACKEND, 'get_warehouse_product_kpis', filters);
  }

  async getTopProductsByQuantity(filters = {}) {
    return this.callAPI(this.endpoints.BACKEND, 'get_top_products_by_quantity', filters);
  }

  async getStockDistributionByCategory(filters = {}) {
    return this.callAPI(this.endpoints.BACKEND, 'get_stock_distribution_by_category', filters);
  }

  async getFastMovingItemsTrend(filters = {}) {
    return this.callAPI(this.endpoints.BACKEND, 'get_fast_moving_items_trend', filters);
  }

  async getCriticalStockAlerts(filters = {}) {
    return this.callAPI(this.endpoints.BACKEND, 'get_critical_stock_alerts', filters);
  }

  async getInventoryByBranchCategory(filters = {}) {
    return this.callAPI(this.endpoints.BACKEND, 'get_inventory_by_branch_category', filters);
  }

  async getProductsByLocationName(filters = {}) {
    return this.callAPI(this.endpoints.BACKEND, 'get_products_by_location_name', filters);
  }

  // ============= SALES API METHODS =============
  
  async getPOSSales(filters = {}) {
    return this.callAPI(this.endpoints.SALES, 'get_pos_sales', filters);
  }

  async savePOSSale(saleData) {
    return this.callAPI(this.endpoints.SALES, 'save_pos_sale', saleData);
  }

  async checkBarcode(barcode) {
    return this.callAPI(this.endpoints.SALES, 'check_barcode', { barcode });
  }

  async getDiscounts() {
    return this.callAPI(this.endpoints.SALES, 'get_discounts');
  }

  async updateProductStock(productData) {
    return this.callAPI(this.endpoints.SALES, 'update_product_stock', productData);
  }

  // ============= TRANSFER API METHODS =============
  
  async getTransfers(filters = {}) {
    return this.callAPI(this.endpoints.TRANSFER, 'get_transfers_with_details', filters);
  }

  async createTransfer(transferData) {
    return this.callAPI(this.endpoints.TRANSFER, 'create_transfer', transferData);
  }

  async getFIFOStock(productId, locationId) {
    return this.callAPI(this.endpoints.TRANSFER, 'get_fifo_stock', { product_id: productId, location_id: locationId });
  }

  async getBatchTransferDetails(transferId) {
    return this.callAPI(this.endpoints.TRANSFER, 'get_batch_transfer_details', { transfer_id: transferId });
  }

  // ============= CONVENIENCE STORE API METHODS =============
  
  async getConvenienceProducts(filters = {}) {
    return this.callAPI(this.endpoints.CONVENIENCE, 'get_products', filters);
  }

  async updateConvenienceStock(stockData) {
    return this.callAPI(this.endpoints.CONVENIENCE, 'update_stock', stockData);
  }

  async getConvenienceNotifications() {
    return this.callAPI(this.endpoints.CONVENIENCE, 'get_notifications');
  }

  async archiveConvenienceProduct(productId) {
    return this.callAPI(this.endpoints.CONVENIENCE, 'archive_product', { product_id: productId });
  }

  // ============= PHARMACY API METHODS =============
  
  async getPharmacyProducts(filters = {}) {
    return this.callAPI(this.endpoints.PHARMACY, 'get_products', filters);
  }

  async updatePharmacyStock(stockData) {
    return this.callAPI(this.endpoints.PHARMACY, 'update_stock', stockData);
  }

  async getPharmacyNotifications() {
    return this.callAPI(this.endpoints.PHARMACY, 'get_notifications');
  }

  async archivePharmacyProduct(productId) {
    return this.callAPI(this.endpoints.PHARMACY, 'archive_product', { product_id: productId });
  }

  // ============= PURCHASE ORDER API METHODS =============
  
  async createPurchaseOrder(orderData) {
    return this.callAPI(this.endpoints.PURCHASE_ORDER, 'create_purchase_order', orderData);
  }

  async getPurchaseOrders(filters = {}) {
    return this.callAPI(this.endpoints.PURCHASE_ORDER, 'purchase_orders', filters);
  }

  async getPurchaseOrderDetails(orderId) {
    return this.callAPI(this.endpoints.PURCHASE_ORDER, 'purchase_order_details', { order_id: orderId });
  }

  async updatePOStatus(orderId, status) {
    return this.callAPI(this.endpoints.PURCHASE_ORDER, 'update_po_status', { order_id: orderId, status });
  }

  async requestMissingItems(requestData) {
    return this.callAPI(this.endpoints.PURCHASE_ORDER, 'request_missing_items', requestData);
  }

  async updatePartialDelivery(deliveryData) {
    return this.callAPI(this.endpoints.PURCHASE_ORDER, 'update_partial_delivery', deliveryData);
  }

  // ============= STOCK ADJUSTMENT API METHODS =============
  
  async getAllStockAdjustmentData(dateRange = {}) {
    return this.callAPI(this.endpoints.STOCK_ADJUSTMENT, 'get_all_stock_adjustment_data', dateRange);
  }

  async createStockAdjustment(adjustmentData) {
    return this.callAPI(this.endpoints.STOCK_ADJUSTMENT, 'create_adjustment', adjustmentData);
  }

  async updateStockAdjustment(adjustmentId, updateData) {
    return this.callAPI(this.endpoints.STOCK_ADJUSTMENT, 'update_adjustment', { adjustment_id: adjustmentId, ...updateData });
  }

  // ============= STOCK SUMMARY API METHODS =============
  
  async getStockSummary(filters = {}) {
    return this.callAPI(this.endpoints.STOCK_SUMMARY, 'get_stock_summary', filters);
  }

  async getStockMovements(filters = {}) {
    return this.callAPI(this.endpoints.STOCK_SUMMARY, 'get_stock_movements', filters);
  }

  // ============= POS RETURN API METHODS =============
  
  async processCustomerReturn(returnData) {
    return this.callAPI(this.endpoints.POS_RETURN, 'process_customer_return', returnData);
  }

  async approveReturn(returnId, approvalData) {
    return this.callAPI(this.endpoints.POS_RETURN, 'approve_return', { return_id: returnId, ...approvalData });
  }

  async rejectReturn(returnId, rejectionData) {
    return this.callAPI(this.endpoints.POS_RETURN, 'reject_return', { return_id: returnId, ...rejectionData });
  }

  async getPendingReturns() {
    return this.callAPI(this.endpoints.POS_RETURN, 'get_pending_returns');
  }

  // ============= FIFO TRANSFER API METHODS =============
  
  async executeFIFOTransfer(transferData) {
    return this.callAPI(this.endpoints.FIFO_TRANSFER, 'transfer', transferData);
  }

  async checkFIFOStock(productId, locationId) {
    return this.callAPI(this.endpoints.FIFO_TRANSFER, 'check_stock', { product_id: productId, location_id: locationId });
  }

  async getFIFOTransferHistory(filters = {}) {
    return this.callAPI(this.endpoints.FIFO_TRANSFER, 'transfer_history', filters);
  }

  async getAvailableProducts() {
    return this.callAPI(this.endpoints.FIFO_TRANSFER, 'available_products');
  }

  // ============= BATCH TRANSFER API METHODS =============
  
  async createBatchTransfer(batchData) {
    return this.callAPI(this.endpoints.BATCH_TRANSFER, 'create_batch_transfer', batchData);
  }

  async getBatchTransfers(filters = {}) {
    return this.callAPI(this.endpoints.BATCH_TRANSFER, 'get_batch_transfers', filters);
  }

  async updateBatchTransfer(transferId, updateData) {
    return this.callAPI(this.endpoints.BATCH_TRANSFER, 'update_batch_transfer', { transfer_id: transferId, ...updateData });
  }

  // ============= GENERIC API CALL METHOD =============
  
  /**
   * Generic method to call any API endpoint with any action
   * @param {string} endpoint - API endpoint file name
   * @param {string} action - Action to perform
   * @param {object} data - Data to send
   * @param {string} method - HTTP method (POST/GET)
   * @returns {Promise<object>} API response
   */
  async callGenericAPI(endpoint, action, data = {}, method = 'POST') {
    return this.callAPI(endpoint, action, data, method);
  }
}

// Create singleton instance
const apiHandler = new APIHandler();

// Export both the class and instance
export { APIHandler, apiHandler as default };

// Action-to-endpoint mapping for modular API
export const getApiEndpointForAction = (action) => {
  // Map action names to their respective modular API endpoints
  // Expand this mapping as needed for all supported actions
  const actionMap = {
    // Products - Use backend.php for all product operations since products_api.php has issues
    get_products: 'backend.php',
    update_product_stock: 'backend.php',
    duplicate_product_batches: 'backend.php',
    get_products_oldest_batch: 'backend.php',
    get_product_quantities: 'backend.php',
    add_quantity_to_product: 'backend.php',
    // Inventory
    get_inventory: 'inventory_api.php',
    update_inventory: 'inventory_api.php',
    // Batch Functions - Use backend.php since batch_functions_api.php has issues
    get_batches: 'backend.php',
    update_batch: 'backend.php',
    add_batch_entry: 'backend.php',
    // Barcode
    check_barcode: 'backend.php',
    // Suppliers
    get_suppliers: 'backend.php',
    add_supplier: 'backend.php',
    update_supplier: 'backend.php',
    delete_supplier: 'backend.php',
    // Categories and Brands
    get_categories: 'backend.php',
    get_brands: 'backend.php',
    // FIFO Operations
    get_fifo_stock: 'backend.php',
    consume_stock_fifo: 'backend.php',
    sync_fifo_stock: 'backend.php',
    force_sync_all_products: 'backend.php',
    cleanup_duplicate_transfer_products: 'backend.php',
    // Quantity History
    get_quantity_history: 'backend.php',
    // Expiring Products
    get_expiring_products: 'backend.php',
    // Product Management
    delete_product: 'backend.php',
    update_product: 'backend.php',
    // Table Creation
    create_transfer_batch_details_table: 'backend.php',
    // Warehouse KPIs
    get_warehouse_kpis: 'backend.php',
    // Convenience Store Actions
    get_locations: 'backend.php',
    get_convenience_products_fifo: 'convenience_store_api.php',
    get_products_by_location_name: 'backend.php',
    delete_product: 'backend.php',
    get_convenience_batch_details: 'convenience_store_api.php',
    get_fifo_stock: 'backend.php',
    get_transfer_batch_details: 'backend.php',
    get_batch_transfers_by_location: 'convenience_store_api.php',
    sync_transferred_products: 'convenience_store_api.php',
    // Add more mappings as needed
  };
  return actionMap[action] || 'backend.php'; // fallback to backend.php for all unmapped actions
};

// Additional utility functions for common patterns
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  
  return {
    success: false,
    message: error.message || defaultMessage,
    error: error
  };
};

export const validateApiResponse = (response) => {
  if (!response) {
    throw new Error('No response received');
  }
  
  if (!response.success) {
    throw new Error(response.message || 'API call failed');
  }
  
  return response;
};

// Toast notification helper (optional)
export const showApiNotification = (response, successMessage = 'Operation successful') => {
  if (typeof window !== 'undefined' && window.toast) {
    if (response.success) {
      window.toast.success(successMessage);
    } else {
      window.toast.error(response.message || 'Operation failed');
    }
  }
};
