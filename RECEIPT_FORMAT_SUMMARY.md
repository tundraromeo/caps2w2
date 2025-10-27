# Receipt Format Summary

## Current Receipt Format

### Column Headers (from left to right):
1. **QTY** - Quantity of items
2. **ITEMS** - Name of the product/item
3. **SRP** - Suggested Retail Price per unit
4. **TOTAL** - Total price (QTY × SRP)

### Example Receipt Output:

```
================================
    ENGUIO'S PHARMACY    
================================
Date: 2024-01-15
Time: 14:30:25
TXN ID: TXN001234
Cashier: John Doe
Terminal: POS-001
--------------------------------
QTY  ITEMS             SRP    TOTAL
--------------------------------
2    Paracetamol 500   25.00   50.00
1    Aspirin 100mg     15.00   15.00
3    Vitamin C 1000mg  30.00   90.00
--------------------------------
TOTAL : 6 items (3 items)
--------------------------------
SUBTOTAL:                   155.00
--------------------------------
GRAND TOTAL:                 155.00
--------------------------------
PAYMENT: CASH
CASH:                      200.00
CHANGE:                     45.00
================================
        Thank you!        
     Please come again    
  This is your official receipt
================================
```

## Files Updated

### 1. `frontend/app/POS_convenience/printer.js`
- Browser print format
- Column order: QTY | ITEMS | SRP | TOTAL
- Item name column: 18 characters max (truncated with "...")

### 2. `frontend/app/POS_convenience/online-printing.js`
- HTML table format for browser print
- Header: QTY | ITEMS | SRP | TOTAL
- Column widths: 8% QTY, 52% ITEMS, 20% SRP, 20% TOTAL

### 3. `backend/Api/qz-tray-receipt.php`
- QZ Tray thermal printer format
- Header: `QTY  ITEMS             SRP    TOTAL`
- Column widths: QTY (3 chars), ITEMS (18 chars), SRP (6 chars), TOTAL (7 chars)
- Uses SRP from item data

## Format Specifications

| Column | Width | Alignment | Content |
|--------|-------|-----------|---------|
| QTY | 3 chars | Left | Quantity |
| ITEMS | 18 chars | Left | Product name (truncated if >18) |
| SRP | 6 chars | Right | Unit price |
| TOTAL | 7 chars | Right | Total price |

## Changes Made

1. ✅ Changed column header from "PRODUCT NAME" to "ITEMS"
2. ✅ Column order is: QTY | ITEMS | SRP | TOTAL
3. ✅ Removed currency symbol (₱) from SRP and TOTAL columns
4. ✅ Added proper spacing between columns (2 spaces)
5. ✅ All three print methods (QZ Tray, Browser, Online) now use the same format
