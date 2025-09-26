# Stock Adjustment API Structure

This document outlines the consolidated PHP file for the Stock Adjustment functionality, maintaining the same database connection structure while organizing code using switch cases.

## Database Connection
The file uses the existing database connection from `conn.php`:
- **Database**: enguio2
- **Connection Type**: PDO
- **Tables Used**: 
  - `tbl_stock_movements`
  - `tbl_product`
  - `tbl_batch`
  - `tbl_batch_dtl`
  - `tbl_employee`
  - `tbl_transfer_header`
  - `tbl_transfer_dtl`
  - `tbl_location`

## Consolidated File

### `stock_adjustment_consolidated.php` (Single File with Switch Cases)
- **Purpose**: Single entry point that handles all stock adjustment operations using switch cases
- **Actions Supported**:
  - `get_all_stock_in_data`
  - `get_stock_adjustments`
  - `get_stock_adjustment_stats`
  - `create_stock_adjustment`
  - `update_stock_adjustment`
  - `delete_stock_adjustment`

### Switch Case Functions:

#### 1. `get_all_stock_in_data`
- **Purpose**: Fetches comprehensive stock adjustment data from multiple sources
- **Functionality**:
  - Stock adjustments (IN movements)
  - Transfer data
  - Product updates
  - Combined and sorted results
  - Summary statistics

#### 2. `get_stock_adjustments`
- **Purpose**: Fetches filtered stock adjustments with pagination
- **Functionality**:
  - Search by product name, barcode, or notes
  - Filter by type (IN/OUT)
  - Filter by status
  - Pagination support
  - Total count calculation

#### 3. `get_stock_adjustment_stats`
- **Purpose**: Provides statistical data for stock adjustments
- **Returns**:
  - Total adjustments count
  - Additions count
  - Subtractions count
  - Net quantity

#### 4. `create_stock_adjustment`
- **Purpose**: Creates new stock adjustments
- **Functionality**:
  - Validates required fields
  - Creates batch records
  - Updates product quantities
  - Manages stock status
  - Transaction support

#### 5. `update_stock_adjustment`
- **Purpose**: Updates existing stock adjustments
- **Functionality**:
  - Validates movement ID
  - Calculates quantity differences
  - Updates product quantities
  - Updates batch details
  - Transaction support

#### 6. `delete_stock_adjustment`
- **Purpose**: Deletes stock adjustments
- **Functionality**:
  - Reverses quantity effects
  - Updates product quantities
  - Cleans up batch records
  - Transaction support

## Frontend Integration

The `StockAdjustment.js` component has been updated to use the consolidated API endpoint:

```javascript
// Updated API call
const response = await fetch('/Api/stock_adjustment_consolidated.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action,
    ...data
  }),
});
```

## Benefits of Consolidation

1. **Simplicity**: Single file with all functionality
2. **Maintainability**: All stock adjustment logic in one place
3. **Performance**: No file includes or routing overhead
4. **Organization**: Switch cases provide clear structure
5. **Easier Deployment**: Only one file to manage
6. **Reduced Complexity**: No need to manage multiple files

## Database Transactions

All write operations (create, update, delete) use database transactions to ensure data consistency:
- `beginTransaction()`
- `commit()`
- `rollback()` on errors

## Error Handling

All files include comprehensive error handling:
- JSON validation
- Database error catching
- Transaction rollback on failures
- Consistent error response format

## Security Features

- CORS headers for cross-origin requests
- Input validation
- SQL injection prevention through prepared statements
- Transaction safety

## Usage Example

```javascript
// Frontend call
const result = await handleApiCall('create_stock_adjustment', {
  product_id: '123',
  adjustment_type: 'Stock In',
  quantity: 10,
  reason: 'Initial stock',
  unit_cost: 25.50,
  expiration_date: '2024-12-31'
});
```

## File Structure

```
Api/
├── stock_adjustment_consolidated.php    (Single consolidated file)
├── conn.php                             (Database connection)
└── STOCK_ADJUSTMENT_API_STRUCTURE.md   (This documentation)
```

This consolidated structure maintains the original functionality while providing better simplicity and easier management.
