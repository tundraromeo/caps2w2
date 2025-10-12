# ✅ Pharmacy Sale Database Error - FIXED

## Error Encountered
```
❌ Pharmacy sale failed: "Database error: SQLSTATE[42S22]: Column not found: 1054 Unknown column 'quantity' in 'field list'"
```

**Location:** Pharmacy POS checkout process  
**File:** `Api/pharmacy_api.php` - Line 782 (original code)  
**Function:** `process_pharmacy_sale` action

---

## Root Cause

The `quantity` column was removed from the `tbl_product` table as part of the **multi-unit system migration**. The inventory system now tracks quantities in:

1. ✅ `tbl_fifo_stock` - For batch-level FIFO inventory
2. ✅ `tbl_transfer_batch_details` - For batch transfers between locations
3. ✅ `tbl_stock_summary` - For aggregate stock summaries

However, the pharmacy sale process was still trying to update the non-existent `tbl_product.quantity` column, causing the database error.

---

## Solution Implemented

### Modified File: `Api/pharmacy_api.php`

**Lines Changed:** 779-785

#### BEFORE (Code causing the error):
```php
// Update product quantity
$updateProductStmt = $conn->prepare("
    UPDATE tbl_product 
    SET quantity = quantity - ?
    WHERE product_id = ?
");
$updateProductStmt->execute([$quantity, $product_id]);
```

#### AFTER (Fixed code):
```php
// Note: tbl_product.quantity column has been removed in multi-unit migration
// Quantities are now tracked in tbl_fifo_stock and tbl_transfer_batch_details
```

---

## Why This Fix Works

The pharmacy sale process **already updates quantities correctly** in the proper tables:

### 1. ✅ FIFO Stock Update (Lines 752-757)
```php
UPDATE tbl_fifo_stock 
SET available_quantity = available_quantity - ?
WHERE fifo_id = ?
```
**Purpose:** Reduces available quantity for specific batch (FIFO consumption)

### 2. ✅ Stock Summary Update (Lines 783-790)
```php
UPDATE tbl_stock_summary 
SET available_quantity = available_quantity - ?, 
    total_quantity = total_quantity - ?,
    last_updated = NOW()
WHERE product_id = ?
```
**Purpose:** Updates aggregate quantities for reporting

### 3. ✅ Batch Transfer Update (Lines 794-801)
```php
UPDATE tbl_transfer_batch_details 
SET quantity = quantity - ?
WHERE product_id = ? AND location_id = ?
```
**Purpose:** Fallback for products without FIFO data

### 4. ✅ Stock Movement Logging (Lines 809-827)
```php
INSERT INTO tbl_stock_movements (
    product_id, batch_id, movement_type, quantity, remaining_quantity,
    reference_no, notes, created_by
) VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?)
```
**Purpose:** Audit trail for stock movements

The obsolete `UPDATE tbl_product.quantity` statement was:
- ❌ Redundant (quantities already updated in proper tables)
- ❌ Incorrect (column doesn't exist)
- ❌ Breaking the pharmacy sale process

---

## Testing Instructions

### Test the Fix:
1. ✅ Navigate to POS page with **Pharmacy** location
2. ✅ Add products to cart (ensure they have FIFO stock)
3. ✅ Enter payment details (cash/gcash/card)
4. ✅ Click "Complete Sale" or "Checkout"

### Expected Results:
- ✅ Sale completes successfully
- ✅ No database errors
- ✅ Stock quantities reduced correctly
- ✅ Receipt prints (if configured)
- ✅ Transaction recorded in POS tables
- ✅ Stock movements logged

### Verify Stock Updates:
```sql
-- Check FIFO stock after sale
SELECT 
    p.product_name,
    fs.batch_reference,
    fs.available_quantity,
    fs.expiration_date
FROM tbl_fifo_stock fs
JOIN tbl_product p ON fs.product_id = p.product_id
WHERE p.product_name LIKE '%your-product%'
ORDER BY fs.expiration_date ASC;

-- Check stock movements
SELECT 
    sm.movement_type,
    sm.quantity,
    sm.remaining_quantity,
    sm.reference_no,
    sm.created_at
FROM tbl_stock_movements sm
WHERE sm.product_id = ?
ORDER BY sm.created_at DESC
LIMIT 10;
```

---

## Additional Notes

### Migration Context
See `MIGRATION_DROP_TBL_PRODUCT_COLUMNS.sql` for details on the column removal.

### Recommended Follow-Up Actions

⚠️ **WARNING:** There are **62 other instances** of `UPDATE tbl_product` statements in the codebase that may need similar fixes:

```bash
# Find potentially problematic code
grep -r "UPDATE tbl_product" Api/ --include="*.php" -C 3
```

**Locations identified:**
- `Api/backend.php` - Multiple locations
- Other API files

**Recommendation:** Audit and update these to ensure they don't reference removed columns.

---

## Architecture Best Practices

### ✅ Correct Way to Get Stock Quantities:
```php
// Get available stock for a product
$stmt = $conn->prepare("
    SELECT COALESCE(SUM(available_quantity), 0) as total_stock
    FROM tbl_fifo_stock
    WHERE product_id = ?
");
$stmt->execute([$product_id]);
$stock = $stmt->fetchColumn();
```

### ❌ Incorrect (Old Way):
```php
// DON'T DO THIS - quantity column doesn't exist!
$stmt = $conn->prepare("SELECT quantity FROM tbl_product WHERE product_id = ?");
```

### ✅ Correct Way to Get Product Price:
```php
// Get FIFO price (oldest batch first)
$stmt = $conn->prepare("
    SELECT srp
    FROM tbl_fifo_stock
    WHERE product_id = ? AND available_quantity > 0
    ORDER BY expiration_date ASC
    LIMIT 1
");
$stmt->execute([$product_id]);
$price = $stmt->fetchColumn();
```

---

## Related Documentation

- 📄 `MIGRATION_DROP_TBL_PRODUCT_COLUMNS.sql` - Migration details
- 📄 `MULTI_UNIT_IMPLEMENTATION_GUIDE.md` - Multi-unit system guide
- 📄 `FLEXIBLE_UNITS_GUIDE.md` - Unit system documentation
- 📄 `Api/modules/sales.php` - POS sales module

---

## Status

✅ **FIXED** - Pharmacy sales now work correctly  
📅 **Date:** October 12, 2025  
👤 **Fixed By:** AI Assistant  
🔧 **Modified Files:** `Api/pharmacy_api.php`

---

## Git Commit Message Suggestion

```
fix(pharmacy): remove obsolete tbl_product.quantity update in pharmacy sales

- Removed UPDATE tbl_product SET quantity statement from process_pharmacy_sale
- Column 'quantity' was removed in multi-unit migration
- Quantities are properly tracked in tbl_fifo_stock and tbl_transfer_batch_details
- Fixes SQLSTATE[42S22] Column not found error during pharmacy checkout
- Closes pharmacy sale transaction error

Refs: MIGRATION_DROP_TBL_PRODUCT_COLUMNS.sql
```

---

## Emergency Rollback (Not Recommended)

If you need to rollback this fix (not recommended), restore the removed lines:

```php
// Update product quantity
$updateProductStmt = $conn->prepare("
    UPDATE tbl_product 
    SET quantity = quantity - ?
    WHERE product_id = ?
");
$updateProductStmt->execute([$quantity, $product_id]);
```

**However**, this will still fail unless you re-add the `quantity` column to `tbl_product`:

```sql
ALTER TABLE tbl_product 
ADD COLUMN quantity INT DEFAULT 0;
```

⚠️ **Not recommended** as it breaks the multi-unit architecture design.

