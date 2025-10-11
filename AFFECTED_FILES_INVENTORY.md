# Files Affected by tbl_product Column Removal

## Overview
This document tracks all files that need to be updated after dropping `quantity` and `srp` columns from `tbl_product`.

## PHP API Files (Api/)

### High Priority - Contains tbl_product queries:
1. **Api/backend.php** - Main API file
2. **Api/convenience_store_api.php** - Convenience store operations
3. **Api/pharmacy_api.php** - Pharmacy operations
4. **Api/batch_tracking.php** - Batch tracking
5. **Api/modules/batch_functions.php** - Batch functions
6. **Api/modules/products.php** - Product operations
7. **Api/modules/reports.php** - Reporting
8. **Api/modules/inventory.php** - Inventory management
9. **Api/sales_api.php** - Sales operations
10. **Api/purchase_order_api.php** - Purchase orders
11. **Api/stock_summary_api.php** - Stock summary

### Backup Files (Can be deleted):
- Api/sales_api.php.backup_20251009053941
- Api/pharmacy_api.php.backup_20251009053940
- Api/modules/reports.php.backup_20251009053940
- Api/modules/inventory.php.backup_20251009053940
- Api/convenience_store_api.php.backup_20251009053940
- Api/batch_tracking.php.backup_20251009053940
- Api/stock_summary_api.php.backup_20251009053941

## JavaScript Frontend Files (app/)

### To be checked:
- All files in app/admin/components/
- All files in app/Inventory_Con/
- All files in app/POS_convenience/
- All files in app/POS_pharmacy/

## Changes Needed

### Remove References To:
- `p.quantity` (from SELECT queries)
- `p.srp` (from SELECT queries)
- `product.quantity` (from result sets)
- `product.srp` (from result sets)
- `quantity = ?` (from UPDATE queries)
- `srp = ?` (from UPDATE queries)

### Replace With:
- For quantity: Use `tbl_fifo_stock.available_quantity` or `tbl_transfer_batch_details.quantity`
- For SRP: Use `tbl_fifo_stock.srp` or `tbl_transfer_batch_details.srp`

## Search Patterns Used:
```bash
# Find quantity references
grep -r "tbl_product.*quantity" Api/
grep -r "p\.quantity" Api/

# Find srp references
grep -r "tbl_product.*srp" Api/
grep -r "p\.srp" Api/

# Find SELECT statements
grep -r "SELECT.*FROM tbl_product" Api/
```

## Status: In Progress
- [x] Inventory created
- [ ] SQL migration created
- [ ] PHP files updated
- [ ] JS files checked
- [ ] Testing completed

