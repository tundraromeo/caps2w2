"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTheme } from './ThemeContext';
import { useNotification } from './NotificationContext';

// Use environment-based API base URL
const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/backend.php`;

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
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [selectedReportTypes, setSelectedReportTypes] = useState(['stock_out']);
  const [combineDateRange, setCombineDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const reportTypes = [
    { id: 'stock_in', name: 'Stock In Reports' },
    { id: 'stock_out', name: 'Stock Out Reports' },
    { id: 'sales', name: 'Sales Reports' },
    { id: 'cashier_performance', name: 'Cashier Performance Reports' },
    { id: 'inventory_balance', name: 'Inventory Balance Reports' }
  ];

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
      let filteredData = result.data.filter(item => {
        const itemDate = new Date(item.date);
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        
        console.log('Item date:', item.date, 'Item parsed:', itemDate);
        console.log('Start date:', dateRange.startDate, 'Start parsed:', startDate);
        console.log('End date:', dateRange.endDate, 'End parsed:', endDate);
        console.log('Is within range:', itemDate >= startDate && itemDate <= endDate);
        
        return itemDate >= startDate && itemDate <= endDate;
      });

      // CRITICAL: Remove duplicates based on reference_no to prevent same transaction showing multiple times
      const seenReferences = new Set();
      filteredData = filteredData.filter(item => {
        const referenceNo = item.reference_no;
        if (seenReferences.has(referenceNo)) {
          console.log('Removing duplicate entry with reference:', referenceNo);
          return false; // Skip this duplicate entry
        }
        seenReferences.add(referenceNo);
        return true;
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

  const combineReports = async () => {
    try {
      setLoading(true);
      
      // Generate PDF directly
      await generateCombinedPDF(selectedReportTypes);
      
      // Close modal
      setShowCombineModal(false);
      
    } catch (error) {
      console.error('Error combining reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCombinedPDF = async (reportTypes) => {
    try {
      // Create a temporary div for PDF generation
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '210mm'; // A4 width
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.padding = '20px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '12px';
      tempDiv.style.lineHeight = '1.4';
      
      // Create PDF content
      const reportNames = reportTypes.map(type => 
        reportTypes.find(t => t.id === type)?.name || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      ).join(', ');
      
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: #f8fafc; border: 2px solid #000000;">
          <div style="font-size: 24px; font-weight: bold; color: #000000; margin-bottom: 5px;">ENGUIO PHARMACY SYSTEM</div>
          <div style="font-size: 14px; color: #000000;">Combined Reports</div>
        </div>
        
        <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #000000;">
          <div style="font-size: 20px; font-weight: bold; color: #000000; margin-bottom: 10px;">Combined Reports</div>
          <div style="font-size: 12px; color: #000000; margin: 2px 0;">Generated on: ${new Date().toLocaleDateString('en-PH')} at ${new Date().toLocaleTimeString('en-PH')}</div>
          <div style="font-size: 12px; color: #000000; margin: 2px 0;">Generated by: Admin</div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #f1f5f9; border-left: 4px solid #000000;">
          <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Report Information</div>
          <div style="display: table; width: 100%;">
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">Report Types:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">${reportNames}</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">Date Range:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">${combineDateRange.startDate} to ${combineDateRange.endDate}</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">File Format:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">PDF Document</div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border: 1px solid #000000;">
          <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Report Summary</div>
          <div style="font-size: 11px; color: #000000; line-height: 1.6;">
            This combined report contains data from multiple report types for the specified date range. 
            Each report type provides detailed information about different aspects of the inventory management system.
          </div>
        </div>
      `;
      
      // Add to DOM temporarily
      document.body.appendChild(tempDiv);
      
      // Generate canvas from HTML
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // Remove temporary div
      document.body.removeChild(tempDiv);
      
      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save PDF
      const fileName = `Combined_Reports_${combineDateRange.startDate}_to_${combineDateRange.endDate}.pdf`;
      pdf.save(fileName);
      
      console.log(`PDF downloaded successfully: ${fileName}`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

  const handleReportTypeChange = (reportTypeId) => {
    setSelectedReportTypes(prev => {
      if (prev.includes(reportTypeId)) {
        return prev.filter(id => id !== reportTypeId);
      } else {
        return [...prev, reportTypeId];
      }
    });
  };

  const openCombineModal = () => {
    setSelectedReportTypes(['stock_out']); // Default to stock out
    setCombineDateRange({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    setShowCombineModal(true);
  };

  useEffect(() => {
    fetchAllStockOutData();
    
    // Auto-clear Stock Out Report notification when viewed
    markNotificationAsViewed('reports', 'Stock Out Report');

    // Auto-refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      fetchAllStockOutData();
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [dateRange]);

  const formatCell = (row, column) => {
    const columnKey = column.toLowerCase().replace(/\s+/g, '_');
    
    switch (columnKey) {
      case 'date':
        return row[columnKey] ? new Date(row[columnKey]).toLocaleDateString('en-PH') : '📅 Not Available';
      case 'time':
        return row[columnKey] ? new Date(`2000-01-01T${row[columnKey]}`).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '🕐 Not Available';
      case 'quantity':
        return (
          <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.dangerBg, color: theme.colors.danger }}>
            {row[columnKey] || '0'}
          </span>
        );
      case 'adjustment_type':
        return (
          <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.dangerBg, color: theme.colors.danger }}>
            Stock Out
          </span>
        );
      case 'reason':
        // Map notes field to reason with appropriate values
        const notes = row['notes'] || '';
        // Prioritize POS Sale detection
        if (notes.includes('POS Sale') || notes.includes('FIFO Consumption') || notes.includes('sold')) {
          return '🛒 POS Sale';
        } else if (notes.includes('Transfer') || notes.includes('transfer')) {
          return '🚚 Transfer Product from Warehouse to Convenience/Pharmacy';
        } else if (notes.includes('Synced')) {
          return '🔄 System Sync';
        } else if (notes) {
          return notes;
        }
        return '📝 System Adjustment';
      case 'adjusted_by':
        // Get all available employee information from API response
        const adjustedBy = row['adjusted_by'] || ''; // Complete employee name from API
        const employeeId = row['employee_id'] || '';
        const employeeUsername = row['employee_username'] || '';
        const loggedInUser = row['logged_in_user'] || ''; // Who was logged in at the time
        const loginFname = row['login_fname'] || '';
        const loginLname = row['login_lname'] || '';
        const loginUsername = row['login_username'] || '';
        
        // Get role and shift information
        const userRole = row['user_role'] || '';
        const loginRole = row['login_role'] || '';
        const displayRole = row['display_role'] || '';
        const shiftName = row['shift_name'] || '';
        const shiftStart = row['shift_start'] || '';
        const shiftEnd = row['shift_end'] || '';
        
        // Get terminal and location information
        const terminalName = row['terminal_name'] || '';
        const posTerminalName = row['pos_terminal_name'] || '';
        const assignedLocation = row['assigned_location'] || '';
        const loginLocation = row['login_location'] || '';
        
        // Get original created_by value for fallback
        const createdBy = row['created_by'] || '';
        
        // Determine the best employee information to display
        const getUserDisplay = () => {
          const notes = row['notes'] || '';
          const isPOSSale = notes.includes('POS Sale') || notes.includes('FIFO Consumption') || notes.includes('sold');
          
          // For POS sales, prioritize cashier/POS terminal users
          if (isPOSSale) {
            // 1. Priority for POS sales: Look for POS terminal users first
            if (loggedInUser && loggedInUser.trim() !== '' && (loginRole?.toLowerCase().includes('cashier') || posTerminalName)) {
              const role = getRoleDisplay(loginRole || displayRole || userRole);
              const shiftInfo = getShiftDisplay();
              return `👤 ${role}${role ? ' ' : ''}${loggedInUser.trim()}${shiftInfo}`;
            }
            
            // 2. Priority for POS sales: Use adjusted_by if it's a cashier
            if (adjustedBy && adjustedBy.trim() !== '' && (displayRole?.toLowerCase().includes('cashier') || userRole?.toLowerCase().includes('cashier'))) {
              const role = getRoleDisplay(displayRole || loginRole || userRole);
              const shiftInfo = getShiftDisplay();
              return `👤 ${role}${role ? ' ' : ''}${adjustedBy.trim()}${shiftInfo}`;
            }
          }
          
          // 1. Priority: Use adjusted_by field (complete employee name from API)
          if (adjustedBy && adjustedBy.trim() !== '') {
            const role = getRoleDisplay(displayRole || loginRole || userRole);
            const shiftInfo = getShiftDisplay();
            return `👤 ${role}${role ? ' ' : ''}${adjustedBy.trim()}${shiftInfo}`;
          }
          
          // 2. Priority: Use logged_in_user (who was logged in at the time)
          if (loggedInUser && loggedInUser.trim() !== '') {
            const role = getRoleDisplay(loginRole || displayRole || userRole);
            const shiftInfo = getShiftDisplay();
            return `👤 ${role}${role ? ' ' : ''}${loggedInUser.trim()}${shiftInfo}`;
          }
          
          // 3. Priority: Use login employee name parts
          if (loginFname && loginLname) {
            const fullName = `${loginFname} ${loginLname}`;
            const role = getRoleDisplay(loginRole || displayRole || userRole);
            const shiftInfo = getShiftDisplay();
            return `👤 ${role}${role ? ' ' : ''}${fullName}${shiftInfo}`;
          }
          
          // 4. Priority: Use employee username
          if (employeeUsername && employeeUsername.trim() !== '') {
            const role = getRoleDisplay(displayRole || loginRole || userRole);
            const shiftInfo = getShiftDisplay();
            return `👤 ${role}${role ? ' ' : ''}${employeeUsername.trim()}${shiftInfo}`;
          }
          
          // 5. Priority: Use login username
          if (loginUsername && loginUsername.trim() !== '') {
            const role = getRoleDisplay(loginRole || displayRole || userRole);
            const shiftInfo = getShiftDisplay();
            return `👤 ${role}${role ? ' ' : ''}${loginUsername.trim()}${shiftInfo}`;
          }
          
          // 6. Fallback: Map created_by to known employees
          if (createdBy === 'admin') {
            return `👤 Admin System`;
          }
          
          if (createdBy === 'inventory') {
            return `👤 Inventory Staff`;
          }
          
          if (createdBy === 'POS System' || createdBy === 'POS') {
            const shiftInfo = getShiftDisplay();
            return `👤 POS Cashier${shiftInfo}`;
          }
          
          if (createdBy === 'pharmacist') {
            return `👤 Pharmacist`;
          }
          
          if (createdBy === 'cashier') {
            const shiftInfo = getShiftDisplay();
            return `👤 Cashier${shiftInfo}`;
          }
          
          // 7. Final fallback
          if (createdBy && createdBy.trim() !== '') {
            return `👤 ${createdBy.trim()}`;
          }
          
          return '👤 Unknown User';
        };
        
        // Helper function to format role display
        const getRoleDisplay = (role) => {
          if (!role) return '';
          const roleLower = role.toLowerCase();
          if (roleLower.includes('admin')) return 'Admin';
          if (roleLower.includes('inventory')) return 'Inventory Staff';
          if (roleLower.includes('cashier')) return 'Cashier';
          if (roleLower.includes('pharmacist')) return 'Pharmacist';
          if (roleLower.includes('manager')) return 'Manager';
          if (roleLower.includes('supervisor')) return 'Supervisor';
          return role;
        };
        
        // Helper function to format shift display
        const getShiftDisplay = () => {
          if (shiftName) {
            if (shiftStart && shiftEnd) {
              // Format time nicely
              const startTime = shiftStart.includes(':') ? shiftStart.substring(11, 16) : shiftStart;
              const endTime = shiftEnd.includes(':') ? shiftEnd.substring(11, 16) : shiftEnd;
              return ` - ${shiftName} (${startTime}-${endTime})`;
            }
            return ` - ${shiftName}`;
          }
          return '';
        };
        
        const userDisplay = getUserDisplay();
        
        // Add context information (terminal and location)
        const contextParts = [];
        const terminalInfo = posTerminalName || terminalName;
        if (terminalInfo) contextParts.push(terminalInfo);
        
        const locationInfo = loginLocation || assignedLocation;
        if (locationInfo) contextParts.push(`@ ${locationInfo}`);
        
        const contextDisplay = contextParts.length > 0 ? ` (${contextParts.join(' ')})` : '';
        
        return `${userDisplay}${contextDisplay}`;
      case 'status':
        return (
          <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.successBg, color: theme.colors.success }}>
            ✅ {row[columnKey] || 'Approved'}
          </span>
        );
      case 'product_name':
        return row[columnKey] || '📦 Generic Product';
      case 'product_id':
        return row[columnKey] || '📱 No ID';
      case 'reference_no':
        return row[columnKey] || '📋 Auto-Generated';
      default:
        return row[columnKey] || '📊 Not Available';
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
          <div className="flex gap-3">
            <button
              onClick={openCombineModal}
              disabled={loading}
              className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center gap-2"
              style={{
                backgroundColor: theme.bg.hover,
                color: theme.text.secondary,
                border: `1px solid ${theme.border.default}`
              }}
            >
              📋 Combine Reports
            </button>
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

      {/* Combine Reports Modal */}
      {showCombineModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border-2 border-red-300"
            style={{ 
              backgroundColor: theme.bg.card,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.2)'
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.default }}>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                  Combine Stock Out Reports
                </h3>
                <p className="text-sm mt-1" style={{ color: theme.text.secondary }}>
                  Select date range and report types to download as a single PDF
                </p>
              </div>
              <button
                onClick={() => setShowCombineModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Quick Select Date Range */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3" style={{ color: theme.text.primary }}>Quick Select</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Today', days: 0 },
                    { label: 'Yesterday', days: -1 },
                    { label: 'This Week', days: -7 },
                    { label: 'Last Week', days: -14 },
                    { label: 'This Month', days: -30 },
                    { label: 'Last Month', days: -60 }
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => {
                        const today = new Date();
                        const targetDate = new Date(today.getTime() + (option.days * 24 * 60 * 60 * 1000));
                        const dateStr = targetDate.toISOString().split('T')[0];
                        
                        if (option.days === 0) {
                          setCombineDateRange({ startDate: dateStr, endDate: dateStr });
                        } else if (option.days === -1) {
                          setCombineDateRange({ startDate: dateStr, endDate: dateStr });
                        } else {
                          setCombineDateRange({ startDate: dateStr, endDate: today.toISOString().split('T')[0] });
                        }
                      }}
                      className="px-3 py-2 text-sm rounded-md border transition-all duration-200 hover:scale-105"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.default,
                        color: theme.text.primary
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3" style={{ color: theme.text.primary }}>Custom Date Range</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: theme.text.secondary }}>Start Date</label>
                    <input
                      type="date"
                      value={combineDateRange.startDate}
                      onChange={(e) => setCombineDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.default,
                        color: theme.text.primary
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: theme.text.secondary }}>End Date</label>
                    <input
                      type="date"
                      value={combineDateRange.endDate}
                      onChange={(e) => setCombineDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.default,
                        color: theme.text.primary
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Report Type Selection */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3" style={{ color: theme.text.primary }}>Report Types to Combine</h4>
                <div className="space-y-2">
                  {reportTypes.map((type) => (
                    <label key={type.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedReportTypes.includes(type.id)}
                        onChange={() => handleReportTypeChange(type.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm" style={{ color: theme.text.secondary }}>
                        {type.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={combineReports}
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: theme.colors.accent,
                    color: theme.text.primary
                  }}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      📋 Download PDF
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowCombineModal(false)}
                  className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: theme.bg.hover,
                    borderColor: theme.border.default,
                    color: theme.text.secondary,
                    border: `1px solid ${theme.border.default}`
                  }}
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockOutReport;
