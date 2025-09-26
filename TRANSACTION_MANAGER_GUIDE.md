# 📊 Transaction Manager System Guide

## Overview
The Transaction Manager is a comprehensive system for viewing and analyzing POS transactions from the `tbl_pos_transaction` database and related tables. It provides real-time access to transaction data with detailed analytics and reporting capabilities.

## 🗄️ Database Tables Accessed

### Primary Tables
- **`tbl_pos_transaction`** - Main transaction records
  - `transaction_id` (Primary Key)
  - `date` - Transaction date
  - `time` - Transaction time
  - `emp_id` - Employee/Cashier ID
  - `payment_type` - Payment method (cash, card, Gcash)

- **`tbl_pos_sales_header`** - Sales transaction headers
  - `transaction_id` - Links to main transaction
  - `total_amount` - Total sale amount
  - `reference_number` - Transaction reference
  - `terminal_id` - Terminal used

- **`tbl_pos_sales_details`** - Individual product sales
  - `sales_header_id` - Links to sales header
  - `product_id` - Product sold
  - `quantity` - Quantity sold
  - `price` - Unit price

### Supporting Tables
- **`tbl_employee`** - Cashier information
- **`tbl_pos_terminal`** - Terminal information  
- **`tbl_product`** - Product details

## 🚀 Getting Started

### 1. Access Transaction Manager
- Navigate to **Admin Panel** → **Transaction Manager**
- Or click the receipt icon (🧾) in the sidebar

### 2. Test the System
- Open `test_transaction_manager.html` in your browser
- Run the API tests to verify connectivity
- Ensure XAMPP (Apache & MySQL) is running

## 📋 Features

### 📊 Summary Dashboard
- **Total Transactions** - Count of all transactions
- **Total Sales** - Sum of all transaction amounts
- **Average Sale** - Average transaction value
- **Active Cashiers** - Number of unique cashiers
- **Active Terminals** - Number of terminals used

### 💳 Payment Method Breakdown
- Visual breakdown by payment type:
  - 💵 **Cash** transactions
  - 💳 **Card** transactions  
  - 📱 **GCash** transactions
- Shows count and total amount for each method

### 📅 Date Range Filtering
- **Custom Date Range** - Select start and end dates
- **Last 24 Hours** - Quick button for recent transactions
- **Real-time Updates** - Data refreshes when dates change

### 📋 Transaction List
- **Comprehensive Table** showing:
  - Transaction ID
  - Date & Time
  - Cashier Name & Position
  - Payment Method (with icons)
  - Total Amount
  - Items Count
  - Terminal Used
- **Pagination** - Load more transactions as needed
- **Sorting** - Newest transactions first

### 🔍 Transaction Details
- **Modal Popup** with complete transaction breakdown
- **Header Information**:
  - Transaction ID, Date, Time
  - Cashier details
  - Payment method
  - Total amount
- **Product Details**:
  - Product name, barcode, category
  - Quantity sold, unit price, total price

## 🔧 API Endpoints

### 1. `get_transactions`
**Purpose**: Fetch transaction list with pagination
```javascript
{
  action: 'get_transactions',
  start_date: '2025-01-15',
  end_date: '2025-01-15',
  limit: 50,
  offset: 0
}
```

**Response**:
```javascript
{
  success: true,
  data: [
    {
      transaction_id: 1,
      date: '2025-01-15',
      time: '14:30:00',
      payment_type: 'cash',
      emp_name: 'John Doe',
      position: 'Cashier',
      terminal_name: 'Terminal 1',
      total_amount: 150.00,
      items_count: 3
    }
  ],
  pagination: {
    total: 100,
    limit: 50,
    offset: 0,
    has_more: true
  }
}
```

### 2. `get_transaction_details`
**Purpose**: Get detailed transaction information
```javascript
{
  action: 'get_transaction_details',
  transaction_id: 1
}
```

**Response**:
```javascript
{
  success: true,
  data: {
    header: {
      transaction_id: 1,
      date: '2025-01-15',
      time: '14:30:00',
      payment_type: 'cash',
      emp_name: 'John Doe',
      terminal_name: 'Terminal 1',
      total_amount: 150.00
    },
    details: [
      {
        product_name: 'Coca Cola',
        barcode: '123456789',
        category: 'Beverages',
        quantity: 2,
        price: 25.00,
        total_price: 50.00
      }
    ]
  }
}
```

