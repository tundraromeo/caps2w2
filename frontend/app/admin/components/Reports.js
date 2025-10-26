
"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import { useTheme } from './ThemeContext';
import { useNotification } from './NotificationContext';
import CombinedReports from './CombinedReports';

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
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedGenerateReportType, setSelectedGenerateReportType] = useState('');
  const [generateDateRange, setGenerateDateRange] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  });
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [selectedCombineReportType, setSelectedCombineReportType] = useState('');
  const [selectedReportTypes, setSelectedReportTypes] = useState(['all']);
  const [combineDateRange, setCombineDateRange] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  });
  const [viewMode, setViewMode] = useState('individual'); // 'individual' or 'combined'
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
      console.log('📊 Fetching reports from:', API_BASE_URL);
      
      const res = await axios.post(API_BASE_URL, { action: 'get_reports_data' });
      console.log('📊 Reports API Response:', res.data);
      
      if (res.data?.success && Array.isArray(res.data.reports)) {
        console.log('✅ Reports fetched successfully:', res.data.reports.length, 'reports');
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
      
      console.log('📊 Fetching report data with date range:', {
        reportType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
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

  const generateIndividualReport = async (reportType) => {
    try {
      setReportDataLoading(true);
      const res = await axios.post(API_BASE_URL, {
        action: 'generate_report',
        report_type: reportType,
        generated_by: 'Admin',
        parameters: {
          start_date: generateDateRange.startDate,
          end_date: generateDateRange.endDate
        }
      });
      
      if (res.data?.success) {
        // Refresh reports list
        fetchReports();
        // Close modal
        setShowGenerateModal(false);
        // Show success notification
        console.log(`${reportTypes.find(t => t.id === reportType)?.name} generated successfully!`);
      }
    } catch (error) {
      console.error('Error generating individual report:', error);
    } finally {
      setReportDataLoading(false);
    }
  };

  const openGenerateModal = (reportType) => {
    setSelectedGenerateReportType(reportType);
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setGenerateDateRange({
      startDate: firstDay.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
    setShowGenerateModal(true);
  };

  const combineIndividualReports = async () => {
    try {
      console.log('🎯 Download button clicked!');
      console.log('🎯 Current state:', {
        reportDataLoading,
        selectedReportTypes,
        combineDateRange,
        API_BASE_URL
      });
      
      setReportDataLoading(true);
      setReportError(null);
      
      // Validate date range
      if (!combineDateRange.startDate || !combineDateRange.endDate) {
        throw new Error('Please select both start and end dates.');
      }
      
      if (new Date(combineDateRange.startDate) > new Date(combineDateRange.endDate)) {
        throw new Error('Start date cannot be later than end date.');
      }
      
      // Convert selected report types to API format
      let reportTypesToCombine = selectedReportTypes;
      if (selectedReportTypes.includes('all')) {
        // Include ALL available report types for comprehensive reporting
        reportTypesToCombine = [
          'stock_in', 
          'stock_out', 
          'sales', 
          'inventory_balance', 
          'supplier', 
          'cashier_performance', 
          'login_logs',
          'stock_adjustment'
        ];
      }
      
      // Validate that at least one report type is selected
      if (reportTypesToCombine.length === 0) {
        throw new Error('Please select at least one report type to combine.');
      }
      
      console.log('🚀 Starting PDF generation for:', reportTypesToCombine);
      console.log('🚀 Original selectedReportTypes:', selectedReportTypes);
      console.log('🚀 Date range:', combineDateRange);
      console.log('🚀 API URL:', API_BASE_URL);
      
      // Show loading toast
      toast.info('📄 Generating PDF... Please wait.', {
        position: "top-right",
        autoClose: 3000,
      });
      
      // Generate PDF directly
      await generateCombinedPDF(reportTypesToCombine);
      
      console.log('✅ PDF generation completed successfully');
      
      // Close modal
      setShowCombineModal(false);
      
    } catch (error) {
      console.error('❌ Error combining reports:', error);
      console.error('❌ Error stack:', error.stack);
      
      let errorMessage = 'Failed to generate PDF. Please try again.';
      
      // Provide specific error messages based on error type
      if (error.message.includes('Network Error') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to server. Please ensure XAMPP services (Apache & MySQL) are running.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout. The server may be slow. Please try again.';
      } else if (error.message.includes('No data found')) {
        errorMessage = 'No data found for the selected date range. Please try a different date range.';
      } else if (error.message.includes('API URL')) {
        errorMessage = 'Configuration error. Please refresh the page and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setReportError(errorMessage);
      
      // Show user-friendly error message
      toast.error(`❌ PDF Generation Failed: ${errorMessage}`, {
        position: "top-right",
        autoClose: 8000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      console.log('🏁 Setting loading to false');
      setReportDataLoading(false);
    }
  };

  const generateCombinedPDF = async (reportTypes) => {
    try {
      console.log('📄 Generating combined PDF for:', reportTypes);
      console.log('📄 API URL being used:', API_BASE_URL);
      
      // Validate API URL
      if (!API_BASE_URL || API_BASE_URL.includes('undefined')) {
        throw new Error('API URL is not properly configured. Please check your environment settings.');
      }
      
      // Check if jsPDF is available
      if (typeof jsPDF === 'undefined') {
        throw new Error('PDF library not loaded. Please refresh the page and try again.');
      }
      
      console.log('✅ API URL validation passed');
      
      // Fetch data for all selected report types
      const allReportsData = {};
      let hasAnyData = false;
      
      for (const reportType of reportTypes) {
        try {
          console.log(`📊 Fetching data for ${reportType}...`);
          const res = await axios.post(API_BASE_URL, {
            action: 'get_report_data',
            report_type: reportType,
            start_date: combineDateRange.startDate,
            end_date: combineDateRange.endDate
          }, {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (res.data?.success) {
            allReportsData[reportType] = res.data.data || [];
            console.log(`✅ Fetched ${allReportsData[reportType].length} records for ${reportType}`);
            console.log(`📊 Sample data for ${reportType}:`, allReportsData[reportType].length > 0 ? allReportsData[reportType][0] : 'No data');
            
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
      
      console.log('📄 Creating PDF document...');
      
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
      pdf.text(`Date Range: ${combineDateRange.startDate} to ${combineDateRange.endDate}`, 20, 40);
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
      pdf.text(`📅 Report Period: ${combineDateRange.startDate} to ${combineDateRange.endDate}`, 20, yPosition);
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
        
        console.log(`📊 Processing ${reportType}:`, {
          reportName,
          dataLength: data.length,
          hasData: data.length > 0,
          sampleData: data.length > 0 ? data[0] : null
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
              let cellValue = row[columnKey] || 'N/A';
              
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
      const fileName = `Combined_Reports_${combineDateRange.startDate}_to_${combineDateRange.endDate}.pdf`;
      
      console.log('💾 Saving PDF:', fileName);
      console.log('📊 PDF document info:', {
        totalPages: pdf.internal.getNumberOfPages(),
        pageSize: pdf.internal.pageSize,
        version: pdf.internal.version
      });
      
      // Simple save method
      try {
        pdf.save(fileName);
        console.log(`✅ PDF downloaded successfully: ${fileName}`);
        
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

  const openCombineModal = (reportType) => {
    console.log('🔧 Opening combine modal for report type:', reportType);
    setSelectedCombineReportType(reportType);
    setSelectedReportTypes(['all']); // Reset to all reports selected
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setCombineDateRange({
      startDate: firstDay.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
    console.log('🔧 Set date range to:', {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
    setShowCombineModal(true);
  };

  const handleReportTypeChange = (reportTypeId) => {
    if (reportTypeId === 'all') {
      setSelectedReportTypes(['all']);
    } else {
      setSelectedReportTypes(prev => {
        const newSelection = prev.filter(id => id !== 'all');
        if (newSelection.includes(reportTypeId)) {
          return newSelection.filter(id => id !== reportTypeId);
        } else {
          return [...newSelection, reportTypeId];
        }
      });
    }
  };

  // Add test function to window for debugging
  window.testStockOutReport = async () => {
    try {
      console.log('🧪 Testing stock_out report directly...');
      const res = await axios.post(API_BASE_URL, {
        action: 'get_report_data',
        report_type: 'stock_out',
        start_date: combineDateRange.startDate,
        end_date: combineDateRange.endDate
      });
      console.log('🧪 Stock Out Report Response:', res.data);
      return res.data;
    } catch (error) {
      console.error('🧪 Stock Out Report Error:', error);
      return null;
    }
  };

  useEffect(() => {
    // Initial fetch
    console.log('🔧 Reports component loaded with report types:', reportTypes);
    console.log('🔧 Initial date range:', dateRange);
    console.log('🔧 Initial combine date range:', combineDateRange);
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
      {/* View Mode Toggle */}
      <div className="p-3" style={{ backgroundColor: theme.bg.card }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="text-xl font-bold" style={{ color: theme.text.primary }}>Reports Dashboard</h1>
              <p className="text-sm" style={{ color: theme.text.secondary }}>
                {viewMode === 'individual' ? 'Individual Report Management' : 'Unified Report View'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setViewMode(viewMode === 'individual' ? 'combined' : 'individual')}
              className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
              style={{
                backgroundColor: theme.colors.accent,
                color: theme.text.primary
              }}
            >
              {viewMode === 'individual' ? (
                <>
                  🔗 Switch to Combined View
                </>
              ) : (
                <>
                  📋 Switch to Individual View
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Conditional Rendering */}
      {viewMode === 'combined' ? (
        <CombinedReports />
      ) : (
        <>
          {/* Individual Reports Content */}
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
        {/* Quick Download All Reports Button */}
        <div className="mb-6">
          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                // Set to current month and open combine modal with all reports selected
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                setCombineDateRange({
                  startDate: firstDay.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                });
                setSelectedReportTypes(['all']);
                setShowCombineModal(true);
              }}
              disabled={reportDataLoading}
              className="px-8 py-4 rounded-lg font-bold text-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center gap-3 shadow-lg"
              style={{
                backgroundColor: theme.colors.accent,
                color: theme.text.primary,
                boxShadow: `0 10px 25px ${theme.shadow.lg}`
              }}
            >
              📊 Download All Reports (This Month)
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
                      onClick={() => openGenerateModal(type.id)}
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
                    <button
                      onClick={() => openCombineModal(type.id)}
                      disabled={reportDataLoading}
                      className="w-full px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                      style={{
                        backgroundColor: theme.bg.hover,
                        color: theme.text.secondary,
                        border: `1px solid ${theme.border.default}`
                      }}
                    >
                      📋 Combine Reports
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

      {/* Individual Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div 
            className="rounded-xl shadow-2xl max-w-md w-full mx-4 border-2"
            style={{ 
              backgroundColor: theme.bg.card,
              borderColor: theme.colors.accent,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.2)'
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.default }}>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                  Generate {reportTypes.find(t => t.id === selectedGenerateReportType)?.name}
                </h3>
                <p className="text-sm mt-1" style={{ color: theme.text.secondary }}>
                  Select date range to generate the report
                </p>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="transition-colors"
                style={{ color: theme.text.muted }}
                onMouseEnter={(e) => e.target.style.color = theme.text.secondary}
                onMouseLeave={(e) => e.target.style.color = theme.text.muted}
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
                    { label: 'This Month', days: 'this_month' },
                    { label: 'Last Month', days: 'last_month' }
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => {
                        const today = new Date();
                        
                        if (option.days === 0) {
                          // Today
                          const dateStr = today.toISOString().split('T')[0];
                          setGenerateDateRange({ startDate: dateStr, endDate: dateStr });
                        } else if (option.days === -1) {
                          // Yesterday
                          const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));
                          const dateStr = yesterday.toISOString().split('T')[0];
                          setGenerateDateRange({ startDate: dateStr, endDate: dateStr });
                        } else if (option.days === 'this_month') {
                          // This Month - from 1st of current month to today
                          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                          const lastDay = today;
                          setGenerateDateRange({ 
                            startDate: firstDay.toISOString().split('T')[0], 
                            endDate: lastDay.toISOString().split('T')[0] 
                          });
                        } else if (option.days === 'last_month') {
                          // Last Month - from 1st to last day of previous month
                          const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                          const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                          setGenerateDateRange({ 
                            startDate: firstDayLastMonth.toISOString().split('T')[0], 
                            endDate: lastDayLastMonth.toISOString().split('T')[0] 
                          });
                        } else {
                          // Other periods (weeks)
                          const targetDate = new Date(today.getTime() + (option.days * 24 * 60 * 60 * 1000));
                          const dateStr = targetDate.toISOString().split('T')[0];
                          setGenerateDateRange({ startDate: dateStr, endDate: today.toISOString().split('T')[0] });
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
                      value={generateDateRange.startDate}
                      onChange={(e) => setGenerateDateRange(prev => ({ ...prev, startDate: e.target.value }))}
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
                      value={generateDateRange.endDate}
                      onChange={(e) => setGenerateDateRange(prev => ({ ...prev, endDate: e.target.value }))}
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

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => generateIndividualReport(selectedGenerateReportType)}
                  disabled={reportDataLoading}
                  className="flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: theme.colors.accent,
                    color: theme.text.primary
                  }}
                >
                  {reportDataLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      📊 Generate Report
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowGenerateModal(false)}
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

      {/* Individual Combine Reports Modal */}
      {showCombineModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" key={`combine-modal-${Date.now()}`}>
          <div 
            className="rounded-xl shadow-2xl max-w-md w-full mx-4 border-2"
            style={{ 
              backgroundColor: theme.bg.card,
              borderColor: theme.colors.warning,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(147, 51, 234, 0.2)'
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.default }}>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                  📊 COMPREHENSIVE REPORTS DOWNLOAD v2.0
                </h3>
                <p className="text-sm mt-1" style={{ color: theme.text.secondary }}>
                  Download ALL 8 report types as a single comprehensive PDF file
                </p>
              </div>
              <button
                onClick={() => setShowCombineModal(false)}
                className="transition-colors"
                style={{ color: theme.text.muted }}
                onMouseEnter={(e) => e.target.style.color = theme.text.secondary}
                onMouseLeave={(e) => e.target.style.color = theme.text.muted}
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
                    { label: 'This Month', days: 'this_month' },
                    { label: 'Last Month', days: 'last_month' }
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => {
                        const today = new Date();
                        
                        if (option.days === 0) {
                          // Today
                          const dateStr = today.toISOString().split('T')[0];
                          setCombineDateRange({ startDate: dateStr, endDate: dateStr });
                        } else if (option.days === -1) {
                          // Yesterday
                          const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));
                          const dateStr = yesterday.toISOString().split('T')[0];
                          setCombineDateRange({ startDate: dateStr, endDate: dateStr });
                        } else if (option.days === 'this_month') {
                          // This Month - from 1st of current month to today
                          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                          const lastDay = today;
                          setCombineDateRange({ 
                            startDate: firstDay.toISOString().split('T')[0], 
                            endDate: lastDay.toISOString().split('T')[0] 
                          });
                        } else if (option.days === 'last_month') {
                          // Last Month - from 1st to last day of previous month
                          const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                          const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                          setCombineDateRange({ 
                            startDate: firstDayLastMonth.toISOString().split('T')[0], 
                            endDate: lastDayLastMonth.toISOString().split('T')[0] 
                          });
                        } else {
                          // Other periods (weeks)
                          const targetDate = new Date(today.getTime() + (option.days * 24 * 60 * 60 * 1000));
                          const dateStr = targetDate.toISOString().split('T')[0];
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
                <div className="text-xs mb-2" style={{ color: theme.text.muted }}>
                  Debug: Selected types: {JSON.stringify(selectedReportTypes)} | Date range: {combineDateRange.startDate} to {combineDateRange.endDate}
                </div>
                <div className="space-y-2">
                  {reportTypes.filter(type => type.id !== 'all').map((type) => (
                    <label key={type.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedReportTypes.includes(type.id)}
                        onChange={() => handleReportTypeChange(type.id)}
                        className="rounded"
                        style={{ borderColor: theme.border.default }}
                      />
                      <span className="text-sm" style={{ color: theme.text.secondary }}>
                        {type.name}
                      </span>
                    </label>
                  ))}
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedReportTypes.includes('all')}
                      onChange={() => handleReportTypeChange('all')}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-bold" style={{ color: theme.text.primary }}>
                      📊 ALL REPORTS (8 Types) - RECOMMENDED
                    </span>
                  </label>
                </div>
              </div>

              {/* Error Display */}
              {reportError && (
                <div className="mb-4 p-3 rounded-md border" style={{ 
                  backgroundColor: theme.colors.dangerBg || '#fef2f2', 
                  borderColor: theme.colors.danger || '#fecaca',
                  color: theme.colors.danger || '#dc2626'
                }}>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">⚠️ Error:</span>
                    <span className="ml-2 text-sm">{reportError}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={combineIndividualReports}
                  disabled={reportDataLoading}
                  className="flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: theme.colors.accent,
                    color: theme.text.primary
                  }}
                >
                  {reportDataLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      📥 DOWNLOAD COMPREHENSIVE PDF (ALL REPORTS)
                    </>
                  )}
                </button>
                <button
                  onClick={async () => {
                    try {
                      console.log('📊 Generating CSV export...');
                      setReportDataLoading(true);
                      
                      // Fetch data for all selected report types
                      const allReportsData = {};
                      let reportTypesToCombine = selectedReportTypes;
                      if (selectedReportTypes.includes('all')) {
                        // Include ALL available report types for comprehensive reporting
                        reportTypesToCombine = [
                          'stock_in', 
                          'stock_out', 
                          'sales', 
                          'inventory_balance', 
                          'supplier', 
                          'cashier_performance', 
                          'login_logs',
                          'stock_adjustment'
                        ];
                      }
                      
                      for (const reportType of reportTypesToCombine) {
                        try {
                          const res = await axios.post(API_BASE_URL, {
                            action: 'get_report_data',
                            report_type: reportType,
                            start_date: combineDateRange.startDate,
                            end_date: combineDateRange.endDate
                          }, {
                            timeout: 10000,
                            headers: {
                              'Content-Type': 'application/json',
                            }
                          });
                          
                          if (res.data?.success) {
                            allReportsData[reportType] = res.data.data || [];
                          }
                        } catch (error) {
                          console.error(`Error fetching ${reportType}:`, error);
                          allReportsData[reportType] = [];
                        }
                      }
                      
                      // Create CSV content
                      let csvContent = 'ENGUIO PHARMACY SYSTEM - COMBINED REPORTS\n';
                      csvContent += `Date Range: ${combineDateRange.startDate} to ${combineDateRange.endDate}\n`;
                      csvContent += `Generated: ${new Date().toLocaleDateString('en-PH')} at ${new Date().toLocaleTimeString('en-PH')}\n`;
                      csvContent += `Generated by: Admin\n\n`;
                      
                      // Add each report's data
                      for (const reportType of reportTypesToCombine) {
                        const data = allReportsData[reportType] || [];
                        if (data.length > 0) {
                          const reportInfo = reportTypes.find(t => t.id === reportType);
                          const reportName = reportInfo?.name || reportType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                          
                          csvContent += `\n${reportName}\n`;
                          csvContent += '='.repeat(reportName.length) + '\n';
                          
                          // Get columns
                          const columns = getReportColumns(reportType);
                          csvContent += columns.join(',') + '\n';
                          
                          // Add data rows
                          data.forEach(row => {
                            const rowData = columns.map(column => {
                              const columnKey = column.toLowerCase().replace(/\s+/g, '_');
                              let cellValue = row[columnKey] || 'N/A';
                              
                              // Format values
                              if (columnKey.includes('total_value') || columnKey.includes('total_amount') || columnKey.includes('unit_price') || columnKey.includes('average_transaction')) {
                                cellValue = `₱${parseFloat(cellValue || 0).toFixed(2)}`;
                              } else if (columnKey === 'date' && cellValue !== 'N/A') {
                                cellValue = new Date(cellValue).toLocaleDateString('en-PH');
                              }
                              
                              // Escape CSV values
                              if (cellValue.toString().includes(',')) {
                                cellValue = `"${cellValue}"`;
                              }
                              return cellValue;
                            });
                            csvContent += rowData.join(',') + '\n';
                          });
                        }
                      }
                      
                      // Create and download CSV
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      link.setAttribute('href', url);
                      link.setAttribute('download', `Combined_Reports_${combineDateRange.startDate}_to_${combineDateRange.endDate}.csv`);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      toast.success('📊 CSV exported successfully!', {
                        position: "top-right",
                        autoClose: 3000,
                      });
                      
                    } catch (error) {
                      console.error('Error generating CSV:', error);
                      toast.error('❌ CSV export failed: ' + error.message, {
                        position: "top-right",
                        autoClose: 5000,
                      });
                    } finally {
                      setReportDataLoading(false);
                    }
                  }}
                  className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: theme.bg.hover,
                    borderColor: theme.border.default,
                    color: theme.text.secondary,
                    border: `1px solid ${theme.border.default}`
                  }}
                >
                  📊 Export CSV
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
        </>
      )}
    </div>
  );
}

export default Reports;
