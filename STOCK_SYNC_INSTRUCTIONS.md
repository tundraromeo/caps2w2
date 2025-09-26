# Stock Summary Sync Instructions

## Problem
The `tbl_stock_summary` table is empty even though you have entered products. This is because the stock movement and summary creation was only happening when products were added with a reference/batch number.

## Solution
I've created separate files to handle stock summary functionality and sync existing products.

## Files Created

1. **`Api/stock_summary_api.php`** - Separate API file for stock summary operations
2. **`sync_stock_data.php`** - Script to sync existing products to stock summary
3. **Updated `app/Inventory_Con/StockSummary.js`** - Now uses the separate API
4. **Updated `test_stock_summary.html`** - Test interface with sync functionality

## How to Fix the Empty Stock Summary Table

### Option 1: Run the Sync Script (Recommended)
1. Open your browser and go to: `http://localhost/Enguio_Project/sync_stock_data.php`
2. This will automatically create stock movements and summaries for all existing products
3. Check phpMyAdmin again - you should now see data in `tbl_stock_summary`

### Option 2: Use the Test Interface
1. Open: `http://localhost/Enguio_Project/test_stock_summary.html`
2. Click "Sync Existing Products to Stock Summary" button
3. This will do the same thing as Option 1 but through the web interface

### Option 3: Manual API Call
You can also call the sync API directly:
```javascript
fetch('/Api/stock_summary_api.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sync_existing_products' })
})
.then(response => response.json())
.then(data => console.log(data));
```

## What the Sync Does

1. **Finds products** without stock movements
2. **Creates batches** for products that don't have them
3. **Creates stock movements** (IN type) for the existing quantities
4. **Creates stock summaries** with available quantities
5. **Updates product records** with batch references

## After Syncing

- `tbl_stock_movements` will have records for all existing products
- `tbl_stock_summary` will have records for all existing products
- Future product entries will automatically create movements and summaries
- You can use the StockSummary component to view the data

## Testing

After syncing, you can test the functionality:
1. Open `test_stock_summary.html`
2. Click "Get Stock Movements" - should show data
3. Click "Get Stock Summary" - should show data
4. Click "Get Stock Statistics" - should show counts

## StockSummary Component

The StockSummary component (`app/Inventory_Con/StockSummary.js`) now uses the separate API and provides:
- Dashboard view with statistics
- Movements view with filtering
- Summary view with current stock levels
- Export functionality

## Future Product Entries

The `add_product` endpoint in `backend.php` has been updated to always create batches, so future product entries will automatically create stock movements and summaries.
