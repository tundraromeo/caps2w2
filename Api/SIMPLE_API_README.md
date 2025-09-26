# Simple PHP API Structure

This is a clean, easy-to-understand PHP API structure for the Inventory Transfer System.

## File Structure

```
Api/
├── Database.php                    # Simple PDO database connection class
├── ApiHelper.php                   # API response helpers and input validation
├── SimpleBatchService.php          # Batch operations service
├── SimpleInventoryTransferService.php # Inventory transfer operations
├── SimpleAPI.php                   # Main API endpoint
└── README.md                       # This file
```

## Key Features

### 1. **Database.php** - Clean PDO Connection
- Simple database connection class
- Easy-to-use methods: `select()`, `insert()`, `update()`, `delete()`
- Automatic error handling
- Transaction support

**Usage:**
```php
$db = new Database();
$products = $db->select("SELECT * FROM tbl_product WHERE category = ?", ['Electronics']);
$newId = $db->insert("INSERT INTO tbl_product (name, price) VALUES (?, ?)", ['Product Name', 100]);
```

### 2. **ApiHelper.php** - Response Helpers
- Consistent API responses
- Input validation
- Data sanitization

**Usage:**
```php
ApiResponse::success($data, 'Operation successful');
ApiResponse::error('Something went wrong');
ApiResponse::validationError(['field' => 'Field is required']);
```

### 3. **SimpleBatchService.php** - Batch Operations
- Clean batch management functions
- Easy-to-understand methods
- Proper error handling

**Available Methods:**
- `getTransferBatchDetails($transferId)`
- `getBatchDetailsByProductLocation($productId, $locationId)`
- `getProductBatches($productId)`
- `createBatchEntry($data)`
- `consumeBatchStock($batchId, $quantity)`

### 4. **SimpleInventoryTransferService.php** - Transfer Operations
- Complete transfer management
- FIFO batch processing
- Transaction safety

**Available Methods:**
- `createTransfer($data)`
- `executeTransfer($transferId)`
- `getTransferDetails($transferId)`
- `getTransferHistory($limit)`

### 5. **SimpleAPI.php** - Main API Endpoint
- Single entry point for all API calls
- Clean routing system
- Consistent error handling

## API Endpoints

### Batch Operations
- `GET/POST ?action=get_transfer_batch_details&transfer_id=123`
- `GET/POST ?action=get_batch_details_by_product_location&product_id=1&location_id=2`
- `GET/POST ?action=get_product_batches&product_id=1`
- `GET/POST ?action=get_batches_by_location&location_id=1`
- `POST ?action=create_batch_entry` (with JSON data)
- `POST ?action=update_batch_quantity` (with JSON data)
- `POST ?action=consume_batch_stock` (with JSON data)
- `GET/POST ?action=get_batch_summary`

### Transfer Operations
- `POST ?action=create_transfer` (with JSON data)
- `POST ?action=execute_transfer&transfer_id=123`
- `GET/POST ?action=get_transfer_details&transfer_id=123`
- `GET/POST ?action=get_transfer_history`

### Product Operations
- `GET/POST ?action=get_products`
- `GET/POST ?action=get_product_by_id&product_id=1`

### Location Operations
- `GET/POST ?action=get_locations`

## Usage Examples

### 1. Get Batch Details
```javascript
fetch('Api/SimpleAPI.php?action=get_transfer_batch_details&transfer_id=123')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Batches:', data.data);
    } else {
      console.error('Error:', data.message);
    }
  });
```

### 2. Create Transfer
```javascript
const transferData = {
  action: 'create_transfer',
  source_location_id: 1,
  destination_location_id: 2,
  employee_id: 5,
  products: [
    { product_id: 1, quantity: 10 },
    { product_id: 2, quantity: 5 }
  ]
};

fetch('Api/SimpleAPI.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(transferData)
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('Transfer created:', data.data);
  }
});
```

### 3. Consume Batch Stock
```javascript
const consumeData = {
  action: 'consume_batch_stock',
  batch_id: 123,
  quantity: 5
};

fetch('Api/SimpleAPI.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(consumeData)
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('Stock consumed:', data.data);
  }
});
```

## Benefits of This Structure

1. **Easy to Read**: Clean, well-commented code
2. **Easy to Maintain**: Separated concerns, single responsibility
3. **Easy to Debug**: Clear error messages and logging
4. **Easy to Extend**: Add new services without affecting existing code
5. **Consistent**: All responses follow the same format
6. **Safe**: Proper input validation and SQL injection prevention
7. **Reliable**: Transaction support for data integrity

## Migration from Old Structure

To use the new structure:

1. Replace API calls from `backend.php` to `SimpleAPI.php`
2. Update action names to match the new endpoints
3. Update response handling to use the new format
4. Test all functionality to ensure compatibility

## Error Handling

All errors are returned in a consistent format:
```json
{
  "success": false,
  "message": "Error description"
}
```

Validation errors include field-specific details:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Field 'product_id' is required"]
}
```

This structure makes the code much easier to understand, maintain, and extend!
