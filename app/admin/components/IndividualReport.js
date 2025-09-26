"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from './ThemeContext';

// Determine the correct API URL based on the current environment
const getAPIBaseURL = () => {
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;
    
    // If running on Next.js dev server (usually port 3000), use the proxy
    if (currentPort === '3000') {
      return '/api/proxy';
    }
    
    // If running on localhost without port (Apache), use direct PHP
    if (currentHost === 'localhost' && !currentPort) {
      return 'http://localhost/Enguio_Project/Api/backend.php';
    }
    
    // Otherwise use the same host/port
    return `${window.location.protocol}//${currentHost}${currentPort ? ':' + currentPort : ''}/Enguio_Project/Api/backend.php`;
  }
  
  // Fallback for server-side rendering
  return '/api/proxy';
};

const API_BASE_URL = getAPIBaseURL();

function IndividualReport({ reportType, reportName, reportIcon }) {
  const { theme } = useTheme();
  const [reportData, setReportData] = useState([]);
  const [reportDataLoading, setReportDataLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [cashierDetails, setCashierDetails] = useState(null);
  const [cashierDetailsLoading, setCashierDetailsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [newDataAvailable, setNewDataAvailable] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastDataCount, setLastDataCount] = useState(0);

  const fetchReportData = async (retryCount = 0, isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) {
        setReportDataLoading(true);
      }
      setReportError(null);
      
      const requestData = { 
        action: 'get_report_data',
        report_type: reportType,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        check_for_updates: isAutoRefresh // Flag to check if there are new updates
      };
      
      let res;
      
      // Try axios first
      try {
        res = await axios.post(API_BASE_URL, requestData, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } catch (axiosError) {
        console.warn('Axios failed, trying fetch:', axiosError.message);
        
        // Fallback to fetch
        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        res = { data };
      }
      
      if (res.data?.success) {
        const newData = res.data.data || [];
        
        // Debug logging
        if (debugMode) {
          console.log(`🔍 [DEBUG] ${reportType} report data:`, {
            dataCount: newData.length,
            hasNewData: res.data.has_new_data,
            isAutoRefresh,
            dateRange: `${dateRange.startDate} to ${dateRange.endDate}`,
            sampleData: newData[0] || 'No data'
          });
        }
        
        // Check if there's new data available (for auto-refresh)
        if (isAutoRefresh && res.data.has_new_data) {
          setNewDataAvailable(true);
          setNotificationCount(prev => prev + 1);
          
          // Show notification for new data
          if (reportType === 'sales') {
            console.log('🔄 New sales data available!');
            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
              new Notification('New Sales Transaction', {
                body: 'A new POS transaction has been recorded',
                icon: '/enguio_logo.ico'
              });
            }
          } else if (reportType === 'cashier_performance') {
            console.log('👤 New cashier performance data available!');
            if (Notification.permission === 'granted') {
              new Notification('Cashier Activity Update', {
                body: 'New cashier performance data is available',
                icon: '/enguio_logo.ico'
              });
            }
          }
        }
        
        // Track data count changes for better detection
        const currentDataCount = newData.length;
        if (isAutoRefresh && currentDataCount > lastDataCount) {
          setLastDataCount(currentDataCount);
          setNewDataAvailable(true);
          setNotificationCount(prev => prev + 1);
        }
        
        setReportData(newData);
        setReportError(null);
        setLastRefresh(new Date());
      } else {
        setReportData([]);
        setReportError(res.data?.message || 'Failed to fetch report data');
        console.warn('Report data fetch failed:', res.data?.message);
        
        if (debugMode) {
          console.log(`🔍 [DEBUG] API Error:`, res.data);
        }
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData([]);
      
      // Retry logic for network errors
      if (retryCount < 2 && (error.message === 'Network Error' || error.message.includes('fetch'))) {
        console.log(`Retrying... attempt ${retryCount + 1}`);
        setTimeout(() => {
          fetchReportData(retryCount + 1);
        }, 2000);
        return;
      }
      
      // Set user-friendly error message
      if (error.message === 'Network Error' || error.message.includes('fetch')) {
        setReportError('Network Error: Please check if XAMPP services (Apache & MySQL) are running');
      } else if (error.message.includes('timeout')) {
        setReportError('Request timeout: Server may be slow, please try again');
      } else {
        setReportError(`Failed to load report data: ${error.message}`);
      }
    } finally {
      setReportDataLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setReportDataLoading(true);
      const res = await axios.post(API_BASE_URL, {
        action: 'generate_report',
        report_type: reportType,
        generated_by: 'Admin',
        parameters: {
          start_date: dateRange.startDate,
          end_date: dateRange.endDate
        }
      });
      
      if (res.data?.success) {
        fetchReportData();
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setReportDataLoading(false);
    }
  };

  const fetchCashierDetails = async (cashierId) => {
    try {
      setCashierDetailsLoading(true);
      const res = await axios.post(API_BASE_URL, {
        action: 'get_cashier_details',
        cashier_id: cashierId,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      });
      
      if (res.data?.success) {
        setCashierDetails(res.data);
        setSelectedCashier(cashierId);
      } else {
        console.error('Failed to fetch cashier details:', res.data?.message);
      }
    } catch (error) {
      console.error('Error fetching cashier details:', error);
    } finally {
      setCashierDetailsLoading(false);
    }
  };

  const closeCashierDetails = () => {
    setSelectedCashier(null);
    setCashierDetails(null);
  };

  useEffect(() => {
    fetchReportData();
    
    // Request notification permission for real-time updates
    if (reportType === 'sales' || reportType === 'cashier_performance') {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [dateRange]);

  // Auto-refresh effect for real-time updates
  useEffect(() => {
    if (!autoRefresh || (reportType !== 'sales' && reportType !== 'cashier_performance')) {
      return;
    }

    const interval = setInterval(() => {
      fetchReportData(0, true); // Auto-refresh with isAutoRefresh = true
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, reportType, dateRange]);

  // Handle new data notification
  const handleRefreshData = () => {
    setNewDataAvailable(false);
    setNotificationCount(0);
    setLastDataCount(reportData.length);
    fetchReportData();
  };

  const getReportColumns = () => {
    switch (reportType) {
      case 'stock_in':
        return ['Date', 'Time', 'Product Name', 'Barcode', 'Quantity', 'Unit Price', 'Total Value', 'Supplier', 'Reference No', 'Received By'];
      case 'stock_out':
        return ['Date', 'Time', 'Product Name', 'Barcode', 'Quantity', 'Unit Price', 'Total Value', 'Cashier', 'Customer Info', 'Reference No'];
      case 'sales':
        return ['Date', 'Time', 'Transaction ID', 'Reference No', 'Total Amount', 'Items Sold', 'Products', 'Payment Type', 'Cashier', 'Terminal'];
      case 'inventory_balance':
        return ['Product Name', 'Barcode', 'Category', 'Current Stock', 'Unit Price', 'Total Value', 'Location', 'Supplier', 'Brand', 'Expiration', 'Status'];
      case 'stock_adjustment':
        return ['Date', 'Time', 'Product Name', 'Barcode', 'Quantity', 'Movement Type', 'Reason', 'Adjusted By', 'Reference No'];
      case 'supplier':
        return ['Supplier Name', 'Contact', 'Email', 'Products Supplied', 'Total Stock', 'Total Value', 'Deliveries Count'];
      case 'cashier_performance':
        return ['Cashier Name', 'Transactions Count', 'Total Sales', 'Average Transaction', 'Unique Products Sold', 'First Sale', 'Last Sale'];
      case 'login_logs':
        return ['Date', 'Time', 'Username', 'Role', 'Action', 'Description'];
      default:
        return [];
    }
  };

  const formatReportCell = (row, column) => {
    const columnKey = column.toLowerCase().replace(/\s+/g, '_');
    
    switch (columnKey) {
      case 'total_value':
      case 'total_amount':
      case 'unit_price':
        return `₱${parseFloat(row[columnKey] || 0).toFixed(2)}`;
      case 'date':
        return row[columnKey] ? new Date(row[columnKey]).toLocaleDateString('en-PH') : 'N/A';
      case 'time':
        return row[columnKey] ? new Date(`2000-01-01T${row[columnKey]}`).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      case 'payment_method':
      case 'payment_type':
        const paymentType = row[columnKey];
        if (paymentType === 'cash') return '💵 Cash';
        if (paymentType === 'card') return '💳 Card';
        if (paymentType === 'Gcash') return '📱 GCash';
        return paymentType || 'N/A';
      case 'cashier':
      case 'cashier_name':
        if (reportType === 'cashier_performance' && row['emp_id']) {
          return (
            <button
              onClick={() => fetchCashierDetails(row['emp_id'])}
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer font-medium"
              style={{ color: theme.colors.accent }}
            >
              {row[columnKey] || row['cashier_username'] || row['cashier_name'] || 'N/A'}
            </button>
          );
        }
        return row[columnKey] || row['cashier_username'] || row['cashier_name'] || 'N/A';
      case 'reference_no':
        return row[columnKey] || 'N/A';
      case 'quantity':
        if (reportType === 'stock_in') {
          return (
            <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.successBg, color: theme.colors.success }}>
              +{row[columnKey] || '0'}
            </span>
          );
        }
        return row[columnKey] || '0';
      case 'current_stock':
      case 'items_sold':
      case 'transactions_count':
      case 'unique_products_sold':
      case 'products_supplied':
      case 'total_stock':
      case 'deliveries_count':
        return row[columnKey] || '0';
      case 'average_transaction':
        return `₱${parseFloat(row[columnKey] || 0).toFixed(2)}`;
      case 'status':
        const status = row[columnKey];
        if (status === 'Low Stock') return '⚠️ Low Stock';
        if (status === 'Out of Stock') return '❌ Out of Stock';
        if (status === 'In Stock') return '✅ In Stock';
        return status || 'N/A';
      case 'location':
        return row[columnKey] || 'N/A';
      case 'supplier':
        return row[columnKey] || 'N/A';
      default:
        return row[columnKey] || 'N/A';
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-6" style={{ backgroundColor: theme.colors.accent }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-6 mb-4">
              <span className="text-4xl">{reportIcon}</span>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: theme.text.primary }}>{reportName}</h1>
                <p className="text-lg" style={{ color: theme.text.secondary }}>Detailed Report Analysis</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="p-6">
        {/* Date Range Selection */}
        <div className="mb-6">
          <div
            className="rounded-lg shadow-md p-4"
            style={{
              backgroundColor: theme.bg.card,
              boxShadow: `0 10px 25px ${theme.shadow}`
            }}
          >
            <h3 className="text-lg font-semibold mb-3" style={{ color: theme.text.primary }}>Date Range</h3>
            <div className="flex gap-4 items-center">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text.secondary }}>Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border rounded-md"
                  style={{
                    backgroundColor: theme.bg.input,
                    borderColor: theme.border.default,
                    color: theme.text.primary
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text.secondary }}>End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border rounded-md"
                  style={{
                    backgroundColor: theme.bg.input,
                    borderColor: theme.border.default,
                    color: theme.text.primary
                  }}
                />
              </div>
              <button
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setDateRange({
                    startDate: yesterday.toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0]
                  });
                }}
                disabled={reportDataLoading}
                className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                style={{
                  backgroundColor: theme.colors.success,
                  color: 'white'
                }}
              >
                Last 24 Hours
              </button>
              <button
                onClick={() => {
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  setDateRange({
                    startDate: sevenDaysAgo.toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0]
                  });
                }}
                disabled={reportDataLoading}
                className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                style={{
                  backgroundColor: theme.colors.accent,
                  color: theme.text.primary
                }}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => {
                  setDateRange({
                    startDate: '2024-01-01',
                    endDate: '2025-12-31'
                  });
                }}
                disabled={reportDataLoading}
                className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                style={{
                  backgroundColor: theme.colors.warning || '#f59e0b',
                  color: 'white'
                }}
              >
                All Time
              </button>
              <button
                onClick={() => generateReport()}
                disabled={reportDataLoading}
                className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                style={{
                  backgroundColor: theme.colors.accent,
                  color: theme.text.primary
                }}
              >
                {reportDataLoading ? 'Generating...' : 'Generate Report'}
              </button>
              
              {/* Auto-refresh controls for sales and cashier performance reports */}
              {(reportType === 'sales' || reportType === 'cashier_performance') && (
                <>
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm font-medium" style={{ color: theme.text.secondary }}>
                        Auto-refresh
                      </span>
                    </label>
                    <select
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                      className="px-2 py-1 border rounded text-sm"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.default,
                        color: theme.text.primary
                      }}
                    >
                      <option value={10000}>10 seconds</option>
                      <option value={30000}>30 seconds</option>
                      <option value={60000}>1 minute</option>
                      <option value={300000}>5 minutes</option>
                    </select>
                  </div>
                  
                  <div className="text-xs" style={{ color: theme.text.secondary }}>
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </div>
                  
                  {/* Debug Mode Toggle */}
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        checked={debugMode}
                        onChange={(e) => setDebugMode(e.target.checked)}
                        className="rounded text-xs"
                      />
                      <span className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                        Debug Mode
                      </span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* New Data Available Notification */}
        {newDataAvailable && (reportType === 'sales' || reportType === 'cashier_performance') && (
          <div className="mb-6">
            <div
              className="rounded-lg shadow-md p-4 border-l-4 animate-pulse"
              style={{
                backgroundColor: theme.bg.card,
                boxShadow: `0 10px 25px ${theme.shadow}`,
                borderLeftColor: theme.colors.success
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🔄</div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                      New Data Available!
                      {notificationCount > 1 && (
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-bold" 
                              style={{ backgroundColor: theme.colors.danger, color: 'white' }}>
                          {notificationCount}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm" style={{ color: theme.text.secondary }}>
                      {reportType === 'sales' 
                        ? 'New sales transactions have been recorded in the POS system.'
                        : 'New cashier performance data is available.'
                      }
                    </p>
                    <p className="text-xs mt-1" style={{ color: theme.text.secondary }}>
                      Last updated: {lastRefresh.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setNewDataAvailable(false);
                      setNotificationCount(0);
                    }}
                    className="px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105"
                    style={{
                      backgroundColor: theme.bg.input,
                      color: theme.text.secondary
                    }}
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleRefreshData}
                    className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105"
                    style={{
                      backgroundColor: theme.colors.success,
                      color: 'white'
                    }}
                  >
                    Refresh Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards for Sales Report */}
        {reportType === 'sales' && reportData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">🛒</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Transactions</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{reportData.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">💰</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Sales</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    ₱{reportData.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">📦</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Items Sold</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {reportData.reduce((sum, item) => sum + (parseInt(item.items_sold) || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">📊</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Average Sale</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    ₱{reportData.length > 0 ? (reportData.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0) / reportData.length).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">💳</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Payment Methods</p>
                  <p className="text-sm font-bold" style={{ color: theme.text.primary }}>
                    Cash: {reportData.filter(item => item.payment_type === 'cash').length}<br/>
                    Card: {reportData.filter(item => item.payment_type === 'card').length}<br/>
                    GCash: {reportData.filter(item => item.payment_type === 'Gcash').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards for Stock In Report */}
        {reportType === 'stock_in' && reportData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">📦</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Items</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{reportData.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">📊</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Quantity</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {reportData.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">💰</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Value</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    ₱{reportData.reduce((sum, item) => sum + (parseFloat(item.total_value) || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">🏢</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Suppliers</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {new Set(reportData.map(item => item.supplier_name).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Data Display */}
        <div
          className="rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          style={{
            backgroundColor: theme.bg.card,
            boxShadow: `0 10px 25px ${theme.shadow}`
          }}
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
              {reportName} - {dateRange.startDate} to {dateRange.endDate}
            </h3>

            {reportDataLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.accent }}></div>
                <span className="ml-2" style={{ color: theme.text.secondary }}>Loading report data...</span>
              </div>
            ) : reportError ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-lg font-medium mb-2" style={{ color: theme.colors.danger }}>Error Loading Report</p>
                <p className="mb-4" style={{ color: theme.text.secondary }}>{reportError}</p>
                <button
                  onClick={() => fetchReportData()}
                  className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: theme.colors.accent,
                    color: theme.text.primary
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : reportData.length > 0 ? (
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b sticky top-0" style={{ backgroundColor: theme.bg.card }}>
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      {getReportColumns().map((column, index) => (
                        <th key={index} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {reportData.map((row, index) => (
                      <tr key={index} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        {getReportColumns().map((column, colIndex) => (
                          <td key={colIndex} className="p-4 align-middle" style={{ color: theme.text.secondary }}>
                            {formatReportCell(row, column)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: theme.text.secondary }}>
                <div className="text-4xl mb-4">{reportIcon}</div>
                <p className="text-lg font-medium mb-2">No data available</p>
                <p className="mb-4">
                  {reportType === 'sales' 
                    ? 'No sales transactions found for the selected date range. Make sure there are POS transactions in the system.'
                    : reportType === 'cashier_performance'
                    ? 'No cashier performance data found. Make sure cashiers have made sales in the POS system.'
                    : `No ${reportName.toLowerCase()} data found for the selected date range.`
                  }
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => fetchReportData()}
                    className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105"
                    style={{
                      backgroundColor: theme.colors.accent,
                      color: theme.text.primary
                    }}
                  >
                    🔄 Refresh Data
                  </button>
                  <div className="text-sm">
                    {reportType === 'sales' || reportType === 'cashier_performance' ? (
                      <p>💡 <strong>Tip:</strong> Make a test sale in the POS system to see real-time updates here!</p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cashier Details Modal */}
      {selectedCashier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
            style={{ backgroundColor: theme.bg.card }}
          >
            <div className="p-6 border-b" style={{ borderColor: theme.border.default }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {cashierDetails?.cashier_info?.cashier_name} - Sales Details
                  </h2>
                  <p className="text-sm" style={{ color: theme.text.secondary }}>
                    {cashierDetails?.cashier_info?.cashier_username} • {cashierDetails?.cashier_info?.email}
                  </p>
                </div>
                <button
                  onClick={closeCashierDetails}
                  className="text-2xl font-bold hover:opacity-70"
                  style={{ color: theme.text.secondary }}
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {cashierDetailsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.accent }}></div>
                  <span className="ml-2" style={{ color: theme.text.secondary }}>Loading cashier details...</span>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
                      <div className="flex items-center">
                        <div className="text-3xl mr-3">🛒</div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Transactions</p>
                          <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{cashierDetails?.summary?.total_transactions || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
                      <div className="flex items-center">
                        <div className="text-3xl mr-3">💰</div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Sales</p>
                          <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                            ₱{(cashierDetails?.summary?.total_sales || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
                      <div className="flex items-center">
                        <div className="text-3xl mr-3">📦</div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Items</p>
                          <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{cashierDetails?.summary?.total_items || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sales Details Table */}
                  <div className="rounded-lg shadow-md" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
                    <div className="p-6">
                      <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
                        Sales Transactions - {dateRange.startDate} to {dateRange.endDate}
                      </h3>
                      
                      {cashierDetails?.sales_data?.length > 0 ? (
                        <div className="max-h-[400px] overflow-y-auto">
                          <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b sticky top-0" style={{ backgroundColor: theme.bg.card }}>
                              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>Time</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>Reference No</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>Total Amount</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>Items Sold</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>Payment Type</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>Products</th>
                              </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                              {cashierDetails.sales_data.map((row, index) => (
                                <tr key={index} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                  <td className="p-4 align-middle" style={{ color: theme.text.secondary }}>
                                    {row.date ? new Date(row.date).toLocaleDateString('en-PH') : 'N/A'}
                                  </td>
                                  <td className="p-4 align-middle" style={{ color: theme.text.secondary }}>
                                    {row.time ? new Date(`2000-01-01T${row.time}`).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                  </td>
                                  <td className="p-4 align-middle" style={{ color: theme.text.secondary }}>{row.reference_no || 'N/A'}</td>
                                  <td className="p-4 align-middle" style={{ color: theme.text.secondary }}>
                                    ₱{parseFloat(row.total_amount || 0).toFixed(2)}
                                  </td>
                                  <td className="p-4 align-middle" style={{ color: theme.text.secondary }}>{row.items_sold || '0'}</td>
                                  <td className="p-4 align-middle" style={{ color: theme.text.secondary }}>
                                    {row.payment_type === 'cash' ? '💵 Cash' : 
                                     row.payment_type === 'card' ? '💳 Card' : 
                                     row.payment_type === 'Gcash' ? '📱 GCash' : row.payment_type || 'N/A'}
                                  </td>
                                  <td className="p-4 align-middle" style={{ color: theme.text.secondary }}>
                                    <div className="max-w-xs truncate" title={row.products}>
                                      {row.products || 'N/A'}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8" style={{ color: theme.text.secondary }}>
                          <div className="text-4xl mb-4">📊</div>
                          <p>No sales transactions found for this cashier in the selected date range.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IndividualReport;