### 3. `get_transaction_summary`
**Purpose**: Get summary statistics and analytics
```javascript
{
  action: 'get_transaction_summary',
  start_date: '2025-01-15',
  end_date: '2025-01-15'
}
```

**Response**:
```javascript
{
  success: true,
  data: {
    summary: {
      total_transactions: 50,
      total_sales: 7500.00,
      average_transaction: 150.00,
      active_cashiers: 5,
      active_terminals: 2
    },
    payment_breakdown: [
      {
        payment_type: 'cash',
        transaction_count: 30,
        total_amount: 4500.00
      }
    ],
    top_cashiers: [
      {
        emp_name: 'John Doe',
        position: 'Cashier',
        transaction_count: 25,
        total_sales: 3750.00
      }
    ]
  }
}
```

## 🎨 UI Components

### Theme Support
- **Dark/Light Mode** - Automatic theme switching
- **Responsive Design** - Works on all screen sizes
- **Modern Interface** - Clean, professional appearance

### Interactive Elements
- **Date Pickers** - Easy date selection
- **Action Buttons** - View details, refresh data
- **Loading States** - Visual feedback during API calls
- **Error Handling** - User-friendly error messages

## 🔍 Troubleshooting

### Common Issues

#### 1. "Network Error" or "Failed to load transactions"
**Solution**: 
- Check if XAMPP services are running (Apache & MySQL)
- Verify database connection in `Api/conn.php`
- Test API endpoint: `http://localhost/Enguio_Project/Api/backend.php`

#### 2. "No transactions found"
**Possible Causes**:
- No transactions exist for selected date range
- Database tables are empty
- Date range is too narrow

**Solution**:
- Try expanding date range
- Check if POS system is recording transactions
- Verify data exists in `tbl_pos_transaction`

#### 3. "Transaction not found" when viewing details
**Solution**:
- Verify transaction ID exists
- Check if transaction has associated sales data
- Ensure proper foreign key relationships

### Testing Connectivity
1. Open `test_transaction_manager.html`
2. Click "Test Connection"
3. Run individual API tests
4. Check browser console for errors

## 📈 Use Cases

### Daily Operations
- **Monitor Sales Performance** - Track daily transaction volumes
- **Cashier Performance** - Identify top-performing staff
- **Payment Method Analysis** - Understand customer preferences
- **Terminal Usage** - Monitor system utilization

### Business Analytics
- **Revenue Tracking** - Monitor total sales and trends
- **Customer Behavior** - Analyze transaction patterns
- **Inventory Insights** - Track product sales performance
- **Operational Efficiency** - Identify bottlenecks

### Reporting
- **Daily Reports** - Generate transaction summaries
- **Period Comparisons** - Compare different time periods
- **Performance Metrics** - Track key business indicators
- **Audit Trail** - Complete transaction history

## 🔐 Security Considerations

- **Access Control** - Admin-only access to transaction data
- **Data Privacy** - Sensitive financial information protection
- **Audit Logging** - Track who accessed what data
- **Input Validation** - Prevent SQL injection attacks

## 🚀 Future Enhancements

### Planned Features
- **Export Functionality** - Export data to Excel/CSV
- **Advanced Filtering** - Filter by cashier, terminal, payment method
- **Real-time Updates** - WebSocket integration for live data
- **Print Receipts** - Reprint transaction receipts
- **Refund Processing** - Handle transaction refunds
- **Analytics Dashboard** - Advanced charts and graphs

### Integration Opportunities
- **Inventory System** - Link with stock management
- **Customer Management** - Track customer transactions
- **Loyalty Programs** - Integration with rewards system
- **Accounting Software** - Export to accounting systems

## 📞 Support

For technical support or feature requests:
1. Check this documentation first
2. Test with `test_transaction_manager.html`
3. Verify XAMPP services are running
4. Check browser console for errors
5. Contact system administrator

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Compatibility**: PHP 8.x, MySQL 5.7+, Modern Browsers
