# Receipt Format Example

## Visual Receipt Format

```
CUST# :
NAME :

          ENGUIO'S PHARMACY
Z1 Lumbia, Cagayan de Oro
NON-VAT TIN#: 639-304-084-00000
PDBS S/N: 1CF-A8F83
TRNX: 0000000000130076
Sales Order: 000000040502
05/02/2025 Time 11:32:20 AM
admin-1 Assist

ITEM(S)                                    UPRICE       TOTAL
1 PC
FLUGARD (PARACETAMOL) 500MG
                                      3.50         3.50
------------------------------------------------
1 Item(s)                                        3.50

VATable Sale                               0.00
VAT Exempt Sale                             3.50
VAT Zero-Rated                              0.00
VAT 12%                                     0.00

TOTAL AMOUNT                                3.50
CASH                                       50.00
CHANGE                                     46.50

                  Thank you
            Please Come Again
      THIS IS NOT AN OFFICIAL RECEIPT
```

## Data Structure for Printing

When calling the print function, provide data in this format:

```javascript
const receiptData = {
  // Customer Information (Optional)
  customerNumber: "12345",
  customerName: "John Doe",
  
  // Store Information
  storeName: "ENGUIO'S PHARMACY",
  address: "Z1 Lumbia, Cagayan de Oro",
  tin: "639-304-084-00000",
  pdbsSn: "1CF-A8F83",  // Terminal Serial Number
  
  // Transaction Information
  transactionId: "130076",  // Will be padded to 16 digits
  salesOrder: "40502",  // Will be padded to 12 digits
  date: "05/02/2025",  // Format: MM/DD/YYYY
  time: "11:32:20 AM",  // Format: HH:MM:SS AM/PM
  cashier: "admin-1",  // or use 'assistant' field
  
  // Items Array
  items: [
    {
      name: "FLUGARD (PARACETAMOL) 500MG",
      quantity: 1,
      unit: "PC",  // PC, BTL, BOX, etc.
      price: 3.50,  // Selling price
      srp: 3.50  // Suggested Retail Price (optional, defaults to price)
    }
  ],
  
  // Totals
  subtotal: 3.50,
  grandTotal: 3.50,
  total: 3.50,
  
  // VAT/Tax Breakdown (Optional - defaults shown)
  vatableSale: 0.00,
  vatExemptSale: 3.50,  // Defaults to subtotal if not provided
  vatZeroRated: 0.00,
  vat12: 0.00,
  
  // Payment Information
  paymentMethod: "cash",  // "cash" or "gcash"
  amountPaid: 50.00,
  change: 46.50,
  gcashRef: "",  // Only needed for GCash payments
  
  // Discount (Optional)
  discountType: "",  // e.g., "Senior", "PWD", "Employee"
  discountAmount: 0.00,
  discountPercent: 0
};
```

## Example Usage

### Basic Cash Transaction

```javascript
const receiptData = {
  storeName: "ENGUIO'S PHARMACY",
  address: "Z1 Lumbia, Cagayan de Oro",
  transactionId: "130076",
  date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
  time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
  cashier: "admin-1",
  items: [
    {
      name: "FLUGARD (PARACETAMOL) 500MG",
      quantity: 1,
      unit: "PC",
      price: 3.50,
      srp: 3.50
    }
  ],
  subtotal: 3.50,
  grandTotal: 3.50,
  paymentMethod: "cash",
  amountPaid: 50.00,
  change: 46.50,
  vatExemptSale: 3.50
};

// Print using printer integration
await printerIntegration.printReceipt(receiptData);
```

### Multiple Items Example

