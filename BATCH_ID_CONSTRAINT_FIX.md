# Batch ID Foreign Key Constraint Fix

## Problem
The POS convenience and pharmacy sales were failing with the following error:
```
SQLSTATE[23000]: Integrity constraint violation: 1452 Cannot add or update a child row: 
a foreign key constraint fails (`enguio2`.`tbl_stock_movements`, 
CONSTRAINT `fk_movement_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) 
ON DELETE CASCADE ON UPDATE CASCADE)
```

## Root Cause
Several API endpoints were inserting records into `tbl_stock_movements` without providing a valid `batch_id`, 
even though the table has a foreign key constraint requiring it to reference a valid batch in `tbl_batch`.

## Files Fixed

### 1. `Api/convenience_store_api.php` (Lines 784-840)
**Issue**: The `process_convenience_sale` function was inserting stock movements without `batch_id`.

**Solution**: 
- Now creates individual stock movement records for each consumed FIFO batch
- Includes a fallback mechanism to find or use any valid batch_id if FIFO data is unavailable
- Throws an error if no valid batch can be found

### 2. `Api/pharmacy_api.php` (Lines 619-675)
**Issue**: The `process_pharmacy_sale` function had the same issue as convenience store.

**Solution**: 
- Applied the same fix as convenience_store_api.php
- Creates stock movements for each consumed FIFO batch
- Includes fallback mechanism for non-FIFO scenarios

### 3. `Api/pos_exchange_api.php` (Lines 227-257 and 284-314)
**Issue**: Exchange returns and sales were inserting stock movements without `batch_id`.

**Solution**:
- Added batch lookup logic before inserting stock movements
- Queries `tbl_fifo_stock` and `tbl_stock_summary` to find valid batch_id
- Logs warning if no batch found but continues with exchange processing

### 4. `Api/modules/inventory.php` (Lines 274-315 and 602-642)
**Issue**: Manual stock adjustments and additions were using `batch_id = 0` (hardcoded).

**Solution**:
- Added logic to find existing batch_id from FIFO or stock summary tables
- Creates a new generic batch if none exists (using reference like "MANUAL-ADJ-{timestamp}")
- Ensures all stock movements have valid batch_id references

## How It Works Now

### For POS Sales (Convenience & Pharmacy)
1. FIFO batches are consumed during sale
2. For each consumed batch, a separate stock movement record is created with the correct `batch_id`
3. If no FIFO batches are available (edge case), system searches for any valid batch associated with the product
4. If no batch exists at all, an error is thrown to prevent data integrity issues

### For Exchanges
1. Before logging stock movement, system queries for a valid batch_id from FIFO or stock summary
2. If found, uses that batch_id for the stock movement
3. If not found, logs a warning but continues (to avoid blocking exchanges)

### For Manual Stock Adjustments
1. System searches for existing batch_id from FIFO or stock summary tables
2. If none exists, creates a new generic batch with a timestamped reference
3. Uses the valid batch_id for stock movement logging

## Testing Recommendations

1. **Test POS Sales**:
   - Try completing a sale in Convenience Store
   - Try completing a sale in Pharmacy
   - Verify stock movements are created with valid batch_id

2. **Test Edge Cases**:
   - Products with FIFO data (should use FIFO batches)
   - Products without FIFO data (should use fallback mechanism)
   - New products with no batch history (should handle gracefully)

3. **Test Exchanges**:
   - Create an exchange with returned items
   - Verify stock movements are created for both returns and new sales

4. **Test Manual Adjustments**:
   - Adjust stock quantity manually
   - Add stock to a product
   - Verify batch_id is created/used correctly

## Database Impact
- No schema changes required
- Existing foreign key constraint remains in place
- All INSERT operations now comply with the constraint

## Backward Compatibility
- Changes are backward compatible
- Existing batches and stock movements are not affected
- Only affects new stock movements going forward

## Additional Notes
- All modified files passed PHP syntax validation
- Error logging added to track when fallback mechanisms are used
- System creates generic batches when necessary to maintain data integrity

