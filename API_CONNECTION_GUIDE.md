# API Connection Guide - Enguio Project

This guide explains how all PHP APIs are connected to the frontend components using the new centralized API handler system.

## 🎯 Overview

The new API system provides:
- **Centralized API handling** - All API calls go through a single handler
- **Consistent error handling** - Standardized error responses across all APIs
- **Loading states** - Built-in loading indicators for all API calls
- **Type safety** - Structured request/response handling
- **Easy maintenance** - Single place to update API endpoints and logic

## 📁 File Structure

```
app/
├── lib/
│   └── apiHandler.js          # Main API handler class
├── hooks/
│   └── useAPI.js              # React hooks for API calls
├── examples/
│   └── APIUsageExample.js     # Usage examples
└── components/                # Updated components using new API
```

## 🔌 PHP APIs Connected

### 1. **Main Backend API** (`backend.php`)
- **Endpoint**: `http://localhost/Enguio_Project/Api/backend.php`
- **Purpose**: Core business logic, authentication, master data
- **Actions**: login, get_categories, get_locations, get_products, get_suppliers, etc.

### 2. **Sales API** (`sales_api.php`)
- **Endpoint**: `http://localhost/Enguio_Project/Api/sales_api.php`
- **Purpose**: POS operations, sales transactions
- **Actions**: get_pos_sales, save_pos_sale, check_barcode, get_discounts

### 3. **Transfer API** (`transfer_api.php`)
- **Endpoint**: `http://localhost/Enguio_Project/Api/transfer_api.php`
- **Purpose**: Inventory transfers, FIFO operations
- **Actions**: create_transfer, get_transfers_with_details, get_fifo_stock

### 4. **Convenience Store API** (`convenience_store_api.php`)
- **Endpoint**: `http://localhost/Enguio_Project/Api/convenience_store_api.php`
- **Purpose**: Convenience store specific operations
- **Actions**: get_products, update_stock, get_notifications, archive_product

### 5. **Pharmacy API** (`pharmacy_api.php`)
- **Endpoint**: `http://localhost/Enguio_Project/Api/pharmacy_api.php`
- **Purpose**: Pharmacy specific operations
- **Actions**: get_products, update_stock, get_notifications, archive_product

### 6. **Purchase Order API** (`purchase_order_api_simple_clean.php`)
- **Endpoint**: `http://localhost/Enguio_Project/Api/purchase_order_api_simple_clean.php`
- **Purpose**: Purchase order management
- **Actions**: create_purchase_order, get_purchase_orders, update_po_status

### 7. **Stock Adjustment API** (`stock_adjustment_consolidated.php`)
- **Endpoint**: `http://localhost/Enguio_Project/Api/stock_adjustment_consolidated.php`
- **Purpose**: Stock adjustments and movements
- **Actions**: get_all_stock_adjustment_data, create_adjustment

### 8. **Stock Summary API** (`stock_summary_api.php`)
- **Endpoint**: `http://localhost/Enguio_Project/Api/stock_summary_api.php`
- **Purpose**: Stock summaries and reports
- **Actions**: get_stock_summary, get_stock_movements

### 9. **POS Return API** (`pos_return_api.php`)
- **Endpoint**: `http://localhost/Enguio_Project/Api/pos_return_api.php`
- **Purpose**: Return processing and approval
- **Actions**: process_customer_return, approve_return, reject_return

### 10. **FIFO Transfer API** (`fifo_transfer_api.php`)
- **Endpoint**: `http://localhost/Enguio_Project/Api/fifo_transfer_api.php`
- **Purpose**: FIFO inventory transfers
- **Actions**: transfer, check_stock, transfer_history

## 🔧 How to Use

### Method 1: Using General API Hook

```javascript
import { useAPI } from '../hooks/useAPI';

function MyComponent() {
  const { api, loading, error } = useAPI();
  
  const loadData = async () => {
    try {
      const result = await api.getProducts({ limit: 10 });
      if (result.success) {
        console.log('Products:', result.data);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      <button onClick={loadData}>Load Products</button>
    </div>
  );
}
```

### Method 2: Using Specific Module Hooks

