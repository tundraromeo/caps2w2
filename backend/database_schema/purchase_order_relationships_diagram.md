# Purchase Order System - Database Relationships

## Entity Relationship Diagram (Text Representation)

```
┌─────────────────────────────────┐
│      tbl_supplier                │
├─────────────────────────────────┤
│ PK  supplier_id (INT)           │
│     supplier_name (VARCHAR)     │
│     supplier_contact (VARCHAR)  │
│     supplier_email (VARCHAR)    │
│     status (ENUM)               │
│     ...                          │
└─────────────────────────────────┘
            │
            │ 1:N (One supplier, Many POs)
            │
            ▼
┌─────────────────────────────────┐
│  tbl_purchase_order_header      │
├─────────────────────────────────┤
│ PK  purchase_header_id (INT)    │
│ FK  supplier_id ───────────┐    │
│     po_number (VARCHAR)     │    │
│     expected_delivery_date  │    │
│     total_amount (DECIMAL)  │    │
│     status (ENUM)           │    │
│     date, time, notes       │    │
│     created_by (INT)        │    │
└─────────────────────────────────┘
            │
            │ 1:N (One PO Header, Many Items)
            │
            ▼
┌─────────────────────────────────┐
│   tbl_purchase_order_dtl        │
├─────────────────────────────────┤
│ PK  purchase_dtl_id (INT)      │
│ FK  purchase_header_id ─────┐   │
│ FK  product_id ─────────────┼──┐│
│     product_name (VARCHAR)  │  ││
│     quantity (INT)          │  ││
│     received_qty (INT)      │  ││
│     missing_qty (INT)       │  ││
│     unit_type (ENUM)        │  ││
│     unit_price (DECIMAL)    │  ││
│     subtotal (DECIMAL)      │  ││
│     item_status (ENUM)      │  ││
└─────────────────────────────────┘
            │
            │ N:1 (Many Details, One Product)
            │
            └──────────────────┐
                               │
                               ▼
                  ┌────────────────────────────┐
                  │      tbl_product           │
                  ├────────────────────────────┤
                  │ PK  product_id (INT)       │
                  │     product_name (VARCHAR)│
                  │     barcode (VARCHAR)      │
                  │     category_id (INT)      │
                  │     supplier_id (INT)      │
                  │     description (TEXT)     │
                  │     status (VARCHAR)       │
                  └────────────────────────────┘
```

## Foreign Key Relationships

### 1. Supplier → Purchase Order Header
```
tbl_purchase_order_header.supplier_id 
    → REFERENCES tbl_supplier.supplier_id
    → ON DELETE RESTRICT (Cannot delete supplier with active POs)
    → ON UPDATE CASCADE (If supplier_id changes, update all POs)
```

### 2. Purchase Order Header → Purchase Order Detail
```
tbl_purchase_order_dtl.purchase_header_id 
    → REFERENCES tbl_purchase_order_header.purchase_header_id
    → ON DELETE CASCADE (If PO is deleted, delete all items)
    → ON UPDATE CASCADE (If header_id changes, update all details)
```

### 3. Product → Purchase Order Detail
```
tbl_purchase_order_dtl.product_id 
    → REFERENCES tbl_product.product_id
    → ON DELETE RESTRICT (Cannot delete product if in active POs)
    → ON UPDATE CASCADE (If product_id changes, update all PO details)
```

## Cardinality Summary

| Relationship | Type | Description |
|-------------|------|-------------|
| Supplier : PO Header | 1:N | One supplier can have many purchase orders |
| PO Header : PO Detail | 1:N | One purchase order can have many items |
| Product : PO Detail | 1:N | One product can appear in many purchase orders |

## Example Data Flow

### Creating a Purchase Order:

1. **Select Supplier** (1 supplier per PO)
   ```sql
   SELECT * FROM tbl_supplier WHERE supplier_id = 1
   ```

2. **Create PO Header** (Links to supplier)
   ```sql
   INSERT INTO tbl_purchase_order_header 
   (supplier_id, po_number, expected_delivery_date, ...)
   VALUES (1, 'PO-20240101-0001', '2024-01-15', ...)
   ```

3. **Add Products to PO** (Multiple products, each links to product_id)
   ```sql
   INSERT INTO tbl_purchase_order_dtl 
   (purchase_header_id, product_id, quantity, unit_type, ...)
   VALUES 
   (100, 50, 100, 'pieces', ...),  -- Product ID 50
   (100, 51, 50, 'pieces', ...),   -- Product ID 51
   (100, 52, 25, 'bulk', ...)      -- Product ID 52
   ```

### Querying Purchase Orders:

```sql
-- Get PO with supplier and all products
SELECT 
    po.purchase_header_id,
    po.po_number,
    po.date,
    s.supplier_name,
    s.supplier_contact,
    pod.product_id,
    p.product_name,
    pod.quantity,
    pod.unit_type,
    pod.received_qty,
    pod.item_status
FROM tbl_purchase_order_header po
INNER JOIN tbl_supplier s ON po.supplier_id = s.supplier_id
INNER JOIN tbl_purchase_order_dtl pod ON po.purchase_header_id = pod.purchase_header_id
INNER JOIN tbl_product p ON pod.product_id = p.product_id
WHERE po.purchase_header_id = 100;
```

## Benefits of Foreign Keys

1. **Data Integrity**: Prevents orphaned records
2. **Referential Integrity**: Ensures all products and suppliers exist
3. **Cascade Operations**: Automatic cleanup on deletion
4. **Performance**: Indexes on foreign keys improve query speed
5. **Data Consistency**: Prevents invalid relationships

