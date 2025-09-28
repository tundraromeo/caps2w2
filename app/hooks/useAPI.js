/**
 * Custom React Hook for API calls
 * Provides consistent API handling across all components
 */

import { useState, useCallback } from 'react';
import apiHandler, { handleApiError, validateApiResponse } from '../lib/apiHandler';

export const useAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Generic API call wrapper with loading and error handling
   * @param {Function} apiFunction - API function to call
   * @param {Array} params - Parameters to pass to the API function
   * @param {object} options - Additional options
   * @returns {Promise} API response
   */
  const callAPI = useCallback(async (apiFunction, params = [], options = {}) => {
    const { 
      showLoading = true, 
      throwError = false,
      onSuccess,
      onError 
    } = options;

    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await apiFunction(...params);
      const validatedResponse = validateApiResponse(response);

      if (onSuccess) onSuccess(validatedResponse);
      return validatedResponse;

    } catch (err) {
      const errorResponse = handleApiError(err);
      setError(errorResponse);
      
      if (onError) onError(errorResponse);
      if (throwError) throw err;
      
      return errorResponse;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Specific API methods with built-in error handling
  const api = {
    // ============= AUTHENTICATION =============
    login: useCallback((credentials) => 
      callAPI(apiHandler.login.bind(apiHandler), [credentials]), [callAPI]
    ),

    testConnection: useCallback(() => 
      callAPI(apiHandler.testConnection.bind(apiHandler)), [callAPI]
    ),

    // ============= MASTER DATA =============
    getCategories: useCallback(() => 
      callAPI(apiHandler.getCategories.bind(apiHandler)), [callAPI]
    ),

    getLocations: useCallback(() => 
      callAPI(apiHandler.getLocations.bind(apiHandler)), [callAPI]
    ),

    getProducts: useCallback((filters) => 
      callAPI(apiHandler.getProducts.bind(apiHandler), [filters]), [callAPI]
    ),

    getSuppliers: useCallback(() => 
      callAPI(apiHandler.getSuppliers.bind(apiHandler)), [callAPI]
    ),

    // ============= WAREHOUSE =============
    getWarehouseData: useCallback((filters) => 
      callAPI(apiHandler.getWarehouseData.bind(apiHandler), [filters]), [callAPI]
    ),

    // ============= SALES & POS =============
    getPOSSales: useCallback((filters) => 
      callAPI(apiHandler.getPOSSales.bind(apiHandler), [filters]), [callAPI]
    ),

    savePOSSale: useCallback((saleData) => 
      callAPI(apiHandler.savePOSSale.bind(apiHandler), [saleData]), [callAPI]
    ),

    checkBarcode: useCallback((barcode) => 
      callAPI(apiHandler.checkBarcode.bind(apiHandler), [barcode]), [callAPI]
    ),

    getDiscounts: useCallback(() => 
      callAPI(apiHandler.getDiscounts.bind(apiHandler)), [callAPI]
    ),

    updateProductStock: useCallback((productData) => 
      callAPI(apiHandler.updateProductStock.bind(apiHandler), [productData]), [callAPI]
    ),

    // ============= TRANSFERS =============
    getTransfers: useCallback((filters) => 
      callAPI(apiHandler.getTransfers.bind(apiHandler), [filters]), [callAPI]
    ),

    createTransfer: useCallback((transferData) => 
      callAPI(apiHandler.createTransfer.bind(apiHandler), [transferData]), [callAPI]
    ),

    getFIFOStock: useCallback((productId, locationId) => 
      callAPI(apiHandler.getFIFOStock.bind(apiHandler), [productId, locationId]), [callAPI]
    ),

    getBatchTransferDetails: useCallback((transferId) => 
      callAPI(apiHandler.getBatchTransferDetails.bind(apiHandler), [transferId]), [callAPI]
    ),

    // ============= CONVENIENCE STORE =============
    getConvenienceProducts: useCallback((filters) => 
      callAPI(apiHandler.getConvenienceProducts.bind(apiHandler), [filters]), [callAPI]
    ),

    updateConvenienceStock: useCallback((stockData) => 
      callAPI(apiHandler.updateConvenienceStock.bind(apiHandler), [stockData]), [callAPI]
    ),

    getConvenienceNotifications: useCallback(() => 
      callAPI(apiHandler.getConvenienceNotifications.bind(apiHandler)), [callAPI]
    ),

    archiveConvenienceProduct: useCallback((productId) => 
      callAPI(apiHandler.archiveConvenienceProduct.bind(apiHandler), [productId]), [callAPI]
    ),

    // ============= PHARMACY =============
    getPharmacyProducts: useCallback((filters) => 
      callAPI(apiHandler.getPharmacyProducts.bind(apiHandler), [filters]), [callAPI]
    ),

    updatePharmacyStock: useCallback((stockData) => 
      callAPI(apiHandler.updatePharmacyStock.bind(apiHandler), [stockData]), [callAPI]
    ),

    getPharmacyNotifications: useCallback(() => 
      callAPI(apiHandler.getPharmacyNotifications.bind(apiHandler)), [callAPI]
    ),

    archivePharmacyProduct: useCallback((productId) => 
      callAPI(apiHandler.archivePharmacyProduct.bind(apiHandler), [productId]), [callAPI]
    ),

    // ============= PURCHASE ORDERS =============
    createPurchaseOrder: useCallback((orderData) => 
      callAPI(apiHandler.createPurchaseOrder.bind(apiHandler), [orderData]), [callAPI]
    ),

    getPurchaseOrders: useCallback((filters) => 
      callAPI(apiHandler.getPurchaseOrders.bind(apiHandler), [filters]), [callAPI]
    ),

    getPurchaseOrderDetails: useCallback((orderId) => 
      callAPI(apiHandler.getPurchaseOrderDetails.bind(apiHandler), [orderId]), [callAPI]
    ),

    updatePOStatus: useCallback((orderId, status) => 
      callAPI(apiHandler.updatePOStatus.bind(apiHandler), [orderId, status]), [callAPI]
    ),

    requestMissingItems: useCallback((requestData) => 
      callAPI(apiHandler.requestMissingItems.bind(apiHandler), [requestData]), [callAPI]
    ),

    updatePartialDelivery: useCallback((deliveryData) => 
      callAPI(apiHandler.updatePartialDelivery.bind(apiHandler), [deliveryData]), [callAPI]
    ),

    // ============= STOCK ADJUSTMENTS =============
    getAllStockAdjustmentData: useCallback((dateRange) => 
      callAPI(apiHandler.getAllStockAdjustmentData.bind(apiHandler), [dateRange]), [callAPI]
    ),

    createStockAdjustment: useCallback((adjustmentData) => 
      callAPI(apiHandler.createStockAdjustment.bind(apiHandler), [adjustmentData]), [callAPI]
    ),

    updateStockAdjustment: useCallback((adjustmentId, updateData) => 
      callAPI(apiHandler.updateStockAdjustment.bind(apiHandler), [adjustmentId, updateData]), [callAPI]
    ),

    // ============= STOCK SUMMARY =============
    getStockSummary: useCallback((filters) => 
      callAPI(apiHandler.getStockSummary.bind(apiHandler), [filters]), [callAPI]
    ),

    getStockMovements: useCallback((filters) => 
      callAPI(apiHandler.getStockMovements.bind(apiHandler), [filters]), [callAPI]
    ),

    // ============= RETURNS =============
    processCustomerReturn: useCallback((returnData) => 
      callAPI(apiHandler.processCustomerReturn.bind(apiHandler), [returnData]), [callAPI]
    ),

    approveReturn: useCallback((returnId, approvalData) => 
      callAPI(apiHandler.approveReturn.bind(apiHandler), [returnId, approvalData]), [callAPI]
    ),

    rejectReturn: useCallback((returnId, rejectionData) => 
      callAPI(apiHandler.rejectReturn.bind(apiHandler), [returnId, rejectionData]), [callAPI]
    ),

    getPendingReturns: useCallback(() => 
      callAPI(apiHandler.getPendingReturns.bind(apiHandler)), [callAPI]
    ),

    // ============= FIFO TRANSFERS =============
    executeFIFOTransfer: useCallback((transferData) => 
      callAPI(apiHandler.executeFIFOTransfer.bind(apiHandler), [transferData]), [callAPI]
    ),

    checkFIFOStock: useCallback((productId, locationId) => 
      callAPI(apiHandler.checkFIFOStock.bind(apiHandler), [productId, locationId]), [callAPI]
    ),

    getFIFOTransferHistory: useCallback((filters) => 
      callAPI(apiHandler.getFIFOTransferHistory.bind(apiHandler), [filters]), [callAPI]
    ),

    getAvailableProducts: useCallback(() => 
      callAPI(apiHandler.getAvailableProducts.bind(apiHandler)), [callAPI]
    ),

    // ============= BATCH TRANSFERS =============
    createBatchTransfer: useCallback((batchData) => 
      callAPI(apiHandler.createBatchTransfer.bind(apiHandler), [batchData]), [callAPI]
    ),

    getBatchTransfers: useCallback((filters) => 
      callAPI(apiHandler.getBatchTransfers.bind(apiHandler), [filters]), [callAPI]
    ),

    updateBatchTransfer: useCallback((transferId, updateData) => 
      callAPI(apiHandler.updateBatchTransfer.bind(apiHandler), [transferId, updateData]), [callAPI]
    ),
  };

  // Utility methods
  const clearError = useCallback(() => setError(null), []);
  
  const retryLastCall = useCallback((lastApiCall) => {
    if (lastApiCall) {
      return lastApiCall();
    }
  }, []);

  return {
    api,
    loading,
    error,
    clearError,
    retryLastCall,
    callAPI
  };
};

// Export individual hooks for specific modules
export const useWarehouseAPI = () => {
  const { api, loading, error, clearError } = useAPI();
  return {
    getWarehouseData: api.getWarehouseData,
    getProducts: api.getProducts,
    loading,
    error,
    clearError
  };
};

export const useConvenienceAPI = () => {
  const { api, loading, error, clearError } = useAPI();
  return {
    getProducts: api.getConvenienceProducts,
    updateStock: api.updateConvenienceStock,
    getNotifications: api.getConvenienceNotifications,
    archiveProduct: api.archiveConvenienceProduct,
    loading,
    error,
    clearError
  };
};

export const usePharmacyAPI = () => {
  const { api, loading, error, clearError } = useAPI();
  return {
    getProducts: api.getPharmacyProducts,
    updateStock: api.updatePharmacyStock,
    getNotifications: api.getPharmacyNotifications,
    archiveProduct: api.archivePharmacyProduct,
    loading,
    error,
    clearError
  };
};

export const usePOSAPI = () => {
  const { api, loading, error, clearError } = useAPI();
  return {
    getSales: api.getPOSSales,
    saveSale: api.savePOSSale,
    checkBarcode: api.checkBarcode,
    getDiscounts: api.getDiscounts,
    updateProductStock: api.updateProductStock,
    loading,
    error,
    clearError
  };
};

export const useTransferAPI = () => {
  const { api, loading, error, clearError } = useAPI();
  return {
    getTransfers: api.getTransfers,
    createTransfer: api.createTransfer,
    getFIFOStock: api.getFIFOStock,
    getBatchTransferDetails: api.getBatchTransferDetails,
    executeFIFOTransfer: api.executeFIFOTransfer,
    checkFIFOStock: api.checkFIFOStock,
    getFIFOTransferHistory: api.getFIFOTransferHistory,
    loading,
    error,
    clearError
  };
};
