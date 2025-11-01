# Fix for Duplicate Index Warning

## Problem
```
Note: #1831 Duplicate index `idx_po_dtl_header`. 
This is deprecated and will be disallowed in a future release
```

## Root Cause
When you create a **FOREIGN KEY constraint**, MySQL/MariaDB **automatically creates an index** on that column. If you also manually create an index on the same column, it becomes a duplicate.

### Example:
- FK constraint `fk_po_dtl_header` on `purchase_header_id` → **Auto-creates index**
- Manual index `idx_po_dtl_header` on `purchase_header_id` → **Duplicate!**

## Solution

### Option 1: Remove the Duplicate Index (Recommended)
Run this SQL to remove the duplicate:

```sql
-- Remove duplicate idx_po_dtl_header
-- The FK constraint index is sufficient
ALTER TABLE `tbl_purchase_order_dtl` 
DROP INDEX `idx_po_dtl_header`;

-- Also check for supplier_id duplicate
ALTER TABLE `tbl_purchase_order_header` 
DROP INDEX `idx_po_supplier`;
```

**Why it's safe:** The foreign key constraint already creates an index that serves the same purpose.

### Option 2: Use the Fix Script
Run `purchase_order_fix_duplicate_indexes.sql` which automatically detects and removes duplicates.

## Indexes Created by Foreign Keys

| Foreign Key Constraint | Column | Auto-Index Name |
|------------------------|--------|----------------|
| `fk_po_header_supplier` | `supplier_id` | `fk_po_header_supplier` |
| `fk_po_dtl_header` | `purchase_header_id` | `fk_po_dtl_header` |
| `fk_po_dtl_product` | `product_id` | `fk_po_dtl_product` |

**IMPORTANT:** Do NOT manually create indexes with names like:
- ❌ `idx_po_dtl_header` (duplicate of FK index)
- ❌ `idx_po_supplier` (duplicate of FK index)
- ✅ `idx_po_dtl_product` (OK - this is for the new FK we're adding)
- ✅ `idx_po_dtl_status` (OK - no FK on this column)
- ✅ `idx_po_status` (OK - no FK on this column)
- ✅ `idx_po_date` (OK - no FK on this column)

## Performance Impact

**Removing duplicate indexes is SAFE:**
- Foreign key constraints automatically create indexes
- These indexes are sufficient for JOIN performance
- Duplicate indexes waste storage and slow down INSERT/UPDATE operations
- No performance loss from removing the duplicate

## Verification

After running the fix, check indexes:

```sql
-- List all indexes on tbl_purchase_order_dtl
SHOW INDEXES FROM `tbl_purchase_order_dtl`;

-- Or query INFORMATION_SCHEMA
SELECT 
    INDEX_NAME,
    COLUMN_NAME,
    CASE 
        WHEN INDEX_NAME IN (
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'tbl_purchase_order_dtl'
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        ) THEN 'FK Auto-Index'
        ELSE 'Manual Index'
    END AS INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'tbl_purchase_order_dtl'
ORDER BY INDEX_NAME;
```

You should see:
- ✅ `fk_po_dtl_header` (FK auto-index) - **Keep this**
- ✅ `fk_po_dtl_product` (FK auto-index) - **Keep this**
- ✅ `idx_po_dtl_product` (if exists, for additional optimization) - **Keep this**
- ✅ `idx_po_dtl_status` (manual index) - **Keep this**
- ❌ `idx_po_dtl_header` - **Should be removed (duplicate)**

