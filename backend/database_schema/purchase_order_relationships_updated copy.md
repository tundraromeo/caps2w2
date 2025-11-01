# Purchase Order System - Database Relationships (Based on Actual Database)

## Entity Relationship Diagram (Text Representation)

```
┌─────────────────────────────────┐
│      tbl_supplier                │
├─────────────────────────────────┤
│ PK  supplier_id (INT)           │
│     supplier_name (VARCHAR)     │
│     supplier_contact (VARCHAR)  │
│     supplier_email (VARCHAR)    │
│     status (ENUM)                │
│     ... (other fields)           │
└─────────────────────────────────┘
            │
            │ 1:N (One supplier, Many POs)
            │ FK: supplier_id
            │
            ▼
┌─────────────────────────────────┐
│  tbl_purchase_order_header      │
├─────────────────────────────────┤
│ PK  purchase_header_id (INT)    │
│ FK  supplier_id ───────────┐    │
│     po_number (VARCHAR)     │    │
│     date (DATE)            │    │
│     expected_delivery_date  │    │
│     time (TIME)            │    │
│     total_amount (DECIMAL)  │    │
│     created_by (INT)       │    │
│     status (ENUM)          │    │
│     notes (TEXT)           │    │
└─────────────────────────────────┘
            │
            │ 1:N (One PO Header, Many Items)
            │ FK: purchase_header_id
            │
            ▼
┌─────────────────────────────────┐
│   tbl_purchase_order_dtl         │
├─────────────────────────────────┤
│ PK  purchase_dtl_id (INT)       │
│ FK  purchase_header_id ─────┐   │
│ FK  product_id ─────────────┼──┐│  ← TO BE ADDED
│     product_name (VARCHAR)  │  ││  ← Existing (denormalized)
│     quantity (INT)          │  ││
│     unit_type (VARCHAR)     │  ││
│     received_qty (INT)      │  ││
│     missing_qty (INT)       │  ││
│     item_status (VARCHAR)   │  ││
└─────────────────────────────────┘
            │
            │ N:1 (Many Details, One Product)
            │ FK: product_id (TO BE ADDED)
            │
            └──────────────────┐
                               │
                               ▼
                  ┌────────────────────────────┐
                  │      tbl_product           │
                  ├────────────────────────────┤
                  │ PK  product_id (INT)        │
                  │     product_name (VARCHAR) │
                  │     category_id (INT)      │
                  │     barcode (BIGINT)       │
                  │     supplier_id (INT)      │
                  │     ... (other fields)     │
                  └────────────────────────────┘
```

## Current Database State

### Existing Foreign Keys:
1. ✅ `tbl_purchase_order_header.supplier_id` → `tbl_supplier.supplier_id`
   - Index: `fk_po_header_supplier` (exists)
   - Action: RESTRICT on DELETE, CASCADE on UPDATE

2. ✅ `tbl_purchase_order_dtl.purchase_header_id` → `tbl_purchase_order_header.purchase_header_id`
   - Index: `fk_po_dtl_header` (exists)
   - Action: CASCADE on DELETE, CASCADE on UPDATE

### Missing Foreign Key (TO BE ADDED):
3. ❌ `tbl_purchase_order_dtl.product_id` → `tbl_product.product_id`
   - **PROBLEM**: `product_id` column doesn't exist in `tbl_purchase_order_dtl`!
   - **SOLUTION**: Add column first, then add FK constraint

## Migration Required

### Issue Found:
- `tbl_purchase_order_dtl` currently only has `product_name` (VARCHAR)
- No `product_id` column exists
- Cannot create FK relationship to `tbl_product` without `product_id`

### Solution:
1. Add `product_id` column to `tbl_purchase_order_dtl`
2. Populate `product_id` by matching `product_name` to `tbl_product.product_name`
3. Add foreign key constraint `fk_po_dtl_product`

## Table Structures (Actual)

### tbl_purchase_order_header
```sql
CREATE TABLE `tbl_purchase_order_header` (
  `purchase_header_id` int(11) NOT NULL,
  `po_number` varchar(50) DEFAULT NULL,
  `date` date NOT NULL,
  `expected_delivery_date` date DEFAULT NULL,
  `time` time NOT NULL,
  `supplier_id` int(11) NOT NULL,  -- FK to tbl_supplier
  `total_amount` decimal(10,2) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `status` enum('delivered','partial_delivery','pending_fulfillment',
                'complete','approved','return','unpaid','to_ship',
                'shipped','to_review','received') DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`purchase_header_id`),
  KEY `fk_po_header_supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

