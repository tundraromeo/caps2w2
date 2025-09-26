# POS to Admin Reports Auto-Reflect System

## Overview
The auto-reflect system automatically updates admin reports when new POS transactions occur, providing real-time visibility into sales and cashier performance data.

## System Components

### 1. Database Tables
- `tbl_pos_transaction` - Stores transaction header information
- `tbl_pos_sales_header` - Stores sales summary data
- `tbl_pos_sales_details` - Stores individual product sales
- `tbl_pos_terminal` - Terminal information
- `tbl_employee` - Cashier/employee data

### 2. Backend API (`Api/backend.php`)
- Handles report data requests
- Manages real-time data detection
- Provides new sales activity endpoints

### 3. Reports Module (`Api/modules/reports.php`)
- Enhanced with better new data detection
- Improved timestamp-based checking
- Real-time activity monitoring

### 4. Frontend Components
- `IndividualReport.js` - Main report component with auto-refresh
- `SalesReport.js` - Sales-specific report wrapper
- `CashierPerformanceReport.js` - Cashier performance wrapper

## Auto-Reflect Features

### Real-Time Detection
- **Sales Reports**: Automatically detects new POS transactions
- **Cashier Performance**: Updates when cashiers make new sales
- **Notification System**: Browser notifications for new data
- **Visual Indicators**: Animated notifications with count badges

### Auto-Refresh Mechanism
- **Configurable Intervals**: 10 seconds to 5 minutes
- **Smart Detection**: Checks for new data without full refresh
- **Performance Optimized**: Minimal database queries
- **User Control**: Can be enabled/disabled by user

### Notification System
- **Browser Notifications**: Desktop notifications for new data
- **Visual Alerts**: In-page notifications with animations
- **Count Tracking**: Shows number of pending updates
- **Dismissible**: Users can dismiss or refresh data

## Configuration

### Auto-Refresh Settings
```javascript
// Default settings in IndividualReport.js
const [autoRefresh, setAutoRefresh] = useState(true);
const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
```

### Available Refresh Intervals
- 10 seconds (for testing)
- 30 seconds (default)
- 1 minute
- 5 minutes

### Notification Permissions
The system automatically requests browser notification permissions for:
- Sales reports
- Cashier performance reports

## API Endpoints

### Get Report Data
```javascript
POST /Api/backend.php
{
  "action": "get_report_data",
  "report_type": "sales|cashier_performance",
  "start_date": "2025-01-01",
  "end_date": "2025-01-01",
  "check_for_updates": true
}
```

### Check New Sales Activity
```javascript
POST /Api/backend.php
{
  "action": "get_latest_sales_activity",
  "minutes": 5
}
```

### Check New Sales (Legacy)
```javascript
POST /Api/backend.php
{
  "action": "check_new_sales",
  "since": "2025-01-01 10:00:00"
}
```

## Troubleshooting

### Common Issues

#### 1. Auto-Refresh Not Working
**Symptoms**: Reports don't update automatically
**Solutions**:
- Check if auto-refresh is enabled in the UI
- Verify API connection is working
- Check browser console for errors
- Ensure XAMPP services are running

#### 2. No New Data Detection
**Symptoms**: System doesn't detect new POS transactions
**Solutions**:
- Verify POS transactions are being saved to database
- Check `tbl_pos_sales_header` table for new records
- Test with the provided test page
- Check database connection

#### 3. Notifications Not Showing
**Symptoms**: No browser notifications appear
**Solutions**:
- Check browser notification permissions
- Verify notification API is supported
- Test with different browsers
- Check browser console for errors

#### 4. Performance Issues
**Symptoms**: Slow loading or high CPU usage
**Solutions**:
- Increase refresh interval (use 1-5 minutes)
- Disable auto-refresh if not needed
- Check database query performance
- Monitor network requests

### Debug Mode

Enable debug mode in the report interface to see:
- Detailed API request/response logs
- Data count changes
- Auto-refresh timing
- Error messages

### Testing

Use the provided test page (`test_auto_reflect_system.html`):
1. Open in browser
2. Run API connection test
3. Test reports module
4. Start real-time monitoring
5. Make test POS transactions
6. Verify auto-reflect works

