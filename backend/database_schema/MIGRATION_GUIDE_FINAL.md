# Purchase Order Migration - Final Guide

## Kailangan Mo (2 Files Lang!)

### ✅ FILE 1: `purchase_order_migration_simple.sql`
**ITO LANG ANG KINAKAILANGAN!**

I-run ito para:
- ✅ Mag-add ng `product_id` column
- ✅ Mag-populate ng NULL values gamit ang `product_name`
- ✅ Mag-add ng foreign key sa `tbl_product`

**Run this:**
```sql
-- Step 1: Add column
ALTER TABLE `tbl_purchase_order_dtl`
ADD COLUMN `product_id` INT(11) NULL AFTER `purchase_header_id`;

-- Step 2: Fill NULL values
UPDATE `tbl_purchase_order_dtl` pod
INNER JOIN `tbl_product` p ON p.product_name = pod.product_name
SET pod.product_id = p.product_id
WHERE pod.product_id IS NULL;

-- Step 3: Add foreign key
ALTER TABLE `tbl_purchase_order_dtl`
ADD CONSTRAINT `fk_po_dtl_product` 
    FOREIGN KEY (`product_id`) 
    REFERENCES `tbl_product` (`product_id`)
    ON DELETE RESTRICT 
    ON UPDATE CASCADE;
```

### ✅ FILE 2: `purchase_order_populate_null_product_ids.sql` (Optional)
Kailangan lang kung:
- May NULL values pa after running migration
- Gusto mong i-check kung may mga hindi na-match

---

## ❌ HINDI NA KAILANGAN (Optional Files)

### Duplicate Index Files:
- ❌ `purchase_order_remove_duplicates_simple.sql` - **Hindi na kailangan** (walang duplicate based sa error)
- ❌ `purchase_order_check_duplicates.sql` - **Optional lang** (pampacheck lang)
- ❌ `purchase_order_fix_duplicate_safe.sql` - **Hindi na kailangan**

**Bakit?** Ang error mo shows na `idx_po_dtl_header` ay ginagamit ng FK. Hindi duplicate, so OK lang.

### Other Schema Files:
- ❌ `purchase_order_schema.sql` - Reference lang
- ❌ `purchase_order_schema_actual.sql` - Reference lang
- ❌ `purchase_order_migration.sql` - Complex version, hindi na need
- ❌ `purchase_order_relationships_diagram.md` - Documentation lang

**Pwede mo i-delete or i-keep as reference lang.**

---

## Quick Summary

### ❗ IMPORTANTE: Run this file:
```
✅ purchase_order_migration_simple.sql
```

### 📋 Optional (if may issues):
```
⚠️ purchase_order_populate_null_product_ids.sql
```

### 🗑️ Pwede i-delete (hindi na need):
```
❌ purchase_order_remove_duplicates_simple.sql
❌ purchase_order_check_duplicates.sql
❌ purchase_order_fix_duplicate_safe.sql
❌ purchase_order_check_indexes.sql
❌ purchase_order_fix_duplicate_indexes.sql
```

---

## Step-by-Step

1. **Run:** `purchase_order_migration_simple.sql` ✅
2. **Check:** Kung may error, tignan kung ano
3. **Optional:** Run `purchase_order_populate_null_product_ids.sql` kung may NULL pa
4. **Done!** 🎉

**Simple lang - 1 file lang ang kailangan mo!** 🎯