### tbl_purchase_order_dtl (Current - Needs Modification)
```sql
CREATE TABLE `tbl_purchase_order_dtl` (
  `purchase_dtl_id` int(11) NOT NULL,
  `purchase_header_id` int(11) NOT NULL,  -- FK to tbl_purchase_order_header
  `product_name` varchar(255) DEFAULT NULL,  -- ❌ No product_id!
  `quantity` int(11) NOT NULL,
  `unit_type` varchar(50) DEFAULT 'pieces',
  `received_qty` int(11) DEFAULT 0,
  `missing_qty` int(11) DEFAULT 0,
  `item_status` varchar(20) DEFAULT 'pending',
  PRIMARY KEY (`purchase_dtl_id`),
  KEY `fk_po_dtl_header` (`purchase_header_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

### tbl_purchase_order_dtl (After Migration - Target Structure)
```sql
CREATE TABLE `tbl_purchase_order_dtl` (
  `purchase_dtl_id` int(11) NOT NULL,
  `purchase_header_id` int(11) NOT NULL,  -- FK to tbl_purchase_order_header
  `product_id` int(11) NOT NULL,  -- ✅ NEW: FK to tbl_product
  `product_name` varchar(255) DEFAULT NULL,  -- Keep for denormalization/backup
  `quantity` int(11) NOT NULL,
  `unit_type` varchar(50) DEFAULT 'pieces',
  `received_qty` int(11) DEFAULT 0,
  `missing_qty` int(11) DEFAULT 0,
  `item_status` varchar(20) DEFAULT 'pending',
  PRIMARY KEY (`purchase_dtl_id`),
  KEY `fk_po_dtl_header` (`purchase_header_id`),
  KEY `fk_po_dtl_product` (`product_id`),  -- ✅ NEW
  CONSTRAINT `fk_po_dtl_header` FOREIGN KEY (`purchase_header_id`) 
    REFERENCES `tbl_purchase_order_header` (`purchase_header_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_po_dtl_product` FOREIGN KEY (`product_id`) 
    REFERENCES `tbl_product` (`product_id`)  -- ✅ NEW
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

## Foreign Key Relationships Summary

| Relationship | Status | Constraint Name | On Delete | On Update |
|-------------|--------|----------------|-----------|-----------|
| Supplier → PO Header | ✅ Exists | `fk_po_header_supplier` | RESTRICT | CASCADE |
| PO Header → PO Detail | ✅ Exists | `fk_po_dtl_header` | CASCADE | CASCADE |
| Product → PO Detail | ❌ **MISSING** | `fk_po_dtl_product` | RESTRICT | CASCADE |

## Benefits After Migration

1. **Data Integrity**: Cannot create PO detail with invalid product_id
2. **Cascade Deletes**: Deleting a PO automatically deletes all its items
3. **Referential Integrity**: Products referenced in POs cannot be deleted
4. **Query Performance**: Joins become faster with proper indexes on FKs
5. **Data Consistency**: Ensures all products in POs exist in product master

## Example Queries After Migration

### Get PO with Supplier and Products (with proper joins)
```sql
SELECT 
    po.purchase_header_id,
    po.po_number,
    po.date,
    s.supplier_name,
    s.supplier_contact,
    pod.purchase_dtl_id,
    pod.product_id,  -- ✅ Can now use product_id!
    p.product_name,
    p.barcode,
    pod.quantity,
    pod.unit_type,
    pod.received_qty,
    pod.item_status
FROM tbl_purchase_order_header po
INNER JOIN tbl_supplier s ON po.supplier_id = s.supplier_id
INNER JOIN tbl_purchase_order_dtl pod ON po.purchase_header_id = pod.purchase_header_id
INNER JOIN tbl_product p ON pod.product_id = p.product_id  -- ✅ Proper FK join!
WHERE po.purchase_header_id = 100;
```

## Migration Script

Run `purchase_order_schema_actual.sql` to:
1. Add `product_id` column
2. Populate it from existing `product_name`
3. Add foreign key constraint

