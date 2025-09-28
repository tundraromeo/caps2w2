/**
 * Example Component showing how to use the new API Handler
 * This demonstrates the proper way to connect PHP APIs to frontend components
 */

"use client";
import React, { useState, useEffect } from 'react';
import { useAPI, useWarehouseAPI, useConvenienceAPI, usePOSAPI } from '../hooks/useAPI';
import { toast } from 'react-toastify';

const APIUsageExample = () => {
  // ============= METHOD 1: Using the general useAPI hook =============
  const { api, loading, error, clearError } = useAPI();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // ============= METHOD 2: Using specific hooks for different modules =============
  const warehouseAPI = useWarehouseAPI();
  const convenienceAPI = useConvenienceAPI();
  const posAPI = usePOSAPI();

  // Example: Load initial data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load categories and products simultaneously
      const [categoriesResult, productsResult] = await Promise.all([
        api.getCategories(),
        api.getProducts({ limit: 10 })
      ]);

      if (categoriesResult.success) {
        setCategories(categoriesResult.data || []);
      }

      if (productsResult.success) {
        setProducts(productsResult.data || []);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      toast.error('Failed to load initial data');
    }
  };

  // Example: Test connection to PHP backend
  const testConnection = async () => {
    try {
      const result = await api.testConnection();
      if (result.success) {
        toast.success('Connection successful!');
      } else {
        toast.error('Connection failed');
      }
    } catch (err) {
      toast.error('Connection error: ' + err.message);
    }
  };

  // Example: Load warehouse data
  const loadWarehouseData = async () => {
    try {
      const result = await warehouseAPI.getWarehouseData({
        location: 'Warehouse',
        include_stats: true
      });

      if (result.success) {
        console.log('Warehouse data:', result.data);
        toast.success('Warehouse data loaded');
      }
    } catch (err) {
      toast.error('Failed to load warehouse data');
    }
  };

  // Example: Load convenience store products
  const loadConvenienceProducts = async () => {
    try {
      const result = await convenienceAPI.getProducts({
        location_id: 2, // Convenience store location
        include_notifications: true
      });

      if (result.success) {
        console.log('Convenience products:', result.data);
        toast.success('Convenience products loaded');
      }
    } catch (err) {
      toast.error('Failed to load convenience products');
    }
  };

  // Example: Save a POS sale
  const saveSampleSale = async () => {
    const sampleSale = {
      items: [
        {
          product_id: 1,
          quantity: 2,
          price: 10.50,
          total: 21.00
        }
      ],
      total_amount: 21.00,
      payment_method: 'cash',
      amount_paid: 25.00,
      change: 4.00,
      terminal_name: 'POS-01',
      location_name: 'Convenience Store'
    };

    try {
      const result = await posAPI.saveSale(sampleSale);
      if (result.success) {
        toast.success('Sale saved successfully');
      }
    } catch (err) {
      toast.error('Failed to save sale');
    }
  };

  // Example: Check barcode
  const handleBarcodeCheck = async (barcode) => {
    try {
      const result = await posAPI.checkBarcode(barcode);
      if (result.success && result.data) {
        console.log('Product found:', result.data);
        return result.data;
      } else {
        toast.warning('Product not found');
        return null;
      }
    } catch (err) {
      toast.error('Barcode check failed');
      return null;
    }
  };

  // Example: Update stock
  const updateProductStock = async (productId, newQuantity) => {
    try {
      const result = await convenienceAPI.updateStock({
        product_id: productId,
        new_quantity: newQuantity,
        location_id: 2,
        reason: 'Manual adjustment'
      });

      if (result.success) {
        toast.success('Stock updated successfully');
        // Reload products to reflect changes
        loadConvenienceProducts();
      }
    } catch (err) {
      toast.error('Failed to update stock');
    }
  };

  // Example: Handle API errors
  const handleError = (error) => {
    console.error('API Error:', error);
    if (error.message.includes('network')) {
      toast.error('Network error. Please check your connection.');
    } else if (error.message.includes('unauthorized')) {
      toast.error('Session expired. Please login again.');
      // Redirect to login
    } else {
      toast.error(error.message || 'An error occurred');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">API Usage Examples</h1>
      
      {/* Connection Test */}
      <div className="mb-4">
        <button 
          onClick={testConnection}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {/* Data Loading Examples */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button 
          onClick={loadWarehouseData}
          disabled={warehouseAPI.loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {warehouseAPI.loading ? 'Loading...' : 'Load Warehouse Data'}
        </button>

        <button 
          onClick={loadConvenienceProducts}
          disabled={convenienceAPI.loading}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {convenienceAPI.loading ? 'Loading...' : 'Load Convenience Products'}
        </button>

        <button 
          onClick={saveSampleSale}
          disabled={posAPI.loading}
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
        >
          {posAPI.loading ? 'Saving...' : 'Save Sample Sale'}
        </button>
      </div>

      {/* Error Display */}
      {(error || warehouseAPI.error || convenienceAPI.error || posAPI.error) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong>
          <div>{error?.message}</div>
          <div>{warehouseAPI.error?.message}</div>
          <div>{convenienceAPI.error?.message}</div>
          <div>{posAPI.error?.message}</div>
          <button 
            onClick={() => {
              clearError();
              warehouseAPI.clearError();
              convenienceAPI.clearError();
              posAPI.clearError();
            }}
            className="mt-2 bg-red-500 text-white px-2 py-1 rounded text-sm"
          >
            Clear Errors
          </button>
        </div>
      )}

      {/* Data Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Categories ({categories.length})</h3>
          <div className="bg-gray-100 p-4 rounded max-h-40 overflow-y-auto">
            {categories.map((category, index) => (
              <div key={index} className="py-1">
                {category.category_name || category.name}
              </div>
            ))}
          </div>
        </div>

        {/* Products */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Products ({products.length})</h3>
          <div className="bg-gray-100 p-4 rounded max-h-40 overflow-y-auto">
            {products.map((product, index) => (
              <div key={index} className="py-1">
                {product.product_name} - {product.barcode}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 bg-blue-50 p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">How to Use the New API Handler:</h3>
        <ol className="list-decimal list-inside space-y-2">
          <li>Import the appropriate hook: <code>useAPI</code>, <code>useWarehouseAPI</code>, <code>useConvenienceAPI</code>, etc.</li>
          <li>Use the hook in your component to get API methods and state</li>
          <li>Call API methods directly - they handle loading states and errors automatically</li>
          <li>Check the loading state to show loading indicators</li>
          <li>Handle errors using the error state or try-catch blocks</li>
          <li>All API calls return standardized responses with success/failure status</li>
        </ol>
      </div>
    </div>
  );
};

export default APIUsageExample;
