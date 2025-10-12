# Pharmacy Sale Quantity Column Fix

## Issue Description
**Error:** `SQLSTATE[42S22]: Column not found: 1054 Unknown column 'quantity' in 'field list'`

**Location:** `Api/pharmacy_api.php` in the `process_pharmacy_sale` action

**Root Cause:** The code was attempting to update a non-existent `quantity` column in the `tbl_product` table. This column was removed as part of the multi-unit migration where quantities are now tracked in `tbl_fifo_stock` and `tbl_transfer_batch_details` tables instead.

## What Was Fixed

### File: `Api/pharmacy_api.php` (Lines 779-781)

**BEFORE (Lines 779-785):**
```php
// Update product quantity
$updateProductStmt = $conn->prepare("
    UPDATE tbl_product 
    SET quantity = quantity - ?
    WHERE product_id = ?
");
$updateProductStmt->execute([$quantity, $product_id]);
```

**AFTER (Lines 779-781):**
```php
// Note: tbl_product.quantity column has been removed in multi-unit migration
// Quantities are now tracked in tbl_fifo_stock and tbl_transfer_batch_details
```

## Why This Works

The pharmacy sale process already updates quantities in the correct tables:

1. **tbl_fifo_stock** (Lines 752-757): Updates `available_quantity` for FIFO batch consumption
   ```php
   UPDATE tbl_fifo_stock 
   SET available_quantity = available_quantity - ?
   WHERE fifo_id = ?
   ```

2. **tbl_stock_summary** (Lines 783-790): Updates aggregate quantities
   ```php
   UPDATE tbl_stock_summary 
   SET available_quantity = available_quantity - ?, 
       total_quantity = total_quantity - ?,
       last_updated = NOW()
   WHERE product_id = ?
   ```

3. **tbl_transfer_batch_details** (Lines 794-801): Fallback for products without FIFO data
   ```php
   UPDATE tbl_transfer_batch_details 
   SET quantity = quantity - ?
   WHERE product_id = ? AND location_id = ?
   ```

The obsolete update to `tbl_product.quantity` was redundant and causing the error.

## Testing

### Test Scenario
1. Navigate to the Pharmacy POS (`/POS_convenience` with pharmacy location)
2. Add products to cart
3. Complete a sale transaction
4. Verify:
   - ✅ Sale completes successfully without errors
   - ✅ Stock quantities are correctly reduced in `tbl_fifo_stock`
   - ✅ Stock summary is updated in `tbl_stock_summary`
   - ✅ Transaction is recorded in POS tables

### Expected Behavior
- Pharmacy sales should now process successfully
- FIFO batch consumption should work correctly
- Stock movements should be logged properly
- No database column errors

## Architecture Context

### Multi-Unit Migration
The Enguio Inventory System has migrated to a multi-unit architecture where:

- **tbl_product**: Contains only master product data (name, category, location, etc.)
- **tbl_fifo_stock**: Tracks available quantities per batch with FIFO ordering
- **tbl_transfer_batch_details**: Tracks batch transfers between locations
- **tbl_stock_summary**: Maintains aggregate stock summaries for reporting

### Why `quantity` Was Removed from `tbl_product`
- Enforces single source of truth for stock quantities
- Enables proper FIFO (First In, First Out) tracking
- Supports multi-location batch management
- Prevents data inconsistencies between tables

See `MIGRATION_DROP_TBL_PRODUCT_COLUMNS.sql` for migration details.

## Related Issues

### Other Files That May Need Updates
The codebase scan revealed **62 instances** of `UPDATE tbl_product` statements, many of which may still reference the removed `quantity` column. These are located in:

- `Api/backend.php` (multiple locations)
- Other API files

**Recommendation:** Conduct a full audit of all `UPDATE tbl_product SET quantity` statements and remove/update them accordingly.

### Search Command
```bash
grep -r "UPDATE tbl_product.*SET.*quantity" Api/ --include="*.php"
```

## Verification Queries

### Check if `quantity` column exists (should return empty)
```sql
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tbl_product' 
  AND COLUMN_NAME = 'quantity'
  AND TABLE_SCHEMA = DATABASE();
```

### Get current stock for a product (correct approach)
```sql
SELECT 
    p.product_name,
    COALESCE(SUM(fs.available_quantity), 0) as current_stock
FROM tbl_product p
LEFT JOIN tbl_fifo_stock fs ON p.product_id = fs.product_id
WHERE p.product_id = ?
GROUP BY p.product_id;
```

## Status
✅ **FIXED** - Pharmacy sales now work correctly without attempting to update non-existent column.

## Date
October 12, 2025

## Modified Files
- `Api/pharmacy_api.php` (Lines 779-785 removed, replaced with comment)

