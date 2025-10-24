"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { useTheme } from './ThemeContext';
import { useNotification } from './NotificationContext';

// Use environment-based API base URL
const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/Api'}/backend.php`;

function CombinedReports() {
  const { theme } = useTheme();
  const { markNotificationAsViewed } = useNotification();
  
  // State management
  const [activeTab, setActiveTab] = useState('stock_in');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Start from 30 days ago
    endDate: new Date().toISOString().split('T')[0]
  });
  
  // Report data states
  const [stockInData, setStockInData] = useState([]);
  const [stockOutData, setStockOutData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [inventoryBalanceData, setInventoryBalanceData] = useState([]);
  
  // Combined PDF modal state
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [selectedReportTypes, setSelectedReportTypes] = useState(['stock_in']);
  const [combineDateRange, setCombineDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Report types configuration
  const reportTypes = [
    { id: 'stock_in', name: 'Stock In Reports', icon: '📦', color: 'success' },
    { id: 'stock_out', name: 'Stock Out Reports', icon: '📤', color: 'danger' },
    { id: 'sales', name: 'Sales Reports', icon: '💰', color: 'accent' },
    { id: 'inventory_balance', name: 'Inventory Balance Reports', icon: '📋', color: 'info' }
  ];

  // API Functions
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

  // Fetch data for specific report type
  const fetchReportData = async (reportType) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`📊 Fetching ${reportType} data...`);
      
      const result = await handleApiCall('get_report_data', {
        report_type: reportType,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      });
      
      const data = result.data || [];
      
      // Remove duplicates based on movement_id or unique key
      const seenMovementIds = new Set();
      const seenEntries = new Set();
      
      const deduplicatedData = data.filter(item => {
        const movementId = item.movement_id || item.id;
        
        if (movementId && movementId !== 'undefined') {
          if (seenMovementIds.has(movementId)) {
            return false;
          }
          seenMovementIds.add(movementId);
          return true;
        }
        
        const uniqueKey = `${item.product_name || ''}_${item.barcode || ''}_${item.date || ''}_${item.time || ''}_${item.quantity || ''}`;
        
        if (seenEntries.has(uniqueKey)) {
          return false;
        }
        
        seenEntries.add(uniqueKey);
        return true;
      });
      
      // Set data based on report type
      switch (reportType) {
        case 'stock_in':
          setStockInData(deduplicatedData);
          break;
        case 'stock_out':
          setStockOutData(deduplicatedData);
          break;
        case 'sales':
          setSalesData(deduplicatedData);
          break;
        case 'inventory_balance':
          setInventoryBalanceData(deduplicatedData);
          break;
        default:
          break;
      }
      
      console.log(`✅ ${reportType} data fetched successfully:`, deduplicatedData.length, 'records');
      
    } catch (error) {
      console.error(`Error fetching ${reportType} data:`, error);
      
      if (error.message === 'Network Error' || error.message.includes('fetch')) {
        setError('Network Error: Please check if XAMPP services (Apache & MySQL) are running');
      } else if (error.message.includes('timeout')) {
        setError('Request timeout: Server may be slow, please try again');
      } else {
        setError(`Failed to load ${reportType} data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch all report data
  const fetchAllReportData = async () => {
    const promises = reportTypes.map(type => fetchReportData(type.id));
    await Promise.all(promises);
  };

  // Get current report data based on active tab
  const getCurrentReportData = () => {
    switch (activeTab) {
      case 'stock_in':
        return stockInData;
      case 'stock_out':
        return stockOutData;
      case 'sales':
        return salesData;
      case 'inventory_balance':
        return inventoryBalanceData;
      default:
        return [];
    }
  };

  // Get columns for current report type
  const getColumns = () => {
    switch (activeTab) {
      case 'stock_in':
        return ['Date', 'Time', 'Product Name', 'Adjustment Type', 'Quantity', 'Reason', 'Adjusted By', 'Status', 'Reference No'];
      case 'stock_out':
        return ['Date', 'Time', 'Product Name', 'Barcode', 'Quantity', 'Unit Price', 'Total Value', 'Cashier', 'Customer Info', 'Reference No'];
      case 'sales':
        return ['Date', 'Time', 'Product Name', 'Barcode', 'Quantity', 'Unit Price', 'Total Value', 'Cashier', 'Customer Info', 'Reference No'];
      case 'inventory_balance':
        return ['Product Name', 'Barcode', 'Current Stock', 'Unit Price', 'Total Value', 'Last Updated', 'Location', 'Status'];
      default:
        return [];
    }
  };

  // Format cell content based on column and report type
  const formatCell = (row, column) => {
    const columnKey = column.toLowerCase().replace(/\s+/g, '_');
    
    switch (columnKey) {
      case 'date':
        return row.date ? new Date(row.date).toLocaleDateString('en-PH') : 'N/A';
      case 'time':
        return row.time ? new Date(`2000-01-01T${row.time}`).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      case 'quantity':
        const quantity = row.quantity || '0';
        const isStockIn = activeTab === 'stock_in';
        const bgColor = isStockIn ? theme.colors.successBg : theme.colors.dangerBg;
        const textColor = isStockIn ? theme.colors.success : theme.colors.danger;
        const prefix = isStockIn ? '+' : '-';
        
        return (
          <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: bgColor, color: textColor }}>
            {prefix}{quantity}
          </span>
        );
      case 'adjustment_type':
        return (
          <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.successBg, color: theme.colors.success }}>
            {row.movement_type || 'Stock In'}
          </span>
        );
      case 'status':
        return (
          <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.successBg, color: theme.colors.success }}>
            ✅ {row.status || 'Approved'}
          </span>
        );
      case 'total_value':
      case 'unit_price':
        return `₱${parseFloat(row[columnKey] || 0).toFixed(2)}`;
      case 'product_name':
        return row.product_name || 'N/A';
      case 'barcode':
        return row.barcode || row.product_id || 'No ID';
      case 'reason':
        const reason = row['reason'] || '';
        const notes = row['notes'] || '';
        const reasonText = reason || notes;
        
        if (reasonText.includes('Stock added') || reasonText.includes('delivery') || reasonText.includes('received')) {
          return '📦 Stock Received';
        } else if (reasonText.includes('Transfer') || reasonText.includes('transfer')) {
          return '🚚 Stock Transfer';
        } else if (reasonText.includes('Adjustment') || reasonText.includes('adjustment')) {
          return '🔧 Manual Adjustment';
        } else if (reasonText) {
          return reasonText;
        }
        return '📝 System Addition';
      case 'adjusted_by':
        const adjustedBy = row['adjusted_by'] || '';
        const adjustedByDetailed = row['adjusted_by_detailed'] || '';
        const createdBy = row['created_by'] || '';
        const receivedBy = row['received_by'] || '';
        
        const displayName = adjustedByDetailed || adjustedBy || receivedBy;
        
        if (displayName && displayName.trim() !== '') {
          if (displayName.toLowerCase().includes('admin')) {
            return `👑 ${displayName.trim()}`;
          } else if (displayName.toLowerCase().includes('inventory')) {
            return `📦 ${displayName.trim()}`;
          } else if (displayName.toLowerCase().includes('cashier')) {
            return `💰 ${displayName.trim()}`;
          } else if (displayName.toLowerCase().includes('pharmacy')) {
            return `💊 ${displayName.trim()}`;
          } else if (displayName.toLowerCase().includes('pos system')) {
            return `🤖 POS System`;
          } else {
            return `👤 ${displayName.trim()}`;
          }
        }
        
        if (createdBy === 'admin') {
          return `👤 Admin System`;
        }
        
        if (createdBy === 'inventory') {
          return `👤 Inventory Staff`;
        }
        
        if (createdBy === 'POS System' || createdBy === 'POS') {
          return `👤 POS Cashier`;
        }
        
        if (createdBy === 'pharmacist') {
          return `👤 Pharmacist`;
        }
        
        if (createdBy === 'cashier') {
          return `👤 Cashier`;
        }
        
        if (createdBy && createdBy.trim() !== '') {
          return `👤 ${createdBy.trim()}`;
        }
        
        return '👤 Unknown User';
      case 'reference_no':
        return row.reference_no || 'N/A';
      case 'cashier':
        return row.cashier || 'N/A';
      case 'customer_info':
        return row.customer_info || 'N/A';
      case 'current_stock':
        return row.current_stock || '0';
      case 'last_updated':
        return row.last_updated ? new Date(row.last_updated).toLocaleDateString('en-PH') : 'N/A';
      case 'location':
        return row.location || 'N/A';
      default:
        return row[columnKey] || 'N/A';
    }
  };

  // Generate summary statistics for current report
  const getSummaryStats = () => {
    const data = getCurrentReportData();
    
    switch (activeTab) {
      case 'stock_in':
        return {
          totalItems: data.length,
          totalQuantity: data.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0),
          uniqueProducts: new Set(data.map(item => item.product_name).filter(Boolean)).size,
          approvedAdjustments: data.filter(item => item.status === 'Approved').length
        };
      case 'stock_out':
        return {
          totalItems: data.length,
          totalQuantity: data.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0),
          totalValue: data.reduce((sum, item) => sum + (parseFloat(item.total_value) || 0), 0),
          uniqueCashiers: new Set(data.map(item => item.cashier).filter(Boolean)).size
        };
      case 'sales':
        return {
          totalItems: data.length,
          totalQuantity: data.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0),
          totalValue: data.reduce((sum, item) => sum + (parseFloat(item.total_value) || 0), 0),
          uniqueCashiers: new Set(data.map(item => item.cashier).filter(Boolean)).size
        };
      case 'inventory_balance':
        return {
          totalProducts: data.length,
          totalStock: data.reduce((sum, item) => sum + (parseInt(item.current_stock) || 0), 0),
          totalValue: data.reduce((sum, item) => sum + (parseFloat(item.total_value) || 0), 0),
          lowStockItems: data.filter(item => (parseInt(item.current_stock) || 0) < 10).length
        };
      default:
        return {};
    }
  };

  // Combined PDF generation
  const generateCombinedPDF = async (reportTypes) => {
    try {
      console.log('🧪 Starting combined PDF generation...');
      console.log('📊 Report types to process:', reportTypes);
      console.log('📅 Date range:', combineDateRange);
      
      // Fetch data for all selected report types
      const allReportsData = {};
      let hasAnyData = false;
      
      for (const reportType of reportTypes) {
        try {
          console.log(`📊 Fetching data for ${reportType}...`);
          const result = await handleApiCall('get_report_data', {
            report_type: reportType,
            start_date: combineDateRange.startDate,
            end_date: combineDateRange.endDate
          });
          
          if (result.success) {
            allReportsData[reportType] = result.data || [];
            console.log(`✅ Fetched ${allReportsData[reportType].length} records for ${reportType}`);
            
            if (allReportsData[reportType].length > 0) {
              hasAnyData = true;
            }
          } else {
            allReportsData[reportType] = [];
            console.warn(`⚠️ No data for ${reportType}:`, result.message);
          }
        } catch (error) {
          console.error(`❌ Error fetching ${reportType}:`, error);
          allReportsData[reportType] = [];
        }
      }
      
      if (!hasAnyData) {
        throw new Error('No data found for the selected date range and report types.');
      }
      
      console.log('📄 All reports data fetched:', allReportsData);
      console.log('📄 Creating PDF document...');
      
      // Create PDF with jsPDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Header
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('ENGUIO PHARMACY SYSTEM', 20, 20);
      
      pdf.setFontSize(12);
      pdf.text('Combined Reports', 20, 30);
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Date Range: ${combineDateRange.startDate} to ${combineDateRange.endDate}`, 20, 40);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-PH')} at ${new Date().toLocaleTimeString('en-PH')}`, 20, 45);
      pdf.text(`Generated by: Admin`, 20, 50);
      
      let yPosition = 60;
      
      // Add each report's data
      console.log('🔄 Processing report types for PDF:', reportTypes);
      for (const reportType of reportTypes) {
        const data = allReportsData[reportType] || [];
        const reportConfig = reportTypes.find(t => t.id === reportType);
        const reportName = reportConfig ? reportConfig.name : reportType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        console.log(`📊 Processing ${reportType}:`, {
          reportName,
          dataLength: data.length,
          hasData: data.length > 0
        });
        
        // Check if we need a new page
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // Report header
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${reportName}`, 20, yPosition);
        yPosition += 10;
        
        if (data.length === 0) {
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'normal');
          pdf.text('No data available for this report type in the selected date range.', 20, yPosition);
          yPosition += 15;
        } else {
          // Add report-specific summary
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'bold');
          pdf.text(`📊 ${data.length} records found`, 20, yPosition);
          yPosition += 5;
          
          // Get columns for this report type
          let columns = [];
          switch (reportType) {
            case 'stock_in':
              columns = ['Date', 'Time', 'Product Name', 'Quantity', 'Reason', 'Adjusted By', 'Reference No'];
              break;
            case 'stock_out':
            case 'sales':
              columns = ['Date', 'Time', 'Product Name', 'Quantity', 'Unit Price', 'Total Value', 'Cashier', 'Reference No'];
              break;
            case 'inventory_balance':
              columns = ['Product Name', 'Current Stock', 'Unit Price', 'Total Value', 'Last Updated', 'Location'];
              break;
            default:
              columns = ['Date', 'Time', 'Product Name', 'Quantity'];
          }
          
          // Prepare table data
          const tableData = data.slice(0, 30).map(row => {
            return columns.map(column => {
              const columnKey = column.toLowerCase().replace(/\s+/g, '_');
              let cellValue = row[columnKey] || 'N/A';
              
              // Format values
              if (columnKey.includes('total_value') || columnKey.includes('unit_price')) {
                cellValue = `₱${parseFloat(cellValue || 0).toFixed(2)}`;
              } else if (columnKey === 'date' && cellValue !== 'N/A') {
                cellValue = new Date(cellValue).toLocaleDateString('en-PH');
              } else if (columnKey === 'time' && cellValue !== 'N/A') {
                try {
                  cellValue = new Date(`2000-01-01T${cellValue}`).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
                } catch (e) {
                  // Keep original if parsing fails
                }
              } else if (columnKey === 'last_updated' && cellValue !== 'N/A') {
                cellValue = new Date(cellValue).toLocaleDateString('en-PH');
              }
              
              return cellValue.toString().substring(0, 25); // Limit cell content length
            });
          });
          
          // Add table using autoTable
          try {
            autoTable(pdf, {
              head: [columns],
              body: tableData,
              startY: yPosition,
              styles: {
                fontSize: 8,
                cellPadding: 2,
              },
              headStyles: {
                fillColor: [200, 200, 200],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
              },
              alternateRowStyles: {
                fillColor: [245, 245, 245],
              },
              margin: { left: 20, right: 20 },
              tableWidth: 'auto'
            });
            
            // Get the final Y position after the table
            yPosition = pdf.lastAutoTable.finalY + 10;
          } catch (autoTableError) {
            console.warn('AutoTable failed:', autoTableError);
            yPosition += 50; // Fallback spacing
          }
          
          if (data.length > 30) {
            pdf.setFontSize(8);
            pdf.setFont(undefined, 'normal');
            pdf.text(`Showing 30 of ${data.length} records`, 20, yPosition);
            yPosition += 10;
          }
        }
      }
      
      // Save PDF
      const fileName = `Combined_Reports_${combineDateRange.startDate}_to_${combineDateRange.endDate}.pdf`;
      
      console.log('💾 Saving PDF:', fileName);
      pdf.save(fileName);
      console.log(`✅ PDF downloaded successfully: ${fileName}`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

  const combineReports = async () => {
    try {
      console.log('🔄 Combine Reports button clicked!');
      console.log('📋 Selected report types:', selectedReportTypes);
      setLoading(true);
      
      // Check if at least one report type is selected
      if (selectedReportTypes.length === 0) {
        alert('Please select at least one report type to generate PDF.');
        return;
      }
      
      console.log('🧪 Starting PDF generation with selected report types:', selectedReportTypes);
      
      // Generate PDF directly - this will fetch fresh data from database
      await generateCombinedPDF(selectedReportTypes);
      
      console.log('✅ PDF generation completed');
      
      // Close current modal
      setShowCombineModal(false);
      
    } catch (error) {
      console.error('❌ Error combining reports:', error);
      alert('Error generating PDF: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReportTypeChange = (reportTypeId) => {
    setSelectedReportTypes(prev => {
      const newSelection = prev.includes(reportTypeId) 
        ? prev.filter(id => id !== reportTypeId)
        : [...prev, reportTypeId];
      
      console.log('🔄 Report type changed:', {
        reportTypeId,
        action: prev.includes(reportTypeId) ? 'removed' : 'added',
        newSelection
      });
      
      return newSelection;
    });
  };

  const openCombineModal = () => {
    // Set all report types as selected by default, not just the current tab
    setSelectedReportTypes(['stock_in', 'stock_out', 'sales', 'inventory_balance']);
    console.log('🔗 Opening combine modal with all report types selected');
    setCombineDateRange({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });
    setShowCombineModal(true);
  };

  // Effects
  useEffect(() => {
    fetchAllReportData();
    
    // Auto-clear notifications when viewed
    markNotificationAsViewed('reports', 'Combined Reports');

    // Auto-refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      fetchAllReportData();
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [dateRange]);

  // Get current report data and columns
  const currentData = getCurrentReportData();
  const columns = getColumns();
  const summaryStats = getSummaryStats();

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-3" style={{ backgroundColor: theme.bg.card }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <span className="text-2xl">📊</span>
              <div>
                <h1 className="text-xl font-bold" style={{ color: theme.text.primary }}>Combined Reports</h1>
                <p className="text-sm" style={{ color: theme.text.secondary }}>Unified view of all inventory and sales reports</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openCombineModal}
              disabled={loading}
              className="px-3 py-1 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center gap-2 text-sm"
              style={{
                backgroundColor: theme.bg.hover,
                color: theme.text.primary,
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
              boxShadow: `0 10px 25px ${theme.shadow.lg}`
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

        {/* Tab Navigation */}
        <div className="mb-6">
          <div
            className="rounded-lg shadow-md p-4"
            style={{
              backgroundColor: theme.bg.card,
              boxShadow: `0 10px 25px ${theme.shadow.lg}`
            }}
          >
            <h3 className="text-lg font-semibold mb-3" style={{ color: theme.text.primary }}>Report Types</h3>
            <div className="flex flex-wrap gap-2">
              {reportTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setActiveTab(type.id)}
                  className={`px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 ${
                    activeTab === type.id ? 'ring-2 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundColor: activeTab === type.id ? theme.colors.accent : theme.bg.hover,
                    color: activeTab === type.id ? theme.text.primary : theme.text.secondary,
                    border: `1px solid ${theme.border.default}`,
                    ringColor: theme.colors.accent
                  }}
                >
                  <span className="text-lg">{type.icon}</span>
                  {type.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {currentData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Object.entries(summaryStats).map(([key, value]) => (
              <div key={key} className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
                <div className="flex items-center">
                  <div className="text-3xl mr-3">{reportTypes.find(t => t.id === activeTab)?.icon}</div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </p>
                    <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                      {typeof value === 'number' && key.includes('Value') ? `₱${value.toFixed(2)}` : value.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Report Data Display */}
        <div
          className="rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          style={{
            backgroundColor: theme.bg.card,
            boxShadow: `0 10px 25px ${theme.shadow.lg}`
          }}
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
              {reportTypes.find(t => t.id === activeTab)?.name} - {dateRange.startDate} to {dateRange.endDate}
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.accent }}></div>
                <span className="ml-2" style={{ color: theme.text.secondary }}>Loading report data...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-lg font-medium mb-2" style={{ color: theme.colors.danger }}>Error Loading Data</p>
                <p className="mb-4" style={{ color: theme.text.secondary }}>{error}</p>
                <button
                  onClick={() => fetchAllReportData()}
                  className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: theme.colors.accent,
                    color: theme.text.primary
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : currentData.length > 0 ? (
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
                    {currentData.map((row, index) => (
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
                <div className="text-4xl mb-4">{reportTypes.find(t => t.id === activeTab)?.icon}</div>
                <p>No {activeTab.replace('_', ' ')} data found for the selected date range</p>
                <p className="text-sm mt-2">Try adjusting the date range or check if there are records in the database</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Combine Reports Modal */}
      {showCombineModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div 
            className="rounded-xl shadow-2xl max-w-md w-full mx-4 border-2"
            style={{ 
              backgroundColor: theme.bg.card,
              borderColor: theme.colors.success,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(34, 197, 94, 0.2)'
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.default }}>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                  Combine Reports
                </h3>
                <p className="text-sm mt-1" style={{ color: theme.text.secondary }}>
                  Select report types to download as a single PDF
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
                      <span className="text-sm flex items-center gap-2" style={{ color: theme.text.secondary }}>
                        <span>{type.icon}</span>
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

export default CombinedReports;
