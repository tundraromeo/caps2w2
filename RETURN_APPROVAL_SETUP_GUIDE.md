# Return Approval Transfer Integration Setup Guide

## Overview
This guide explains how to set up and test the return approval system that automatically adds approved returns to transfer details for proper quantity summation.

## Prerequisites
- MySQL/MariaDB database with existing inventory system
- PHP backend with PDO support
- Admin panel access

## Setup Steps

### 1. Create POS Returns Tables
First, you need to create the POS returns tables if they don't exist:

```sql
-- Run this SQL script
SOURCE create_pos_returns_tables.sql;
```

This will create:
- `tbl_pos_returns` - Main return records
- `tbl_pos_return_items` - Individual items in returns

### 2. Update Database Schema (if needed)
If the tables already exist but need the approval workflow columns:

```sql
-- Run this SQL script
SOURCE update_return_approval_system.sql;
```

### 3. Test Database Structure
Run the test script to verify everything is set up correctly:

```bash
php test_return_approval.php
```

## How It Works

### Return Approval Process
1. **Customer Return**: Customer returns items via POS system
2. **Return Record**: System creates record in `tbl_pos_returns` with status 'pending'
3. **Admin Review**: Admin reviews return in Admin panel → Return Management
4. **Approval**: Admin approves the return
5. **Stock Restoration**: System restores product quantities to inventory
6. **Transfer Integration**: System adds returned quantities to transfer details

### Database Tables Updated
When a return is approved, the following tables are updated:

#### `tbl_transfer_header`
- Creates new transfer header for the return
- Uses transfer_id in range 9000000+ to avoid conflicts

#### `tbl_transfer_dtl`
- Adds transfer detail entry with returned quantities
- Updates existing entries if same product/transfer exists

#### `tbl_transfer_batch_details`
- Creates or updates batch transfer details
- Sums quantities for proper inventory tracking

#### `tbl_transfer_log`
- Logs the return transaction
- Provides audit trail for return activities

## Testing the System

### 1. Create Test Return
Use the POS system to create a customer return:
- Go to POS → Customer Return
- Select items to return
- Submit return request

### 2. Approve Return
1. Go to Admin panel → Return Management
2. Find the pending return
3. Click "View Details"
4. Click "Approve Return"
5. Add approval notes (optional)
6. Confirm approval

### 3. Verify Transfer Integration
After approval, check these tables:
```sql
-- Check transfer header
SELECT * FROM tbl_transfer_header WHERE transfer_header_id >= 9000000;

-- Check transfer details
SELECT * FROM tbl_transfer_dtl WHERE transfer_header_id >= 9000000;

-- Check batch transfer details
SELECT * FROM tbl_transfer_batch_details WHERE transfer_id >= 9000000;

-- Check transfer log
SELECT * FROM tbl_transfer_log WHERE transfer_id >= 9000000;
```

## Expected Behavior

### Before Approval
- Return status: 'pending'
- Product quantities: Reduced (sold)
- Transfer tables: No return-related entries

### After Approval
- Return status: 'approved'
- Product quantities: Restored (returned)
- Transfer tables: New entries with returned quantities
- Inventory components: Refresh notifications sent

## Troubleshooting

### Common Issues

#### 1. "Return not found or already processed"
- Check if return exists in `tbl_pos_returns`
- Verify return status is 'pending'
- Ensure return_id is correct

#### 2. "Original transaction not found"
- Check if `tbl_pos_sales_header` has matching reference_number
- Verify transaction exists and is valid

#### 3. Transfer tables not updated
- Check database permissions
- Verify table structures match expected schema
- Check for foreign key constraints

#### 4. Inventory not refreshing
- Check browser console for JavaScript errors
- Verify inventory refresh event listeners
- Check network connectivity

### Debug Steps
1. Check PHP error logs
2. Verify database connections
3. Test API endpoints directly
4. Check browser developer tools

## API Endpoints

### Approve Return
```
POST /Api/backend.php
Content-Type: application/json

{
    "action": "approve_return",
    "return_id": "RET001",
    "approved_by": 1,
    "approved_by_username": "Admin",
    "notes": "Approval notes"
}
```

### Get Pending Returns
```
POST /Api/backend.php
Content-Type: application/json

{
    "action": "get_pending_returns",
    "limit": 50
}
```

## File Structure
```
├── Api/
│   ├── backend.php (updated with return approval logic)
│   ├── sales_api.php (proxy for return actions)
│   └── conn.php (database connection)
├── app/admin/components/
│   └── ReturnManagement.js (updated with transfer notifications)
├── app/Inventory_Con/
│   ├── ConvenienceStore.js (updated with transfer notifications)
│   └── PharmacyInventory.js (updated with transfer notifications)
├── create_pos_returns_tables.sql (creates return tables)
├── update_return_approval_system.sql (updates existing tables)
├── test_return_approval.php (test script)
└── RETURN_APPROVAL_SETUP_GUIDE.md (this guide)
```

## Success Criteria
✅ Return approval updates transfer details
✅ Quantities are properly summed in batch details
✅ Transfer log entries are created
✅ Inventory components receive refresh notifications
✅ Database maintains referential integrity
✅ All operations are wrapped in transactions

## Support
If you encounter issues:
1. Check this guide first
2. Run the test script
3. Check database logs
4. Verify file permissions
5. Test with sample data
