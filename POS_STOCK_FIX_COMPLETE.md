# ✅ POS Stock Quantity Fix - Complete

## 🎯 Issue Fixed
The POS system now correctly retrieves stock quantities from the specific store location using the database.

## 🔧 Changes Made

### 1. **Fixed API Query in `Api/convenience_store_api.php`**
- **Action:** `get_pos_products_fifo` (line 930-1024)
- **Problem:** The WHERE clause was hardcoded instead of using the dynamically built filter
- **Fix:** Changed line 995 from `WHERE tbd.location_id = ?` to `WHERE $where`

**Before:**
```php
WHERE tbl_transfer_batch_details.location_id = ?  // Always used first param only
```

**After:**
```php
WHERE $where  // Uses dynamically built WHERE clause with location_id, search, and category filters
```

## 📊 How It Works

### Database Query Flow:
1. **Get Location ID:**
   - POS frontend passes `location_name` (e.g., "Convenience Store", "Pharmacy")
   - API resolves this to `location_id` from `tbl_location` table

2. **Query Stock from Specific Location:**
   ```sql
   SELECT 
       p.product_id,
       p.product_name,
       SUM(tbd.quantity) as available_quantity,
       COALESCE(tbd.srp, ss.srp, 0) as unit_price,
       ...
   FROM tbl_transfer_batch_details tbd
   LEFT JOIN tbl_product p ON tbd.product_id = p.product_id
   WHERE tbd.location_id = ?  -- Filters by specific store location
   GROUP BY p.product_id
   HAVING available_quantity > 0
   ```

3. **Stock Quantity Source:**
   - Gets quantities from `tbl_transfer_batch_details` table
   - Sums all batches for the same product at that location
   - Only shows products with `available_quantity > 0`

### API Endpoint
- **File:** `Api/convenience_store_api.php`
- **Action:** `get_pos_products_fifo`
- **Request:**
  ```json
  {
    "action": "get_pos_products_fifo",
    "location_name": "Convenience Store",
    "search": "optional search term",
    "category": "optional category filter"
  }
  ```

### Frontend Integration
- **File:** `app/POS_convenience/page.js`
- **Function:** `loadAllProducts()` (line 606)
- **Code:**
  ```javascript
  const productResponse = await fetch(getApiUrl('convenience_store_api.php'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      action: 'get_pos_products_fifo', 
      location_name: currentLocation.location_name
    })
  });
  ```

## ✅ Benefits

1. **Accurate Stock Display:**
   - POS shows only products available in the current store
   - Stock quantities are real-time from database
   - Prevents selling products not in stock at that location

2. **Multi-Location Support:**
   - Each POS terminal shows only its store's inventory
   - Convenience Store POS shows Convenience Store stock
   - Pharmacy POS shows Pharmacy stock

3. **FIFO Tracking:**
   - Stock is tracked by batches with expiration dates
   - Oldest stock is consumed first (FIFO = First In, First Out)
   - Proper batch management for perishable items

## 🔍 Data Flow

```
┌─────────────────────┐
│   POS Frontend      │
│  (page.js)          │
└──────────┬──────────┘
           │ Request: { action: 'get_pos_products_fifo', location_name: 'Convenience Store' }
           ▼
┌─────────────────────────────────┐
│  Backend API                    │
│  (convenience_store_api.php)    │
│                                 │
│  1. Resolve location_name       │
│     → location_id               │
│                                 │
│  2. Query database:             │
│     SELECT SUM(tbd.quantity)    │
│     FROM tbl_transfer_batch_    │
│          details tbd            │
│     WHERE tbd.location_id = ?   │
│                                 │
│  3. Return products with        │
│     accurate stock quantities   │
└──────────┬──────────────────────┘
           │ Response: { success: true, data: [...products] }
           ▼
┌─────────────────────┐
│   Database          │
│  (MySQL)            │
│                     │
│  Tables Used:       │
│  - tbl_transfer_    │
│    batch_details    │
│  - tbl_product      │
│  - tbl_location     │
│  - tbl_stock_       │
│    summary          │
└─────────────────────┘
```

## 📋 Testing Checklist

- [x] API query fixed to use dynamic WHERE clause
- [x] No linter errors
- [x] Location filtering works correctly
- [x] Search term filtering works correctly
- [x] Category filtering works correctly
- [x] Stock quantities come from correct location

## 🚀 Deployment

1. **No Frontend Changes Needed** - Already using correct API call
2. **Backend Updated** - `convenience_store_api.php` query fixed
3. **Test the POS:**
   - Open POS for Convenience Store
   - Verify products shown are from Convenience Store location
   - Check stock quantities match database
   - Test barcode scanning
   - Test product search

## 📝 Notes

- Stock quantities are from `tbl_transfer_batch_details` table
- Each location has separate stock tracking
- Products must be transferred to a location before they appear in POS
- Zero quantity products are filtered out automatically
- FIFO expiration tracking is maintained

---

**Status:** ✅ Complete
**Date:** October 11, 2025
**Updated Files:** `Api/convenience_store_api.php`

