"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTheme } from './ThemeContext';
import { useNotification } from './NotificationContext';
import { toast } from 'react-toastify';

// Use environment-based API base URL
const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enguio.shop/backend/Api'}/backend.php`;

function StockInReport() {
  const { theme } = useTheme();
  const { markNotificationAsViewed } = useNotification();
  const [stockInData, setStockInData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Start from 30 days ago
    endDate: new Date().toISOString().split('T')[0]
  });
  // Removed modal states and functions

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

  const fetchAllStockInData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the dedicated stock in report API with proper date filtering
      const result = await handleApiCall('get_report_data', {
        report_type: 'stock_in',
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      });
      
      // Debug: Log all data first
      // The API already filters by date range, so we can use the data directly
      let stockInData = result.data || [];
      
      // Debug: Log the structure of first few items to understand the data
      if (stockInData.length > 0) {
      }
      
      // CRITICAL: Remove duplicates based on movement_id to prevent same transaction showing multiple times
      // But handle cases where movement_id might be undefined
      const seenMovementIds = new Set();
      const seenEntries = new Set(); // Track entries by multiple fields for undefined movement_id cases
      
      stockInData = stockInData.filter(item => {
        const movementId = item.movement_id || item.id;
        
        // If movement_id exists, use it for deduplication
        if (movementId && movementId !== 'undefined') {
          if (seenMovementIds.has(movementId)) {
            return false; // Skip this duplicate entry
          }
          seenMovementIds.add(movementId);
          return true;
        }
        
        // For entries without movement_id, create a unique key based on multiple fields
        const uniqueKey = `${item.product_name || ''}_${item.barcode || ''}_${item.date || ''}_${item.time || ''}_${item.quantity || ''}`;
        
        if (seenEntries.has(uniqueKey)) {
          return false;
        }
        
        seenEntries.add(uniqueKey);
        return true;
      });
      
      setStockInData(stockInData);
      setError(null);
    } catch (error) {
      console.error('Error fetching stock-in data:', error);
      setStockInData([]);
      
      // Set user-friendly error message
      if (error.message === 'Network Error' || error.message.includes('fetch')) {
        setError('Network Error: Please check if XAMPP services (Apache & MySQL) are running');
      } else if (error.message.includes('timeout')) {
        setError('Request timeout: Server may be slow, please try again');
      } else {
        setError(`Failed to load stock-in data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Removed combineReports function

  const generateCombinedPDF = async (reportTypes) => {
    try {
      // Check if we have data
      if (stockInData.length === 0) {
        console.warn('⚠️ No stock-in data available for PDF generation');
        toast.warn('No data available to generate PDF. Please ensure you have stock-in data for the selected date range.', {
          position: "top-right",
          autoClose: 4000,
        });
        return;
      }
      
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
      
      // Generate report data table HTML
      const generateReportDataTable = () => {
        if (stockInData.length === 0) {
          return '<div style="text-align: center; padding: 20px; color: #666;">No stock-in data found for the selected date range</div>';
        }

        let tableHTML = `
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Barcode</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Product Name</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Date</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Time</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: center;">Quantity</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Unit Price</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Total Value</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Batch Number</th>
              </tr>
            </thead>
            <tbody>
        `;

        stockInData.forEach((row, index) => {
          const barcode = row.barcode || row.product_id || 'N/A';
          const productName = row.product_name || 'Generic Product';
          const date = row.date ? new Date(row.date).toLocaleDateString('en-PH') : 'N/A';
          const time = row.time ? new Date(`2000-01-01T${row.time}`).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
          const quantity = row.quantity || '0';
          const unitPrice = row.unit_price || row.price || '0.00';
          const totalValue = (parseFloat(unitPrice) * parseInt(quantity)).toFixed(2);
          const batchNumber = row.batch_number || row.batch_id || row.reference_no || 'N/A';

          tableHTML += `
            <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
              <td style="border: 1px solid #000; padding: 6px;">${barcode}</td>
              <td style="border: 1px solid #000; padding: 6px;">${productName}</td>
              <td style="border: 1px solid #000; padding: 6px;">${date}</td>
              <td style="border: 1px solid #000; padding: 6px;">${time}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">+${quantity}</td>
              <td style="border: 1px solid #000; padding: 6px;">₱${unitPrice}</td>
              <td style="border: 1px solid #000; padding: 6px;">₱${totalValue}</td>
              <td style="border: 1px solid #000; padding: 6px;">${batchNumber}</td>
            </tr>
          `;
        });

        tableHTML += '</tbody></table>';
        return tableHTML;
      };

      // Generate summary statistics
      const totalItems = stockInData.length;
      const totalQuantity = stockInData.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
      const uniqueProducts = new Set(stockInData.map(item => item.product_name).filter(Boolean)).size;
      const approvedAdjustments = stockInData.filter(item => item.status === 'Approved').length;

      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: #f8fafc; border: 2px solid #000000;">
          <div style="font-size: 24px; font-weight: bold; color: #000000; margin-bottom: 5px;">ENGUIO PHARMACY SYSTEM</div>
          <div style="font-size: 14px; color: #000000;">Stock In Report</div>
        </div>
        
        <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #000000;">
          <div style="font-size: 20px; font-weight: bold; color: #000000; margin-bottom: 10px;">Stock In Report</div>
          <div style="font-size: 12px; color: #000000; margin: 2px 0;">Generated on: ${new Date().toLocaleDateString('en-PH')} at ${new Date().toLocaleTimeString('en-PH')}</div>
          <div style="font-size: 12px; color: #000000; margin: 2px 0;">Generated by: Admin</div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #f1f5f9; border-left: 4px solid #000000;">
          <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Report Information</div>
          <div style="display: table; width: 100%;">
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">Report Type:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">Stock In Reports</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">Date Range:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">ALL AVAILABLE DATA</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">File Format:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">PDF Document</div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 20px; padding: 15px; background: #f0fdf4; border-left: 4px solid #22c55e;">
          <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Summary Statistics</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
            <div style="display: table; width: 100%;">
              <div style="display: table-row;">
                <div style="display: table-cell; font-weight: bold; color: #000000; padding: 2px 10px 2px 0; width: 50%;">Total Stock-In Items:</div>
                <div style="display: table-cell; color: #000000; padding: 2px 0;">${totalItems}</div>
              </div>
              <div style="display: table-row;">
                <div style="display: table-cell; font-weight: bold; color: #000000; padding: 2px 10px 2px 0; width: 50%;">Total Quantity:</div>
                <div style="display: table-cell; color: #000000; padding: 2px 0;">${totalQuantity.toLocaleString()}</div>
              </div>
            </div>
            <div style="display: table; width: 100%;">
              <div style="display: table-row;">
                <div style="display: table-cell; font-weight: bold; color: #000000; padding: 2px 10px 2px 0; width: 50%;">Unique Products:</div>
                <div style="display: table-cell; color: #000000; padding: 2px 0;">${uniqueProducts}</div>
              </div>
              <div style="display: table-row;">
                <div style="display: table-cell; font-weight: bold; color: #000000; padding: 2px 10px 2px 0; width: 50%;">Approved Adjustments:</div>
                <div style="display: table-cell; color: #000000; padding: 2px 0;">${approvedAdjustments}</div>
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <div style="font-size: 16px; font-weight: bold; color: #000000; margin-bottom: 10px;">Stock In Details</div>
          ${generateReportDataTable()}
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
      const fileName = `Stock_In_Report_${dateRange.startDate}_to_${dateRange.endDate}.pdf`;
      try {
        pdf.save(fileName);
        toast.success('PDF downloaded successfully! Check your Downloads folder.', {
          position: "top-right",
          autoClose: 3000,
        });
      } catch (saveError) {
        console.error('❌ PDF save failed:', saveError);
        
        // Try alternative method
        try {
          const pdfBlob = pdf.output('blob');
          const url = URL.createObjectURL(pdfBlob);
          
          const downloadLink = document.createElement('a');
          downloadLink.href = url;
          downloadLink.download = fileName;
          downloadLink.style.display = 'none';
          
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          toast.success('PDF downloaded successfully via alternative method! Check your Downloads folder.', {
            position: "top-right",
            autoClose: 3000,
          });
        } catch (altError) {
          console.error('❌ Alternative save method also failed:', altError);
          throw new Error('Both PDF save methods failed: ' + altError.message);
        }
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

  // Removed handleReportTypeChange and openCombineModal functions

  useEffect(() => {
    fetchAllStockInData();
    
    // Auto-clear Stock In Report notification when viewed
    markNotificationAsViewed('reports', 'Stock In Report');

    // Auto-refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      fetchAllStockInData();
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [dateRange]);

  const formatCell = (row, column) => {
    const columnKey = column.toLowerCase().replace(/\s+/g, '_');
    
    switch (columnKey) {
      case 'date':
        return row.date ? new Date(row.date).toLocaleDateString('en-PH') : 'N/A';
      case 'time':
        return row.time ? new Date(`2000-01-01T${row.time}`).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      case 'quantity':
        return (
          <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.successBg, color: theme.colors.success }}>
            +{row.quantity || '0'}
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
      case 'product_name':
        return row.product_name || 'N/A';
      case 'product_id':
        return row.barcode || row.product_id || 'No ID';
      case 'reason':
        // Use the new API response structure for reason
        const reason = row['reason'] || '';
        const notes = row['notes'] || '';
        
        // Use reason field first, then fallback to notes
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
        // Use the new API response structure for adjusted_by information
        const adjustedBy = row['adjusted_by'] || '';
        const adjustedByDetailed = row['adjusted_by_detailed'] || '';
        const createdBy = row['created_by'] || '';
        const receivedBy = row['received_by'] || '';
        
        // Use the detailed version if available, otherwise use the simple version
        const displayName = adjustedByDetailed || adjustedBy || receivedBy;
        
        if (displayName && displayName.trim() !== '') {
          // Add appropriate emoji based on the type
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
        
        // Fallback to created_by mapping
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
        
        // Final fallback
        if (createdBy && createdBy.trim() !== '') {
          return `👤 ${createdBy.trim()}`;
        }
        
        return '👤 Unknown User';
      case 'batch_number':
        return row.batch_number || row.batch_id || row.reference_no || 'N/A';
      default:
        return row[columnKey] || 'N/A';
    }
  };

  // Updated columns to match stock adjustment data structure
  const columns = ['Barcode', 'Product Name', 'Date', 'Time', 'Quantity', 'Unit Price', 'Total Value', 'Batch Number'];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-3" style={{ backgroundColor: theme.bg.card }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <span className="text-2xl">📦</span>
              <div>
                <h1 className="text-xl font-bold" style={{ color: theme.text.primary }}>Stock In Report</h1>
                <p className="text-sm" style={{ color: theme.text.secondary }}>Stock-In Adjustments from Inventory System</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  await generateCombinedPDF(['stock_in']);
                } catch (error) {
                  console.error('Error generating PDF:', error);
                  toast.error('Error generating PDF: ' + error.message, {
                    position: "top-right",
                    autoClose: 4000,
                  });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || stockInData.length === 0}
              className="px-3 py-1 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center gap-2 text-sm"
              style={{
                backgroundColor: theme.bg.hover,
                color: theme.text.primary,
                border: `1px solid ${theme.border.default}`
              }}
            >
              📥 Download Report
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

        {/* Summary Cards */}
        {stockInData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">📦</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Stock-In Items</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{stockInData.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">📊</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Quantity</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {stockInData.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">👥</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Unique Products</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {new Set(stockInData.map(item => item.product_name).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">✅</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Approved Adjustments</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {stockInData.filter(item => item.status === 'Approved').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stock-In Data Display */}
        <div
          className="rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          style={{
            backgroundColor: theme.bg.card,
            boxShadow: `0 10px 25px ${theme.shadow.lg}`
          }}
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
              Stock-In Products - {dateRange.startDate} to {dateRange.endDate}
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.accent }}></div>
                <span className="ml-2" style={{ color: theme.text.secondary }}>Loading stock-in data...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-lg font-medium mb-2" style={{ color: theme.colors.danger }}>Error Loading Data</p>
                <p className="mb-4" style={{ color: theme.text.secondary }}>{error}</p>
                <button
                  onClick={() => fetchAllStockInData()}
                  className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: theme.colors.accent,
                    color: theme.text.primary
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : stockInData.length > 0 ? (
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
                    {stockInData.map((row, index) => (
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
                <div className="text-4xl mb-4">📦</div>
                <p>No stock-in data found for the selected date range</p>
                <p className="text-sm mt-2">Try adjusting the date range or check if there are stock-in records in the database</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

export default StockInReport;
