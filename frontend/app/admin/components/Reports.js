
"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import { useTheme } from './ThemeContext';
import { useNotification } from './NotificationContext';

// Use environment-based API base URL
const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enguio.shop/backend/Api'}/backend.php`;

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
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  });
  // Removed unused modal states and viewMode
  const itemsPerPage = 12;

  const reportTypes = [
    { id: 'all', name: 'All Reports', icon: '📊' },
    { id: 'stock_in', name: 'Stock In Report', icon: '📦' },
    { id: 'stock_out', name: 'Stock Out Report', icon: '📤' },
    { id: 'sales', name: 'Sales Report', icon: '💰' },
    { id: 'inventory_balance', name: 'Inventory Balance Report', icon: '📋' },
    { id: 'supplier', name: 'Supplier Report', icon: '🏢' },
    { id: 'cashier_performance', name: 'Cashier Performance Report', icon: '👤' },
    { id: 'login_logs', name: 'Login Logs Report', icon: '🔐' },
    { id: 'stock_adjustment', name: 'Stock Adjustment Report', icon: '⚖️' }
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
        console.warn('⚠️ No reports data or invalid response structure:', res.data);
        setReports([]);
      }
    } catch (error) {
      console.error('❌ Error fetching reports:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
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

  // Removed unused functions: generateIndividualReport, openGenerateModal, combineIndividualReports

  const generateCombinedPDF = async (reportTypes, dateRange) => {
    try {
      // Validate API URL
      if (!API_BASE_URL || API_BASE_URL.includes('undefined')) {
        throw new Error('API URL is not properly configured. Please check your environment settings.');
      }
      
      // Check if jsPDF is available
      if (typeof jsPDF === 'undefined') {
        throw new Error('PDF library not loaded. Please refresh the page and try again.');
      }
      // Fetch data for all selected report types
      const allReportsData = {};
      let hasAnyData = false;
      
      console.log('📅 Date range being used for PDF:', {
        start: dateRange.startDate,
        end: dateRange.endDate
      });
      
      for (const reportType of reportTypes) {
        try {
          console.log(`📊 Fetching ${reportType} with date range: ${dateRange.startDate} to ${dateRange.endDate}`);
          
          const res = await axios.post(API_BASE_URL, {
            action: 'get_report_data',
            report_type: reportType,
            start_date: dateRange.startDate,
            end_date: dateRange.endDate
          }, {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
            }
          });
          if (res.data?.success) {
            allReportsData[reportType] = res.data.data || [];
            
            console.log(`✅ Fetched ${allReportsData[reportType].length} records for ${reportType}`);
            if (allReportsData[reportType].length > 0) {
              // Log first record's date to verify filtering
              console.log(`   First record date: ${allReportsData[reportType][0].date || allReportsData[reportType][0].movement_date || 'N/A'}`);
            }
            
            if (allReportsData[reportType].length > 0) {
              hasAnyData = true;
            }
          } else {
            allReportsData[reportType] = [];
            console.warn(`⚠️ No data for ${reportType}:`, res.data?.message);
            console.warn(`⚠️ Full response for ${reportType}:`, res.data);
          }
        } catch (error) {
          console.error(`❌ Error fetching ${reportType}:`, error);
          allReportsData[reportType] = [];
          
          if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
            throw new Error(`Cannot connect to server. Please ensure XAMPP services (Apache & MySQL) are running.`);
          }
        }
      }
      
      // Check if we have any data to generate PDF
      if (!hasAnyData) {
        throw new Error('No data found for the selected date range and report types. Please try a different date range or check if there are any reports available.');
      }
      // Create PDF with autoTable plugin
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Header
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('ENGUIO PHARMACY SYSTEM', 20, 20);
      
      pdf.setFontSize(12);
      pdf.text('Combined Reports', 20, 30);
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Date Range: ${dateRange.startDate} to ${dateRange.endDate}`, 20, 40);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-PH')} at ${new Date().toLocaleTimeString('en-PH')}`, 20, 45);
      pdf.text(`Generated by: Admin`, 20, 50);
      
      // Add comprehensive summary
      let yPosition = 60;
      
      // Summary section
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('📊 COMPREHENSIVE REPORT SUMMARY', 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      
      // Calculate totals across all reports
      let totalRecords = 0;
      let totalValue = 0;
      let reportsWithData = 0;
      
      for (const reportType of reportTypes) {
        const data = allReportsData[reportType] || [];
        if (data.length > 0) {
          reportsWithData++;
          totalRecords += data.length;
          
          // Calculate value for reports that have monetary data
          if (reportType === 'stock_in' || reportType === 'stock_out' || reportType === 'sales') {
            const reportValue = data.reduce((sum, item) => {
              return sum + (parseFloat(item.total_value || item.total_amount || 0) || 0);
            }, 0);
            totalValue += reportValue;
          }
        }
      }
      
      pdf.text(`📈 Total Reports Generated: ${reportsWithData}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`📊 Total Records: ${totalRecords.toLocaleString()}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`💰 Total Value: ₱${totalValue.toFixed(2)}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`📅 Report Period: ${dateRange.startDate} to ${dateRange.endDate}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`⏰ Generated: ${new Date().toLocaleDateString('en-PH')} at ${new Date().toLocaleTimeString('en-PH')}`, 20, yPosition);
      yPosition += 15;
      
      // Get report type definitions - ALL AVAILABLE REPORTS
      const reportTypesList = [
        { id: 'stock_in', name: 'Stock In Report', icon: '📦' },
        { id: 'stock_out', name: 'Stock Out Report', icon: '📤' },
        { id: 'sales', name: 'Sales Report', icon: '💰' },
        { id: 'inventory_balance', name: 'Inventory Balance Report', icon: '📋' },
        { id: 'cashier_performance', name: 'Cashier Performance Report', icon: '👤' },
        { id: 'login_logs', name: 'Login Logs Report', icon: '🔐' },
        { id: 'stock_adjustment', name: 'Stock Adjustment Report', icon: '⚖️' }
      ];
      // Add each report's data
      for (const reportType of reportTypes) {
        const data = allReportsData[reportType] || [];
        const reportInfo = reportTypesList.find(t => t.id === reportType);
        const reportName = reportInfo?.name || reportType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
          pdf.text(`No data available for ${reportName} in the selected date range.`, 20, yPosition);
          yPosition += 15;
        } else {
          // Add report-specific summary
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'bold');
          pdf.text(`📊 ${data.length} records found`, 20, yPosition);
          yPosition += 5;
          
          // Add specific summaries based on report type
          if (reportType === 'stock_in' && data.length > 0) {
            const totalQty = data.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
            const totalValue = data.reduce((sum, item) => sum + (parseFloat(item.total_value) || 0), 0);
            pdf.text(`📦 Total Quantity: ${totalQty.toLocaleString()} | 💰 Total Value: ₱${totalValue.toFixed(2)}`, 20, yPosition);
            yPosition += 5;
          } else if (reportType === 'sales' && data.length > 0) {
            const totalSales = data.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
            const totalItems = data.reduce((sum, item) => sum + (parseInt(item.items_sold) || 0), 0);
            pdf.text(`💰 Total Sales: ₱${totalSales.toFixed(2)} | 📦 Total Items Sold: ${totalItems.toLocaleString()}`, 20, yPosition);
            yPosition += 5;
          } else if (reportType === 'cashier_performance' && data.length > 0) {
            const totalTransactions = data.reduce((sum, item) => sum + (parseInt(item.transactions_count) || 0), 0);
            const totalSales = data.reduce((sum, item) => sum + (parseFloat(item.total_sales) || 0), 0);
            pdf.text(`👤 Total Transactions: ${totalTransactions.toLocaleString()} | 💰 Total Sales: ₱${totalSales.toFixed(2)}`, 20, yPosition);
            yPosition += 5;
          }
          
          // Get columns for this report type
          const columns = getReportColumns(reportType);
          
          // Limit data for PDF size but show more for comprehensive report
          const limitedData = data.slice(0, 30);
          
          // Prepare table data
          const tableData = limitedData.map(row => {
            return columns.map(column => {
              const columnKey = column.toLowerCase().replace(/\s+/g, '_');
              
              // Map display column names to backend field names
              const fieldMapping = {
                'supplier': 'supplier_name',
                'product_name': 'product_name',
                'reference_no': 'reference_no',
                'received_by': 'received_by',
                'adjusted_by': 'adjusted_by',
                'previous_quantity': 'previous_quantity',
                'new_quantity': 'new_quantity'
              };
              
              // Get the actual field name from the backend
              const actualField = fieldMapping[columnKey] || columnKey;
              let cellValue = row[actualField] || row[columnKey] || 'N/A';
              
              // Format values
              if (columnKey.includes('total_value') || columnKey.includes('total_amount') || columnKey.includes('unit_price') || columnKey.includes('average_transaction')) {
                cellValue = `₱${parseFloat(cellValue || 0).toFixed(2)}`;
              } else if (columnKey === 'date' && cellValue !== 'N/A') {
                cellValue = new Date(cellValue).toLocaleDateString('en-PH');
              } else if (columnKey === 'time' && cellValue !== 'N/A') {
                try {
                  cellValue = new Date(`2000-01-01T${cellValue}`).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
                } catch (e) {
                  // Keep original if parsing fails
                }
              }
              
              return cellValue.toString().substring(0, 25); // Limit cell content length
            });
          });
          
          // Add table using autoTable (with fallback)
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
              tableWidth: 'auto',
              columnStyles: {
                // Make certain columns narrower
                0: { cellWidth: 20 },
                1: { cellWidth: 20 },
                2: { cellWidth: 30 },
                3: { cellWidth: 20 },
                4: { cellWidth: 15 },
                5: { cellWidth: 20 },
                6: { cellWidth: 25 },
                7: { cellWidth: 20 },
                8: { cellWidth: 20 },
                9: { cellWidth: 20 },
                10: { cellWidth: 20 }
              }
            });
            
            // Get the final Y position after the table
            yPosition = pdf.lastAutoTable.finalY + 10;
          } catch (autoTableError) {
            console.warn('AutoTable failed, using fallback method:', autoTableError);
            
            // Fallback: Simple text-based table
            pdf.setFontSize(8);
            pdf.setFont(undefined, 'bold');
            
            // Add header
            let xPos = 20;
            const colWidth = 15;
            columns.forEach((column, colIndex) => {
              pdf.text(column.substring(0, 12), xPos, yPosition);
              xPos += colWidth;
            });
            yPosition += 8;
            
            // Add data rows
            pdf.setFont(undefined, 'normal');
            limitedData.forEach((row, rowIndex) => {
              xPos = 20;
              columns.forEach((column, colIndex) => {
                const columnKey = column.toLowerCase().replace(/\s+/g, '_');
                let cellValue = row[columnKey] || 'N/A';
                
                // Format values
                if (columnKey.includes('total_value') || columnKey.includes('total_amount') || columnKey.includes('unit_price') || columnKey.includes('average_transaction')) {
                  cellValue = `₱${parseFloat(cellValue || 0).toFixed(2)}`;
                } else if (columnKey === 'date' && cellValue !== 'N/A') {
                  cellValue = new Date(cellValue).toLocaleDateString('en-PH');
                }
                
                pdf.text(cellValue.toString().substring(0, 12), xPos, yPosition);
                xPos += colWidth;
              });
              yPosition += 6;
              
              // Check if we need a new page
              if (yPosition > 280) {
                pdf.addPage();
                yPosition = 20;
              }
            });
            
            yPosition += 10;
          }
          
          if (data.length > 30) {
            pdf.setFontSize(8);
            pdf.setFont(undefined, 'normal');
            pdf.text(`Showing 30 of ${data.length} records`, 20, yPosition);
            yPosition += 10;
          }
          
          // Add summary for stock_in report
          if (reportType === 'stock_in' && data.length > 0) {
            const totalQty = data.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
            const totalValue = data.reduce((sum, item) => sum + (parseFloat(item.total_value) || 0), 0);
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'bold');
            pdf.text(`Summary: Total Items: ${data.length} | Total Quantity: ${totalQty.toLocaleString()} | Total Value: ₱${totalValue.toFixed(2)}`, 20, yPosition);
            yPosition += 15;
          }
        }
      }
      
      // Save PDF
      const fileName = `Combined_Reports_${dateRange.startDate}_to_${dateRange.endDate}.pdf`;
      // Simple save method
      try {
        pdf.save(fileName);
        // Show success message
        toast.success(`📥 PDF downloaded successfully: ${fileName}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } catch (saveError) {
        console.error('❌ Error saving PDF:', saveError);
        throw new Error('Failed to save PDF file. Please check your browser settings and try again.');
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

  // Removed unused functions: openCombineModal, combineIndividualReports, testStockOutReport

  useEffect(() => {
    // Initial fetch
    fetchReports();
    
    // Auto-clear notifications when Reports component is viewed
    markNotificationAsViewed('reports');
    clearSystemUpdates();

    // Auto-refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      fetchReports();
    }, 10000);

    // Listen for PDF opened messages
    const handleMessage = (event) => {
      if (event.data.type === 'pdf-opened') {
        toast.info(`📄 ${event.data.message}`, {
          position: "top-right",
          autoClose: 6000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Check for actual system updates (check every 30 seconds)
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
          } else {
            // Clear updates if no real updates
            updateSystemUpdates(false, 0);
            updateReportsNotifications(false, 0, {});
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

    // Call immediately
    checkForRealUpdates();

    // Set up interval to check every 30 seconds
    const interval = setInterval(() => {
      checkForRealUpdates();
    }, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []); // Empty dependency array to run once on mount

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
      case 'cashier_performance':
        return ['Date', 'Cashier Name', 'Transactions Count', 'Total Sales', 'Average Transaction', 'Unique Products Sold'];
      case 'login_logs':
        return ['Date', 'Time', 'Username', 'Role', 'Action', 'Description'];
      case 'stock_adjustment':
        return ['Date', 'Time', 'Product Name', 'Barcode', 'Previous Quantity', 'New Quantity', 'Adjustment', 'Reason', 'Adjusted By', 'Reference No'];
      default:
        return [];
    }
  };

  const formatReportCell = (row, column, reportType) => {
    const columnKey = column.toLowerCase().replace(/\s+/g, '_');
    
    // Map display column names to backend field names
    const fieldMapping = {
      'supplier': 'supplier_name',
      'product_name': 'product_name',
      'reference_no': 'reference_no',
      'received_by': 'received_by',
      'adjusted_by': 'adjusted_by',
      'previous_quantity': 'previous_quantity',
      'new_quantity': 'new_quantity'
    };
    
    // Get the actual field name from the backend
    const actualField = fieldMapping[columnKey] || columnKey;
    
    switch (columnKey) {
      case 'total_value':
      case 'total_amount':
      case 'unit_price':
        return `₱${parseFloat(row[actualField] || 0).toFixed(2)}`;
      case 'date':
        return row[actualField] ? new Date(row[actualField]).toLocaleDateString('en-PH') : 'N/A';
      case 'time':
        return row[actualField] ? new Date(`2000-01-01T${row[actualField]}`).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      case 'quantity':
        if (reportType === 'stock_in') {
          return (
            <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.successBg, color: theme.colors.success }}>
              +{row[actualField] || '0'}
            </span>
          );
        }
        return row[actualField] || '0';
      case 'current_stock':
      case 'items_sold':
      case 'transactions_count':
      case 'unique_products_sold':
      case 'products_supplied':
      case 'total_stock':
      case 'deliveries_count':
        return row[actualField] || '0';
      case 'average_transaction':
        return `₱${parseFloat(row[actualField] || 0).toFixed(2)}`;
      case 'status':
        const status = row[actualField];
        if (status === 'Low Stock') return '⚠️ Low Stock';
        if (status === 'Out of Stock') return '❌ Out of Stock';
        if (status === 'In Stock') return '✅ In Stock';
        return status || 'N/A';
      default:
        return row[actualField] || row[columnKey] || 'N/A';
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-3" style={{ backgroundColor: theme.bg.card }}>
        <div className="flex items-center space-x-4">
          <span className="text-2xl">📊</span>
          <div>
            <h1 className="text-xl font-bold" style={{ color: theme.text.primary }}>Reports Dashboard</h1>
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              Individual Report Management
            </p>
          </div>
        </div>
      </div>

      <>
      {/* Reports Content */}
      <div className="p-6">
        {/* Quick Download All Reports Button */}
        <div className="mb-6">
          <div className="flex justify-center gap-4">
            <button
              onClick={async () => {
                try {
                  setReportDataLoading(true);
                  
                  // Set to current month and download all reports
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  
                  // Show loading toast
                  toast.info('📄 Generating PDF... Please wait.', {
                    position: "top-right",
                    autoClose: 3000,
                  });
                  
                  // Call the download function directly
                  await generateCombinedPDF([
                    'stock_in', 
                    'stock_out', 
                    'sales', 
                    'inventory_balance', 
                    'supplier', 
                    'cashier_performance', 
                    'login_logs',
                    'stock_adjustment'
                  ], {
                    startDate: firstDay.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                  });
                  
                } catch (error) {
                  console.error('Error downloading reports:', error);
                  toast.error(`Failed to download: ${error.message}`, {
                    position: "top-right",
                    autoClose: 5000,
                  });
                } finally {
                  setReportDataLoading(false);
                }
              }}
              disabled={reportDataLoading}
              className="px-8 py-4 rounded-lg font-bold text-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center gap-3 shadow-lg"
              style={{
                backgroundColor: theme.colors.accent,
                color: theme.text.primary,
                boxShadow: `0 10px 25px ${theme.shadow.lg}`
              }}
            >
              📥 Download All Reports (This Month)
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
              style={{
                backgroundColor: theme.bg.hover,
                color: theme.text.secondary,
                border: `1px solid ${theme.border.default}`
              }}
            >
              🔄 Refresh Page
            </button>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {reportTypes.map((type) => (
              <div
                key={type.id}
                className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-lg ${
                  selectedReportType === type.id ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  backgroundColor: selectedReportType === type.id ? theme.colors.accent : theme.bg.card,
                  borderColor: theme.border.default,
                  boxShadow: `0 4px 12px ${theme.shadow.lg}`
                }}
              >
                <button
                  onClick={() => setSelectedReportType(type.id)}
                  className="w-full text-left"
                >
                  <div className="text-3xl mb-2">{type.icon}</div>
                  <div className="text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                    {type.name}
                  </div>
                </button>
                
                {/* Individual Action Buttons */}
                {type.id !== 'all' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        // Directly generate the report
                        generateReport(type.id);
                      }}
                      disabled={reportDataLoading}
                      className="w-full px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                      style={{
                        backgroundColor: theme.colors.accent,
                        color: theme.text.primary,
                        border: `1px solid ${theme.border.default}`
                      }}
                    >
                      📊 Generate Report
                    </button>
                  </div>
                )}
              </div>
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
                boxShadow: `0 10px 25px ${theme.shadow.lg}`
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
              boxShadow: `0 10px 25px ${theme.shadow.lg}`
            }}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Generated Reports</h3>

              {reportsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.accent }}></div>
                  <span className="ml-2" style={{ color: theme.text.secondary }}>Loading reports...</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: theme.text.primary }}>No Reports Found</h3>
                  <p className="mb-4" style={{ color: theme.text.secondary }}>
                    There are no generated reports available yet. Reports are automatically created from stock movements and transfers.
                  </p>
                  <div className="text-sm" style={{ color: theme.text.muted }}>
                    <p>💡 Tips:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Stock movements create reports automatically</li>
                      <li>Transfer operations generate transfer reports</li>
                      <li>Use the report type buttons above to generate specific reports</li>
                    </ul>
                  </div>
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
              boxShadow: `0 10px 25px ${theme.shadow.lg}`
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
                      <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
                        <div className="flex items-center">
                          <div className="text-3xl mr-3">📦</div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Items</p>
                            <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{reportData.length}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
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
                      <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
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
                      <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
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
                  <p>Click &ldquo;Generate Report&rdquo; to view {reportTypes.find(t => t.id === selectedReportType)?.name.toLowerCase()}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </>
    </div>
  );
}

export default Reports;
