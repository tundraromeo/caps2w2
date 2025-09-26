"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from './ThemeContext';
import { useNotification } from './NotificationContext';

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

// Debug function to test API connection with fallback
const testAPIConnection = async () => {
  try {
    console.log('=== API Connection Test ===');
    console.log('Current window location:', window.location.href);
    console.log('API URL being used:', API_BASE_URL);
    console.log('Hostname:', window.location.hostname);
    console.log('Port:', window.location.port);
    
    // Try axios first
    try {
      const response = await axios.post(API_BASE_URL, { action: 'test_connection' }, {
        timeout: 5000,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      console.log('✅ API connection test successful (axios):', response.data);
      return true;
    } catch (axiosError) {
      console.warn('⚠️ Axios failed, trying fetch:', axiosError.message);
      
      // Fallback to fetch
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ action: 'test_connection' })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API connection test successful (fetch):', data);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }
  } catch (error) {
    console.error('❌ API connection test failed:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    return false;
  }
};

function Reports() {
  const { theme } = useTheme();
  const { updateReportsNotifications, updateSystemUpdates, clearNotifications, clearSystemUpdates, markNotificationAsViewed } = useNotification();
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsPage, setReportsPage] = useState(1);
  const [selectedReportType, setSelectedReportType] = useState('all');
  const [reportData, setReportData] = useState([]);
  const [reportDataLoading, setReportDataLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const itemsPerPage = 12;

  const reportTypes = [
    { id: 'all', name: 'All Reports', icon: '📊' },
    { id: 'stock_in', name: 'Stock In Report', icon: '📦' },
    { id: 'stock_out', name: 'Stock Out Report', icon: '📤' },
    { id: 'sales', name: 'Sales Report', icon: '💰' },
    { id: 'inventory_balance', name: 'Inventory Balance Report', icon: '📋' },
    { id: 'supplier', name: 'Supplier Report', icon: '🏢' },
    { id: 'cashier_performance', name: 'Cashier Performance Report', icon: '👤' },
    { id: 'login_logs', name: 'Login Logs Report', icon: '🔐' }
  ];

  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const res = await axios.post(API_BASE_URL, { action: 'get_reports_data' });
      if (res.data?.success && Array.isArray(res.data.reports)) {
        setReports(res.data.reports);
        setReportsPage(1);
        
        // Update notifications based on reports
        const hasNewReports = res.data.reports.some(report => {
          const reportDate = new Date(report.date);
          const now = new Date();
          const diffHours = (now - reportDate) / (1000 * 60 * 60);
          return diffHours < 24; // Reports from last 24 hours
        });

        // Update sub-item notifications
        const subItemUpdates = {};
        reportTypes.forEach(type => {
          if (type.id !== 'all') {
            const typeReports = res.data.reports.filter(report => report.type === type.name);
            subItemUpdates[type.name] = {
              hasUpdates: typeReports.length > 0,
              count: typeReports.length
            };
          }
        });

        updateReportsNotifications(hasNewReports, res.data.reports.length, subItemUpdates);
      } else {
        setReports([]);
      }
    } catch (_) {
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchReportData = async (reportType, retryCount = 0) => {
    try {
      setReportDataLoading(true);
      setReportError(null);
      
      const requestData = { 
        action: 'get_report_data',
        report_type: reportType,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
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
        setReportData(res.data.data || []);
        setReportError(null);
      } else {
        setReportData([]);
        setReportError(res.data?.message || 'Failed to fetch report data');
        console.warn('Report data fetch failed:', res.data?.message);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData([]);
      
      // Retry logic for network errors
      if (retryCount < 2 && (error.message === 'Network Error' || error.message.includes('fetch'))) {
        console.log(`Retrying... attempt ${retryCount + 1}`);
        setTimeout(() => {
          fetchReportData(reportType, retryCount + 1);
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

  const generateReport = async (reportType) => {
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
        // Refresh reports list
        fetchReports();
        // Fetch the generated report data
        fetchReportData(reportType);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setReportDataLoading(false);
    }
  };

  useEffect(() => {
    // Test API connection first
    testAPIConnection().then(isConnected => {
      if (isConnected) {
        fetchReports();
      } else {
        console.error('API connection failed, cannot fetch reports');
      }
    });
    
    // Auto-clear notifications when Reports component is viewed
    markNotificationAsViewed('reports');
    clearSystemUpdates();
  }, []);

  // Check for actual system updates (no automatic triggering)
  useEffect(() => {
    const checkForRealUpdates = async () => {
      try {
        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check_reports_updates',
            hours: 1 // Check last hour for actual updates
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.data && result.data.hasUpdates) {
            // Only update if there are actual updates
            updateSystemUpdates(true, result.data.count);
            updateReportsNotifications(true, result.data.count, result.data.reportUpdates || {});
            console.log('✅ Real reports updates detected:', result.data);
          } else {
            // Clear updates if no real updates
            updateSystemUpdates(false, 0);
            updateReportsNotifications(false, 0, {});
            console.log('✅ No real reports updates');
          }
        } else {
          // Clear updates if API fails
          updateSystemUpdates(false, 0);
          updateReportsNotifications(false, 0, {});
        }
      } catch (error) {
        console.error('❌ Error checking reports updates:', error);
        // Clear updates on error
        updateSystemUpdates(false, 0);
        updateReportsNotifications(false, 0, {});
      }
    };

    checkForRealUpdates();
  }, [updateSystemUpdates, updateReportsNotifications]);

  useEffect(() => {
    if (selectedReportType !== 'all') {
      fetchReportData(selectedReportType);
    } else {
      setReportData([]);
    }
  }, [selectedReportType, dateRange]);

  const getReportColumns = (reportType) => {
    switch (reportType) {
      case 'stock_in':
        return ['Date', 'Time', 'Product Name', 'Barcode', 'Quantity', 'Unit Price', 'Total Value', 'Supplier', 'Reference No', 'Received By'];
      case 'stock_out':
        return ['Date', 'Time', 'Product Name', 'Barcode', 'Quantity', 'Unit Price', 'Total Value', 'Cashier', 'Customer Info', 'Reference No'];
      case 'sales':
        return ['Date', 'Time', 'Transaction ID', 'Total Amount', 'Items Sold', 'Products', 'Terminal'];
      case 'inventory_balance':
        return ['Product Name', 'Barcode', 'Category', 'Current Stock', 'Unit Price', 'Total Value', 'Location', 'Supplier', 'Brand', 'Expiration', 'Status'];
      case 'supplier':
        return ['Supplier Name', 'Contact', 'Email', 'Products Supplied', 'Total Stock', 'Total Value', 'Deliveries Count'];
      case 'cashier_performance':
        return ['Date', 'Cashier Name', 'Transactions Count', 'Total Sales', 'Average Transaction', 'Unique Products Sold'];
      case 'login_logs':
        return ['Date', 'Time', 'Username', 'Role', 'Action', 'Description'];
      default:
        return [];
    }
  };

  const formatReportCell = (row, column, reportType) => {
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
              <span className="border-b-2 pb-1" style={{ color: theme.text.primary, borderColor: theme.text.primary }}>System Reports</span>
              <span style={{ color: theme.text.secondary }}>Data Analytics</span>
              <span style={{ color: theme.text.secondary }}>Performance Metrics</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text.primary }}>Reports Dashboard</h1>
          </div>
        </div>
      </div>

      {/* Reports Content */}
      <div className="p-6">
        {/* Report Type Selection */}
        <div className="mb-6">
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
            {reportTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedReportType(type.id)}
                className={`p-3 rounded-lg border transition-all duration-200 hover:scale-105 ${
                  selectedReportType === type.id ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  backgroundColor: selectedReportType === type.id ? theme.colors.accent : theme.bg.card,
                  borderColor: theme.border.default,
                  color: theme.text.primary
                }}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className="text-xs font-medium text-center">{type.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Selection */}
        {selectedReportType !== 'all' && (
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
                  onClick={() => generateReport(selectedReportType)}
                  disabled={reportDataLoading}
                  className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                  style={{
                    backgroundColor: theme.colors.accent,
                    color: theme.text.primary
                  }}
                >
                  {reportDataLoading ? 'Generating...' : 'Generate Report'}
                </button>
                <button
                  onClick={() => testAPIConnection()}
                  className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 border"
                  style={{
                    backgroundColor: theme.bg.card,
                    borderColor: theme.border.default,
                    color: theme.text.primary
                  }}
                >
                  Test Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Data Display */}
        {selectedReportType === 'all' ? (
          <div
            className="rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
            style={{
              backgroundColor: theme.bg.card,
              boxShadow: `0 10px 25px ${theme.shadow}`
            }}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Generated Reports</h3>

              {reportsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.accent }}></div>
                  <span className="ml-2" style={{ color: theme.text.secondary }}>Loading reports...</span>
                </div>
              ) : (
                <>
                  <div className="max-h-[520px] overflow-y-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>Report ID</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>Report Type</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>Generated Date</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>Status</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {reports.slice((reportsPage - 1) * itemsPerPage, reportsPage * itemsPerPage).map((report, index) => (
                          <tr key={index} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <td className="p-4 align-middle" style={{ color: theme.text.primary }}>{report.movement_id || 'N/A'}</td>
                            <td className="p-4 align-middle" style={{ color: theme.text.secondary }}>{report.type || 'N/A'}</td>
                            <td className="p-4 align-middle" style={{ color: theme.text.secondary }}>{report.date || 'N/A'}</td>
                            <td className="p-4 align-middle">
                              <span
                                className="px-2 py-1 rounded text-xs"
                                style={{
                                  backgroundColor: report.status === 'Completed' ? theme.colors.successBg : theme.colors.warningBg,
                                  color: report.status === 'Completed' ? theme.colors.success : theme.colors.warning
                                }}
                              >
                                {report.status || 'pending'}
                              </span>
                            </td>
                            <td className="p-4 align-middle">
                              <button
                                className="px-3 py-1 rounded text-sm border transition-all duration-200 hover:scale-105"
                                style={{
                                  backgroundColor: theme.bg.hover,
                                  borderColor: theme.border.default,
                                  color: theme.text.primary
                                }}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-2 py-4">
                    <div className="text-sm text-muted-foreground" style={{ color: theme.text.muted }}>
                      Showing {Math.min((reportsPage - 1) * itemsPerPage + 1, reports.length)} to {Math.min(reportsPage * itemsPerPage, reports.length)} of {reports.length} reports
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${reportsPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={reportsPage === 1}
                        onClick={() => setReportsPage(p => Math.max(1, p - 1))}
                      >
                        ← Prev
                      </button>
                      {Array.from({ length: Math.max(1, Math.ceil(reports.length / itemsPerPage)) }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setReportsPage(page)}
                          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input h-8 px-3 ${reportsPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-accent hover:text-accent-foreground'}`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${reportsPage === Math.max(1, Math.ceil(reports.length / itemsPerPage)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={reportsPage === Math.max(1, Math.ceil(reports.length / itemsPerPage))}
                        onClick={() => setReportsPage(p => Math.min(Math.max(1, Math.ceil(reports.length / itemsPerPage)), p + 1))}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div
            className="rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
            style={{
              backgroundColor: theme.bg.card,
              boxShadow: `0 10px 25px ${theme.shadow}`
            }}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
                {reportTypes.find(t => t.id === selectedReportType)?.name} - {dateRange.startDate} to {dateRange.endDate}
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
                    onClick={() => fetchReportData(selectedReportType)}
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
                <>
                  {/* Summary Cards for Stock In Report */}
                  {selectedReportType === 'stock_in' && (
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

                  <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b sticky top-0" style={{ backgroundColor: theme.bg.card }}>
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          {getReportColumns(selectedReportType).map((column, index) => (
                            <th key={index} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {reportData.map((row, index) => (
                          <tr key={index} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            {getReportColumns(selectedReportType).map((column, colIndex) => (
                              <td key={colIndex} className="p-4 align-middle" style={{ color: theme.text.secondary }}>
                                {formatReportCell(row, column, selectedReportType)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8" style={{ color: theme.text.secondary }}>
                  <div className="text-4xl mb-4">📊</div>
                  <p>Click "Generate Report" to view {reportTypes.find(t => t.id === selectedReportType)?.name.toLowerCase()}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