```javascript
const receiptData = {
  storeName: "ENGUIO'S PHARMACY",
  address: "Z1 Lumbia, Cagayan de Oro",
  tin: "639-304-084-00000",
  transactionId: "130076",
  date: "05/02/2025",
  time: "11:32:20 AM",
  cashier: "admin-1",
  items: [
    {
      name: "FLUGARD (PARACETAMOL) 500MG",
      quantity: 2,
      unit: "PC",
      price: 3.50,
      srp: 3.50
    },
    {
      name: "BIOTIC SYRUP 120ML",
      quantity: 1,
      unit: "BTL",
      price: 125.00,
      srp: 125.00
    }
  ],
  subtotal: 132.00,
  grandTotal: 132.00,
  paymentMethod: "cash",
  amountPaid: 150.00,
  change: 18.00,
  vatExemptSale: 132.00
};
```

### GCash Payment Example

```javascript
const receiptData = {
  storeName: "ENGUIO'S PHARMACY",
  transactionId: "130076",
  items: [
    {
      name: "FLUGARD (PARACETAMOL) 500MG",
      quantity: 1,
      unit: "PC",
      price: 3.50,
      srp: 3.50
    }
  ],
  subtotal: 3.50,
  grandTotal: 3.50,
  paymentMethod: "gcash",
  amountPaid: 3.50,
  change: 0.00,
  gcashRef: "GCASH123456789",
  vatExemptSale: 3.50
};
```

## Field Descriptions

| Field | Required | Description | Default |
|-------|----------|-------------|---------|
| `storeName` | No | Store/Business name | "ENGUIO'S PHARMACY" |
| `address` | No | Store address | "Z1 Lumbia, Cagayan de Oro" |
| `tin` | No | Tax Identification Number | "639-304-084-00000" |
| `pdbsSn` | No | Terminal/Device Serial Number | "1CF-A8F83" |
| `transactionId` | Yes | Transaction number (auto-padded to 16 digits) | Required |
| `salesOrder` | No | Sales order number (auto-padded to 12 digits) | Current date YYYYMMDD |
| `date` | No | Transaction date (MM/DD/YYYY) | Current date |
| `time` | No | Transaction time (HH:MM:SS AM/PM) | Current time |
| `cashier` / `assistant` | No | Cashier/Assistant name | "admin-1" |
| `items` | Yes | Array of items purchased | Required |
| `subtotal` | Yes | Subtotal before VAT | Required |
| `grandTotal` | Yes | Final total amount | Required |
| `vatableSale` | No | VATable sale amount | 0.00 |
| `vatExemptSale` | No | VAT exempt sale amount | subtotal |
| `vatZeroRated` | No | VAT zero-rated amount | 0.00 |
| `vat12` | No | VAT 12% amount | 0.00 |
| `paymentMethod` | Yes | Payment method: "cash" or "gcash" | "cash" |
| `amountPaid` | Yes | Amount paid by customer | Required |
| `change` | Yes | Change returned | Required |
| `gcashRef` | No | GCash reference number (for GCash only) | - |

## Item Object Structure

```javascript
{
  name: "Product Name",      // Required: Product/item name
  quantity: 1,              // Required: Quantity purchased
  unit: "PC",               // Optional: Unit (PC, BTL, BOX, etc.) - defaults to "PC"
  price: 10.00,             // Required: Selling price per unit
  srp: 10.00                // Optional: Suggested Retail Price - defaults to price
}
```

## Notes

1. **Transaction ID Formatting**: The `transactionId` will be automatically padded to 16 digits with leading zeros (e.g., "130076" becomes "0000000000130076")

2. **Sales Order Formatting**: The `salesOrder` will be automatically padded to 12 digits. If not provided, it defaults to current date in YYYYMMDD format.

3. **Date/Time Format**: 
   - Date format: `MM/DD/YYYY` (e.g., "05/02/2025")
   - Time format: `HH:MM:SS AM/PM` (e.g., "11:32:20 AM")

4. **VAT Exempt Sale**: If `vatExemptSale` is not provided, it automatically defaults to the `subtotal` value.

5. **Price Alignment**: All prices (UPRICE and TOTAL columns) are right-aligned in 13-character columns.

6. **Item Display**: Each item displays:
   - Line 1: Quantity and unit (e.g., "1 PC")
   - Line 2: Item name
   - Line 3: Unit price (UPRICE) and total (TOTAL), both right-aligned

