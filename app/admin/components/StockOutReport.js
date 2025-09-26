"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from './ThemeContext';
import { useNotification } from './NotificationContext';

// Use the same API approach as inventory stock adjustment
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

function StockOutReport() {
  const { theme } = useTheme();
  const { markNotificationAsViewed } = useNotification();
  const [stockOutData, setStockOutData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date('2025-09-01').toISOString().split('T')[0], // Start from September 1
    endDate: new Date().toISOString().split('T')[0]
  });

  // API Functions - same approach as inventory stock adjustment
  const handleApiCall = async (action, data = {}) => {
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...data
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'API call failed');
      }
      
      return result;
    } catch (error) {
      console.error(`API Error (${action}):`, error);
      throw error;
    }
  };

  const fetchAllStockOutData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the same API call as inventory stock adjustment but filter for stock-out only
      const result = await handleApiCall('get_stock_adjustments', {
        search: '',
        type: 'OUT', // Only get stock-out movements
        status: 'all',
        page: 1,
        limit: 1000 // Get all records for the date range
      });
      
      // Debug: Log all data first
      console.log('Raw API response:', result.data);
      console.log('Date range:', dateRange);
      
      // Filter by date range on the frontend since the API doesn't support date filtering
      const filteredData = result.data.filter(item => {
        const itemDate = new Date(item.date);
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        
        console.log('Item date:', item.date, 'Item parsed:', itemDate);
        console.log('Start date:', dateRange.startDate, 'Start parsed:', startDate);
        console.log('End date:', dateRange.endDate, 'End parsed:', endDate);
        console.log('Is within range:', itemDate >= startDate && itemDate <= endDate);
        
        return itemDate >= startDate && itemDate <= endDate;
      });
      
      setStockOutData(filteredData);
      setError(null);
      console.log('Stock-out data fetched successfully:', filteredData.length, 'records out of', result.data.length, 'total');
      
    } catch (error) {
      console.error('Error fetching stock-out data:', error);
      setStockOutData([]);
      
      // Set user-friendly error message
      if (error.message === 'Network Error' || error.message.includes('fetch')) {
        setError('Network Error: Please check if XAMPP services (Apache & MySQL) are running');
      } else if (error.message.includes('timeout')) {
        setError('Request timeout: Server may be slow, please try again');
      } else {
        setError(`Failed to load stock-out data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStockOutDataWithoutFilter = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the same API call as inventory stock adjustment but filter for stock-out only
      const result = await handleApiCall('get_stock_adjustments', {
        search: '',
        type: 'OUT', // Only get stock-out movements
        status: 'all',
        page: 1,
        limit: 1000 // Get all records
      });
      
      // Don't filter by date - show all data
      setStockOutData(result.data);
      setError(null);
      console.log('All stock-out data fetched successfully:', result.data.length, 'records');
      
    } catch (error) {
      console.error('Error fetching stock-out data:', error);
      setStockOutData([]);
      
      // Set user-friendly error message
      if (error.message === 'Network Error' || error.message.includes('fetch')) {
        setError('Network Error: Please check if XAMPP services (Apache & MySQL) are running');
      } else if (error.message.includes('timeout')) {
        setError('Request timeout: Server may be slow, please try again');
      } else {
        setError(`Failed to load stock-out data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStockOutData();
    
    // Auto-clear Stock Out Report notification when viewed
    markNotificationAsViewed('reports', 'Stock Out Report');
  }, [dateRange]);

  const formatCell = (row, column) => {
    const columnKey = column.toLowerCase().replace(/\s+/g, '_');
    
    switch (columnKey) {
      case 'date':
        return row[columnKey] ? new Date(row[columnKey]).toLocaleDateString('en-PH') : 'N/A';
      case 'time':
        return row[columnKey] ? new Date(`2000-01-01T${row[columnKey]}`).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      case 'quantity':
        return (
          <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.dangerBg, color: theme.colors.danger }}>
            -{row[columnKey] || '0'}
          </span>
        );
      case 'adjustment_type':
        return (
          <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.dangerBg, color: theme.colors.danger }}>
            {row[columnKey] || 'Stock Out'}
          </span>
        );
      case 'reason':
        // Map notes field to reason with appropriate values
        const notes = row['notes'] || '';
        if (notes.includes('POS Sale')) {
          return 'POS Sale';
        } else if (notes.includes('Transfer') || notes.includes('transfer')) {
          return 'Transfer Product from Warehouse to Convenience/Pharmacy';
        } else if (notes.includes('FIFO Consumption')) {
          return 'POS Sale';
        } else if (notes.includes('Synced')) {
          return 'System Sync';
        } else if (notes) {
          return notes;
        }
        return 'N/A';
      case 'adjusted_by':
        // Map employee_name field to adjusted_by, fallback to created_by
        const employeeName = row['employee_name'] || '';
        const createdBy = row['created_by'] || '';
        
        if (employeeName && employeeName.trim() !== '') {
          return employeeName.trim();
        } else if (createdBy === 'System Sync') {
          return 'System';
        } else if (createdBy === 'POS System') {
          return 'POS Cashier';
        } else if (createdBy === 'Pharmacy Cashier') {
          return 'Pharmacy Cashier';
        } else if (createdBy) {
          return createdBy;
        }
        return 'N/A';
      case 'status':
        return (
          <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.successBg, color: theme.colors.success }}>
            ✅ {row[columnKey] || 'Approved'}
          </span>
        );
      default:
        return row[columnKey] || 'N/A';
    }
  };

  // Updated columns to match stock adjustment data structure
  const columns = ['Date', 'Time', 'Product Name', 'Product ID', 'Adjustment Type', 'Quantity', 'Reason', 'Adjusted By', 'Status', 'Reference No'];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-6" style={{ backgroundColor: theme.colors.accent }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-6 mb-4">
              <span className="text-4xl">📤</span>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: theme.text.primary }}>Stock Out Report</h1>
                <p className="text-lg" style={{ color: theme.text.secondary }}>Stock-Out Adjustments from Inventory System</p>
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
            <h3 className="text-lg font-semibold mb-3" style={{ color: theme.text.primary }}>Filter by Date Range</h3>
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
                onClick={() => fetchAllStockOutData()}
                disabled={loading}
                className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                style={{
                  backgroundColor: theme.colors.accent,
                  color: theme.text.primary
                }}
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
              <button
                onClick={() => fetchAllStockOutDataWithoutFilter()}
                disabled={loading}
                className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 ml-2"
                style={{
                  backgroundColor: theme.colors.danger,
                  color: theme.text.primary
                }}
              >
                Show All Data
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {stockOutData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">📤</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Stock-Out Items</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{stockOutData.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">📊</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Quantity</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {stockOutData.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">👥</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Unique Products</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {new Set(stockOutData.map(item => item.product_name).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">✅</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Approved Adjustments</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {stockOutData.filter(item => item.status === 'Approved').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stock-Out Data Display */}
        <div
          className="rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          style={{
            backgroundColor: theme.bg.card,
            boxShadow: `0 10px 25px ${theme.shadow}`
          }}
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
              Stock-Out Products - {dateRange.startDate} to {dateRange.endDate}
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.accent }}></div>
                <span className="ml-2" style={{ color: theme.text.secondary }}>Loading stock-out data...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-lg font-medium mb-2" style={{ color: theme.colors.danger }}>Error Loading Data</p>
                <p className="mb-4" style={{ color: theme.text.secondary }}>{error}</p>
                <button
                  onClick={() => fetchAllStockOutData()}
                  className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: theme.colors.accent,
                    color: theme.text.primary
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : stockOutData.length > 0 ? (
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b sticky top-0" style={{ backgroundColor: theme.bg.card }}>
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      {columns.map((column, index) => (
                        <th key={index} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {stockOutData.map((row, index) => (
                      <tr key={index} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        {columns.map((column, colIndex) => (
                          <td key={colIndex} className="p-4 align-middle" style={{ color: theme.text.secondary }}>
                            {formatCell(row, column)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: theme.text.secondary }}>
                <div className="text-4xl mb-4">📤</div>
                <p>No stock-out data found for the selected date range</p>
                <p className="text-sm mt-2">Try adjusting the date range or check if there are stock-out records in the database</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockOutReport;