```javascript
import { useWarehouseAPI, useConvenienceAPI, usePOSAPI } from '../hooks/useAPI';

function MyComponent() {
  const warehouseAPI = useWarehouseAPI();
  const convenienceAPI = useConvenienceAPI();
  const posAPI = usePOSAPI();
  
  const loadWarehouseData = async () => {
    const result = await warehouseAPI.getWarehouseData();
    // Handle result
  };
  
  const loadConvenienceProducts = async () => {
    const result = await convenienceAPI.getProducts();
    // Handle result
  };
  
  const saveSale = async (saleData) => {
    const result = await posAPI.saveSale(saleData);
    // Handle result
  };
}
```

## 📋 Updated Components

### Frontend Components Updated:

1. **Dashboard.js** - Uses `useAPI` for categories, locations, warehouse data
2. **ConvenienceStore.js** - Uses `useConvenienceAPI` for store operations
3. **PharmacyInventory.js** - Uses `usePharmacyAPI` for pharmacy operations
4. **StockAdjustment.js** - Uses `useAPI` for stock adjustment operations
5. **POS_convenience/page.js** - Uses `usePOSAPI` for POS operations
6. **Warehouse.js** - Uses `useWarehouseAPI` for warehouse operations
7. **InventoryTransfer.js** - Uses `useTransferAPI` for transfer operations

### Key Changes Made:

- ✅ Removed custom `handleApiCall` functions
- ✅ Replaced direct fetch calls with API hooks
- ✅ Added consistent error handling
- ✅ Added loading state management
- ✅ Standardized request/response format

## 🛠️ API Handler Features

### Automatic Error Handling
```javascript
// Errors are automatically caught and formatted
const result = await api.getProducts();
if (!result.success) {
  // Error is already logged and formatted
  console.log('Error:', result.message);
}
```

### Loading States
```javascript
const { api, loading } = useAPI();
// loading is automatically managed for all API calls
```

### Consistent Response Format
```javascript
// All API responses follow this format:
{
  success: boolean,
  message: string,
  data: any,
  error?: any
}
```

### Request Logging
```javascript
// All requests are automatically logged with:
// 🚀 API Call: endpoint - action
// ✅ API Response: result
// ❌ API Error: error details
```

## 🔍 Testing

### Test Connection
```javascript
const { api } = useAPI();
const testConnection = async () => {
  const result = await api.testConnection();
  console.log('Connection test:', result);
};
```

### Test Specific APIs
```javascript
// Test convenience store API
const convenienceAPI = useConvenienceAPI();
const products = await convenienceAPI.getProducts();

// Test POS API
const posAPI = usePOSAPI();
const sales = await posAPI.getSales();

// Test pharmacy API
const pharmacyAPI = usePharmacyAPI();
const notifications = await pharmacyAPI.getNotifications();
```

## 🚀 Benefits

1. **Centralized Management** - All API logic in one place
2. **Consistent Interface** - Same pattern across all components
3. **Better Error Handling** - Standardized error responses
4. **Improved Debugging** - Comprehensive logging
5. **Type Safety** - Structured request/response handling
6. **Easier Maintenance** - Single point of configuration
7. **Loading States** - Built-in loading indicators
8. **Retry Logic** - Easy to implement retry mechanisms

## 🔧 Configuration

### API Base URL
Update the base URL in `app/lib/apiHandler.js`:
```javascript
const API_CONFIG = {
  BASE_URL: 'http://localhost/Enguio_Project/Api', // Update this for production
  // ...
};
```

### Adding New APIs
To add a new API endpoint:

1. Add endpoint to `API_CONFIG.ENDPOINTS` in `apiHandler.js`
2. Add methods to `APIHandler` class
3. Add hooks to `useAPI.js`
4. Update components to use new hooks

## 📞 Support

For issues or questions about the API connection system:
1. Check the console for detailed error logs
2. Verify PHP API endpoints are accessible
3. Check network connectivity
4. Review the example component for proper usage patterns

---

**Note**: This system replaces all previous custom API handling functions. All components should now use the centralized API handler for consistency and maintainability.