## Database Queries

### New Data Detection Query
```sql
SELECT COUNT(*) as new_count 
FROM tbl_pos_sales_header psh
LEFT JOIN tbl_pos_transaction pt ON psh.transaction_id = pt.transaction_id
WHERE pt.date BETWEEN ? AND ?
AND (
    pt.date >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    OR psh.sales_header_id >= (
        SELECT COALESCE(MAX(sales_header_id), 0) - 10 
        FROM tbl_pos_sales_header
    )
)
```

### Sales Report Query
```sql
SELECT 
    pt.date,
    pt.time,
    psh.transaction_id,
    psh.total_amount,
    psh.reference_number as reference_no,
    COUNT(psd.product_id) as items_sold,
    GROUP_CONCAT(CONCAT(COALESCE(p.product_name, CONCAT('Product ID: ', psd.product_id)), ' (', psd.quantity, 'x ₱', psd.price, ')') SEPARATOR ', ') as products,
    COALESCE(t.terminal_name, CONCAT('Terminal ', psh.terminal_id)) as terminal,
    pt.payment_type,
    CONCAT(COALESCE(e.Fname, ''), ' ', COALESCE(e.Lname, '')) as cashier_name,
    COALESCE(e.username, 'System') as cashier_username,
    e.emp_id,
    psh.sales_header_id
FROM tbl_pos_sales_header psh
LEFT JOIN tbl_pos_transaction pt ON psh.transaction_id = pt.transaction_id
LEFT JOIN tbl_pos_sales_details psd ON psh.sales_header_id = psd.sales_header_id
LEFT JOIN tbl_product p ON psd.product_id = p.product_id
LEFT JOIN tbl_employee e ON pt.emp_id = e.emp_id
LEFT JOIN tbl_pos_terminal t ON psh.terminal_id = t.terminal_id
WHERE pt.date BETWEEN ? AND ?
GROUP BY psh.sales_header_id, pt.date, pt.time, psh.transaction_id, psh.total_amount, psh.reference_number, psh.terminal_id, pt.payment_type, e.emp_id, t.terminal_name
ORDER BY pt.date DESC, pt.time DESC
```

## Performance Considerations

### Optimization Tips
1. **Index Database Tables**: Ensure proper indexes on date columns
2. **Limit Data Range**: Use appropriate date ranges for reports
3. **Cache Results**: Consider caching for frequently accessed data
4. **Batch Updates**: Group multiple updates together
5. **Monitor Queries**: Use database query monitoring tools

### Resource Usage
- **Memory**: Minimal impact with proper cleanup
- **CPU**: Low impact with optimized intervals
- **Network**: Minimal with smart detection
- **Database**: Optimized queries with proper indexing

## Security Considerations

### Data Protection
- All API requests use POST method
- Input validation on all parameters
- SQL injection protection with prepared statements
- CORS headers properly configured

### Access Control
- Session-based authentication
- Role-based permissions
- Secure API endpoints
- Input sanitization

## Future Enhancements

### Planned Features
1. **WebSocket Support**: Real-time bidirectional communication
2. **Push Notifications**: Server-side notification system
3. **Advanced Filtering**: More granular data filtering
4. **Export Functionality**: PDF/Excel export with auto-refresh
5. **Mobile Support**: Responsive design improvements

### Performance Improvements
1. **Database Optimization**: Query optimization and indexing
2. **Caching Layer**: Redis/Memcached integration
3. **CDN Integration**: Static asset optimization
4. **Lazy Loading**: On-demand data loading
5. **Compression**: Response compression

## Support and Maintenance

### Regular Maintenance
- Monitor database performance
- Check error logs regularly
- Update dependencies
- Test auto-refresh functionality
- Verify notification system

### Monitoring
- API response times
- Database query performance
- Error rates
- User engagement metrics
- System resource usage

## Contact Information

For technical support or questions about the auto-reflect system:
- Check the test page for diagnostics
- Review browser console for errors
- Verify database connectivity
- Test API endpoints manually
- Check XAMPP service status

---

*Last Updated: January 2025*
*Version: 1.0*