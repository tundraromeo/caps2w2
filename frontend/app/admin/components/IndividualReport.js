"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTheme } from './ThemeContext';
import { API_BASE_URL } from '../../lib/apiConfig';

function IndividualReport({ reportType, reportName, reportIcon }) {
  const { theme } = useTheme();
  const [reportData, setReportData] = useState([]);
  const [reportDataLoading, setReportDataLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0], // today
    endDate: new Date().toISOString().split('T')[0] // today
  });
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [cashierDetails, setCashierDetails] = useState(null);
  const [cashierDetailsLoading, setCashierDetailsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [newDataAvailable, setNewDataAvailable] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastDataCount, setLastDataCount] = useState(0);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [selectedReportTypes, setSelectedReportTypes] = useState(['sales']);
  const [autoUpdateNotification, setAutoUpdateNotification] = useState(null);
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

  // Get current user data on component mount
  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
    setCurrentUserData(userData);
  }, []);

  // Auto-update date range at midnight for real-time reports
  useEffect(() => {
    const updateDateRangeForNewDay = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Check if we need to update the date range
      setDateRange(prevRange => {
        const isTodayRange = prevRange.startDate === prevRange.endDate;
        
        if (isTodayRange && prevRange.endDate !== today) {
          console.log('🕛 Midnight detected - updating date range for new day');
          
          // Show notification
          setAutoUpdateNotification('🕛 Date range automatically updated for new day');
          setTimeout(() => setAutoUpdateNotification(null), 5000);
          
          // For login logs, extend range to include yesterday to catch late-night logins
          if (reportType === 'login_logs') {
            return {
              startDate: yesterday,
              endDate: today
            };
          }
          
          return {
            startDate: today,
            endDate: today
          };
        }
        
        return prevRange;
      });
    };

    // Update immediately
    updateDateRangeForNewDay();

    // Set up interval to check every minute for midnight crossing
    const interval = setInterval(updateDateRangeForNewDay, 60000); // Check every minute

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [reportType]);

  const fetchReportData = async (retryCount = 0, isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) {
        setReportDataLoading(true);
      }
      setReportError(null);
      
      // Get current user data from sessionStorage
      const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      
      const requestData = { 
        action: 'get_report_data',
        report_type: reportType,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        check_for_updates: isAutoRefresh, // Flag to check if there are new updates
        user_data: userData // Pass user data for role-based filtering
      };
      
      // Debug logging
      console.log('🔍 Fetching report data:', {
        reportType,
        API_URL: API_BASE_URL,
        requestData,
        dateRange: `${dateRange.startDate} to ${dateRange.endDate}`
      });
      
      let res;
      
      // Try axios first
      try {
        res = await axios.post(`${API_BASE_URL}/backend.php`, requestData, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } catch (axiosError) {
        console.warn('Axios failed, trying fetch:', axiosError.message);
        
        // Fallback to fetch
        const response = await fetch(`${API_BASE_URL}/backend.php`, {
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
        
        // Handle login logs data structure (has online_users and all_logs)
        let processedData = newData;
        if (reportType === 'login_logs' && newData.online_users) {
          // For login logs, use all_logs for the table display but online_users for cards
          processedData = newData.all_logs || [];
        }
        
        // Debug logging
        console.log(`✅ ${reportType} report data received:`, {
          dataCount: Array.isArray(processedData) ? processedData.length : (processedData.all_logs?.length || 0),
          hasNewData: res.data.has_new_data,
          isAutoRefresh,
          dateRange: `${dateRange.startDate} to ${dateRange.endDate}`,
          sampleData: Array.isArray(processedData) ? (processedData[0] || 'No data') : processedData,
          loginLogsStructure: reportType === 'login_logs' ? {
            onlineUsers: newData.online_users?.length || 0,
            allLogs: newData.all_logs?.length || 0
          } : null
        });
        
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
          } else if (reportType === 'login_logs') {
            console.log('🔐 New login activity detected!');
            if (Notification.permission === 'granted') {
              new Notification('Login Activity Update', {
                body: 'New login/logout activity has been detected',
                icon: '/enguio_logo.ico'
              });
            }
          }
        }
        
        // Track data count changes for better detection
        const currentDataCount = Array.isArray(processedData) ? processedData.length : (processedData.all_logs?.length || 0);
        if (isAutoRefresh && currentDataCount > lastDataCount) {
          setLastDataCount(currentDataCount);
          setNewDataAvailable(true);
          setNotificationCount(prev => prev + 1);
        }
        
        // Store the full data structure for login logs, processed data for others
        setReportData(reportType === 'login_logs' ? newData : processedData);
        setReportError(null);
        setLastRefresh(new Date());
      } else {
        setReportData([]);
        setReportError(res.data?.message || 'Failed to fetch report data');
        console.error(`❌ ${reportType} report data fetch failed:`, res.data?.message);
        console.error('Full API response:', res.data);
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
      
      // Get current user data from sessionStorage
      const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      
      const res = await axios.post(`${API_BASE_URL}/backend.php`, {
        action: 'generate_report',
        report_type: reportType,
        generated_by: userData.full_name || userData.username || 'Admin',
        parameters: {
          start_date: dateRange.startDate,
          end_date: dateRange.endDate
        },
        user_data: userData // Pass user data for role-based filtering
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

  const combineReports = async () => {
    try {
      setReportDataLoading(true);
      
      // Get current user data from sessionStorage
      const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      
      // Generate PDF directly
      await generateCombinedPDF(selectedReportTypes, userData);
      
      // Close modal
      setShowCombineModal(false);
      
    } catch (error) {
      console.error('Error combining reports:', error);
    } finally {
      setReportDataLoading(false);
    }
  };

  const generateCombinedPDF = async (reportTypes, userData) => {
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
      
      // Generate report data table HTML based on report type
      const generateReportDataTable = () => {
        if (!reportData || (Array.isArray(reportData) ? reportData.length === 0 : (reportData.all_logs?.length === 0 && reportData.online_users?.length === 0))) {
          return '<div style="text-align: center; padding: 20px; color: #666;">No data found for the selected date range</div>';
        }

        const dataToProcess = Array.isArray(reportData) ? reportData : (reportData.all_logs || []);
        const columns = getReportColumns();
        
        if (columns.length === 0) {
          return '<div style="text-align: center; padding: 20px; color: #666;">No columns defined for this report type</div>';
        }

        let tableHTML = `
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
        `;

        // Add table headers
        columns.forEach(column => {
          tableHTML += `<th style="border: 1px solid #000; padding: 8px; text-align: left;">${column}</th>`;
        });

        tableHTML += `
              </tr>
            </thead>
            <tbody>
        `;

        // Add table rows
        dataToProcess.slice(0, 50).forEach((row, index) => { // Limit to 50 rows for PDF
          tableHTML += `
            <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
          `;

          columns.forEach(column => {
            const columnKey = column.toLowerCase().replace(/\s+/g, '_');
            let cellValue = row[columnKey] || 'N/A';
            
            // Format specific cell types for PDF
            if (columnKey === 'total_value' || columnKey === 'total_amount' || columnKey === 'unit_price') {
              cellValue = `₱${parseFloat(cellValue || 0).toFixed(2)}`;
            } else if (columnKey === 'date') {
              cellValue = row[columnKey] ? new Date(row[columnKey]).toLocaleDateString('en-PH') : 'N/A';
            } else if (columnKey === 'time') {
              cellValue = row[columnKey] ? new Date(`2000-01-01T${row[columnKey]}`).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
            } else if (columnKey === 'payment_method' || columnKey === 'payment_type') {
              if (cellValue === 'cash') cellValue = 'Cash';
              else if (cellValue === 'card') cellValue = 'Card';
              else if (cellValue === 'Gcash') cellValue = 'GCash';
            }

            // Truncate long values
            if (typeof cellValue === 'string' && cellValue.length > 30) {
              cellValue = cellValue.substring(0, 30) + '...';
            }

            tableHTML += `<td style="border: 1px solid #000; padding: 6px;">${cellValue}</td>`;
          });

          tableHTML += '</tr>';
        });

        if (dataToProcess.length > 50) {
          tableHTML += `
            <tr style="background-color: #f0f0f0;">
              <td colspan="${columns.length}" style="border: 1px solid #000; padding: 6px; text-align: center; font-style: italic;">
                ... and ${dataToProcess.length - 50} more records (showing first 50 for PDF)
              </td>
            </tr>
          `;
        }

        tableHTML += '</tbody></table>';
        return tableHTML;
      };

      // Generate summary statistics based on report type
      const generateSummaryStats = () => {
        if (!reportData || (Array.isArray(reportData) ? reportData.length === 0 : (reportData.all_logs?.length === 0 && reportData.online_users?.length === 0))) {
          return '';
        }

        const dataToProcess = Array.isArray(reportData) ? reportData : (reportData.all_logs || []);
        let summaryHTML = '';

        switch (reportType) {
          case 'sales':
            const totalSales = dataToProcess.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
            const totalItems = dataToProcess.reduce((sum, item) => sum + (parseInt(item.items_sold) || 0), 0);
            summaryHTML = `
              <div style="margin-bottom: 20px; padding: 15px; background: #f0fdf4; border-left: 4px solid #22c55e;">
                <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Sales Summary</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
                  <div>Total Transactions: ${dataToProcess.length}</div>
                  <div>Total Sales: ₱${parseFloat(totalSales || 0).toFixed(2)}</div>
                  <div>Total Items Sold: ${totalItems.toLocaleString()}</div>
                  <div>Average Sale: ₱${dataToProcess.length > 0 ? parseFloat(totalSales / dataToProcess.length).toFixed(2) : '0.00'}</div>
                </div>
              </div>
            `;
            break;
          case 'stock_in':
            const totalQuantity = dataToProcess.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
            const totalValue = dataToProcess.reduce((sum, item) => sum + (parseFloat(item.total_value) || 0), 0);
            summaryHTML = `
              <div style="margin-bottom: 20px; padding: 15px; background: #f0fdf4; border-left: 4px solid #22c55e;">
                <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Stock In Summary</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
                  <div>Total Items: ${dataToProcess.length}</div>
                  <div>Total Quantity: ${totalQuantity.toLocaleString()}</div>
                  <div>Total Value: ₱${parseFloat(totalValue || 0).toFixed(2)}</div>
                  <div>Unique Products: ${new Set(dataToProcess.map(item => item.product_name).filter(Boolean)).size}</div>
                </div>
              </div>
            `;
            break;
          case 'stock_out':
            const totalOutQuantity = dataToProcess.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
            summaryHTML = `
              <div style="margin-bottom: 20px; padding: 15px; background: #fef2f2; border-left: 4px solid #ef4444;">
                <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Stock Out Summary</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
                  <div>Total Items: ${dataToProcess.length}</div>
                  <div>Total Quantity: ${totalOutQuantity.toLocaleString()}</div>
                  <div>Unique Products: ${new Set(dataToProcess.map(item => item.product_name).filter(Boolean)).size}</div>
                  <div>Approved Adjustments: ${dataToProcess.filter(item => item.status === 'Approved').length}</div>
                </div>
              </div>
            `;
            break;
          case 'cashier_performance':
            const totalCashierSales = dataToProcess.reduce((sum, item) => sum + (parseFloat(item.total_sales) || 0), 0);
            summaryHTML = `
              <div style="margin-bottom: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b;">
                <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Cashier Performance Summary</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
                  <div>Total Cashiers: ${dataToProcess.length}</div>
                  <div>Total Sales: ₱${parseFloat(totalCashierSales || 0).toFixed(2)}</div>
                  <div>Total Transactions: ${dataToProcess.reduce((sum, item) => sum + (parseInt(item.transactions_count) || 0), 0)}</div>
                  <div>Average Transaction: ₱${dataToProcess.length > 0 ? parseFloat(totalCashierSales / dataToProcess.reduce((sum, item) => sum + (parseInt(item.transactions_count) || 0), 0)).toFixed(2) : '0.00'}</div>
                </div>
              </div>
            `;
            break;
          case 'login_logs':
            const onlineUsers = Array.isArray(reportData) ? reportData.filter(item => item.login_status === 'ONLINE').length : (reportData.online_users?.length || 0);
            summaryHTML = `
              <div style="margin-bottom: 20px; padding: 15px; background: #e0f2fe; border-left: 4px solid #0284c7;">
                <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Login Activity Summary</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
                  <div>Total Activities: ${dataToProcess.length}</div>
                  <div>Currently Online: ${onlineUsers}</div>
                  <div>Online Admins: ${Array.isArray(reportData) ? reportData.filter(item => item.login_status === 'ONLINE' && item.role === 'admin').length : (Array.isArray(reportData.online_users) ? reportData.online_users.filter(item => item.role === 'admin').length : 0)}</div>
                  <div>Active Locations: ${new Set(dataToProcess.map(item => item.location).filter(Boolean)).size}</div>
                </div>
              </div>
            `;
            break;
          default:
            summaryHTML = `
              <div style="margin-bottom: 20px; padding: 15px; background: #f1f5f9; border-left: 4px solid #64748b;">
                <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Report Summary</div>
                <div style="font-size: 11px;">
                  Total Records: ${dataToProcess.length}
                </div>
              </div>
            `;
        }

        return summaryHTML;
      };

      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: #f8fafc; border: 2px solid #000000;">
          <div style="font-size: 24px; font-weight: bold; color: #000000; margin-bottom: 5px;">ENGUIO PHARMACY SYSTEM</div>
          <div style="font-size: 14px; color: #000000;">${reportName}</div>
        </div>
        
        <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #000000;">
          <div style="font-size: 20px; font-weight: bold; color: #000000; margin-bottom: 10px;">${reportName}</div>
          <div style="font-size: 12px; color: #000000; margin: 2px 0;">Generated on: ${new Date().toLocaleDateString('en-PH')} at ${new Date().toLocaleTimeString('en-PH')}</div>
          <div style="font-size: 12px; color: #000000; margin: 2px 0;">Generated by: ${userData.full_name || userData.username || 'Admin'}</div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #f1f5f9; border-left: 4px solid #000000;">
          <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Report Information</div>
          <div style="display: table; width: 100%;">
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">Report Type:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">${reportName}</div>
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

        ${generateSummaryStats()}

        <div style="margin-top: 20px;">
          <div style="font-size: 16px; font-weight: bold; color: #000000; margin-bottom: 10px;">Report Details</div>
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
    setSelectedReportTypes([reportType]); // Default to current report type
    setCombineDateRange({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    setShowCombineModal(true);
  };

  const fetchCashierDetails = async (cashierId) => {
    try {
      setCashierDetailsLoading(true);
      
      // Get current user data from sessionStorage
      const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      
      const res = await axios.post(`${API_BASE_URL}/backend.php`, {
        action: 'get_cashier_details',
        cashier_id: cashierId,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        user_data: userData // Pass user data for role-based filtering
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
    if (reportType === 'sales' || reportType === 'cashier_performance' || reportType === 'login_logs') {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [dateRange]);

  // Auto-refresh for all reports every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReportData(0, true); // Pass true for isAutoRefresh
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [reportType, dateRange]);

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
        return ['Date', 'Time', 'Product Name', 'Barcode', 'Adjustment Type', 'Quantity', 'Unit Price', 'Total Value', 'Reason', 'Adjusted By', 'Reference No'];
      case 'sales':
        return ['Date', 'Time', 'Reference No', 'Total Amount', 'Items Sold', 'Products', 'Payment Type', 'Cashier', 'Terminal'];
      case 'inventory_balance':
        return ['Product Name', 'Barcode', 'Category', 'Current Stock', 'Unit Price', 'Total Value', 'Location', 'Supplier', 'Brand', 'Expiration', 'Status'];
      case 'stock_adjustment':
        return ['Date', 'Time', 'Product Name', 'Barcode', 'Quantity', 'Movement Type', 'Reason', 'Adjusted By', 'Reference No'];
      case 'supplier':
        return ['Supplier Name', 'Contact', 'Email', 'Products Supplied', 'Total Stock', 'Total Value', 'Deliveries Count'];
      case 'cashier_performance':
        return ['Employee Name', 'Role', 'Transactions Count', 'Total Sales', 'Average Transaction', 'Unique Products Sold'];
      case 'login_logs':
        return ['Date', 'Time', 'Employee Name', 'Username', 'Role', 'Action', 'Login Status', 'Location', 'Terminal', 'Session Duration', 'Description'];
      case 'activity_logs':
        return ['Date', 'Time', 'Employee Name', 'Username', 'Role', 'Action', 'Description', 'Location', 'Terminal', 'Status'];
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
        return row[columnKey] ? new Date(row[columnKey]).toLocaleDateString('en-PH') : '📅 Not Available';
      case 'time':
        return row[columnKey] ? new Date(`2000-01-01T${row[columnKey]}`).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '🕐 Not Available';
      case 'payment_method':
      case 'payment_type':
        const paymentType = row[columnKey];
        if (paymentType === 'cash') return '💵 Cash';
        if (paymentType === 'card') return '💳 Card';
        if (paymentType === 'Gcash') return '📱 GCash';
        return paymentType || '💳 Not Specified';
      case 'cashier':
      case 'cashier_name':
      case 'employee_name':
        if (reportType === 'cashier_performance' && row['emp_id']) {
          return (
            <button
              onClick={() => fetchCashierDetails(row['emp_id'])}
              className="underline cursor-pointer font-medium"
              style={{ color: theme.colors.accent }}
            >
              {row[columnKey] || row['cashier_username'] || row['cashier_name'] || '👤 System User'}
            </button>
          );
        }
        return row[columnKey] || row['cashier_username'] || row['cashier_name'] || '👤 System User';
      case 'reference_no':
        return row[columnKey] || '📋 Auto-Generated';
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
        return status || '📊 Pending';
      case 'location':
        return row[columnKey] || '🏢 Main Store';
      case 'supplier':
        return row[columnKey] || '🏭 Direct Purchase';
      case 'product_name':
        return row[columnKey] || '📦 Generic Product';
      case 'barcode':
        return row[columnKey] || '📱 No Barcode';
      case 'category':
        return row[columnKey] || '📂 Uncategorized';
      case 'brand':
        return row[columnKey] || '🏷️ Generic Brand';
      case 'expiration':
        return row[columnKey] ? new Date(row[columnKey]).toLocaleDateString('en-PH') : '📅 No Expiry';
      case 'customer_info':
        return row[columnKey] || '👤 Walk-in Customer';
      case 'terminal':
        return row[columnKey] || '💻 POS Terminal 1';
      case 'movement_type':
        return row[columnKey] || '📊 Stock Movement';
      case 'reason':
        return row[columnKey] || '📝 System Adjustment';
      case 'adjusted_by':
        // For stock reports, use the enhanced adjusted_by field from the backend
        const adjustedBy = row['adjusted_by'] || '';
        const adjustedByDetailed = row['adjusted_by_detailed'] || '';
        
        // Use the detailed version if available, otherwise use the simple version
        const displayName = adjustedByDetailed || adjustedBy;
        
        if (displayName && displayName.trim() !== '') {
          // Add appropriate emoji based on the type
          if (displayName.toLowerCase().includes('cashier')) {
            return `💰 ${displayName.trim()}`;
          } else if (displayName.toLowerCase().includes('admin')) {
            return `👑 ${displayName.trim()}`;
          } else if (displayName.toLowerCase().includes('inventory')) {
            return `📦 ${displayName.trim()}`;
          } else if (displayName.toLowerCase().includes('pharmacy')) {
            return `💊 ${displayName.trim()}`;
          } else if (displayName.toLowerCase().includes('pos system')) {
            return `🤖 POS System`;
          } else {
            return `👤 ${displayName.trim()}`;
          }
        }
        
        // Fallback to original logic for other reports
        const employeeName = row['employee_name'] || '';
        const createdBy = row['created_by'] || '';
        const userId = row['user_id'] || '';
        const username = row['username'] || '';
        const loggedInUser = row['logged_in_user'] || '';
        const inventoryManager = row['inventory_manager'] || '';
        const terminalName = row['terminal_name'] || '';
        const posTerminalName = row['pos_terminal_name'] || '';
        const shiftName = row['shift_name'] || '';
        const shiftStart = row['shift_start'] || '';
        const shiftEnd = row['shift_end'] || '';
        const assignedLocation = row['assigned_location'] || '';
        const loginLocation = row['login_location'] || '';
        const userRole = row['user_role'] || '';
        const loginRole = row['login_role'] || '';
        const displayRole = row['display_role'] || '';
        
        // Determine role for display
        const getRoleDisplay = (role) => {
          if (!role) return '';
          const roleLower = role.toLowerCase();
          if (roleLower.includes('inventory')) return 'Inventory';
          if (roleLower.includes('admin')) return 'Admin';
          if (roleLower.includes('manager')) return 'Manager';
          if (roleLower.includes('cashier')) return 'Cashier';
          if (roleLower.includes('supervisor')) return 'Supervisor';
          return role;
        };
        
        const rolePrefix = getRoleDisplay(displayRole) ? `${getRoleDisplay(displayRole)} ` : '';
        
        // Build terminal, shift, and location info
        const terminalInfo = posTerminalName || terminalName;
        const shiftInfo = shiftName ? ` - ${shiftName}` : '';
        const locationInfo = loginLocation || assignedLocation;
        const locationDisplay = locationInfo ? ` @ ${locationInfo}` : '';
        const terminalDisplay = terminalInfo ? ` (${terminalInfo}${shiftInfo}${locationDisplay})` : '';
        
        // First priority: Exact employee name
        if (employeeName && employeeName.trim() !== '') {
          return `👤 ${rolePrefix}${employeeName.trim()}${terminalDisplay}`;
        }
        
        // Second priority: Logged in user at the time
        if (loggedInUser && loggedInUser.trim() !== '') {
          return `👤 ${rolePrefix}${loggedInUser.trim()}${terminalDisplay}`;
        }
        
        // Third priority: Inventory manager
        if (inventoryManager && inventoryManager.trim() !== '') {
          return `👤 Inventory ${inventoryManager.trim()}${terminalDisplay}`;
        }
        
        // Fourth priority: Username
        if (username && username.trim() !== '') {
          return `👤 ${rolePrefix}${username.trim()}${terminalDisplay}`;
        }
        
        // Fifth priority: User ID
        if (userId && userId.trim() !== '') {
          return `👤 ${rolePrefix}User ${userId}${terminalDisplay}`;
        }
        
        // System users with specific names
        if (createdBy === 'System Sync') {
          return `🤖 System Auto-Sync${terminalDisplay}`;
        } else if (createdBy === 'POS System') {
          return `👤 POS Cashier${terminalDisplay}`;
        } else if (createdBy === 'Pharmacy Cashier') {
          return `👤 Pharmacy Cashier${terminalDisplay}`;
        } else if (createdBy === 'Inventory Manager') {
          return `👤 Inventory Manager${terminalDisplay}`;
        } else if (createdBy === 'Admin') {
          return `👤 Admin System${terminalDisplay}`;
        } else if (createdBy && createdBy.trim() !== '') {
          return `👤 ${rolePrefix}${createdBy.trim()}${terminalDisplay}`;
        }
        
        // Default fallback
        return '👤 Unknown User';
      case 'received_by':
        return row[columnKey] || '👤 Warehouse Staff';
      case 'supplier_name':
        return row[columnKey] || '🏭 Direct Supplier';
      case 'contact':
        return row[columnKey] || '📞 Not Available';
      case 'email':
        return row[columnKey] || '📧 Not Provided';
      case 'first_sale':
        return row[columnKey] ? new Date(row[columnKey]).toLocaleDateString('en-PH') : '📅 No Sales Yet';
      case 'last_sale':
        return row[columnKey] ? new Date(row[columnKey]).toLocaleDateString('en-PH') : '📅 No Recent Sales';
      case 'username':
        return row[columnKey] || '👤 System User';
      case 'employee_name':
        return row[columnKey] || '👤 Unknown Employee';
      case 'role':
      case 'employee_role':
        // Try multiple possible column names for role data
        const role = row[columnKey] || row['employee_role'] || row['role'];
        
        // Debug logging for cashier performance reports
        if (reportType === 'cashier_performance') {
          console.log('Role formatting debug:', {
            columnKey,
            column,
            role,
            rowKeys: Object.keys(row),
            rowData: row
          });
        }
        
        if (role === 'admin') return '👑 Administrator';
        if (role === 'manager') return '👔 Manager';
        if (role === 'supervisor') return '👨‍💼 Supervisor';
        if (role === 'cashier') return '💰 Cashier';
        if (role === 'pharmacist') return '💊 Pharmacist';
        if (role === 'inventory') return '📦 Inventory Staff';
        return role ? `👤 ${role.charAt(0).toUpperCase() + role.slice(1)}` : '👤 Staff';
      case 'action':
        const action = row[columnKey];
        if (action === 'LOGIN') return '🔓 LOGIN';
        if (action === 'LOGOUT') return '🔒 LOGOUT';
        if (action === 'NAVIGATION') return '🧭 NAVIGATION';
        if (action === 'POS_SALE_SAVED') return '💰 POS SALE';
        if (action === 'STOCK_ADJUSTMENT_CREATED') return '📦 STOCK ADJUSTMENT';
        if (action === 'INVENTORY_TRANSFER_CREATED') return '🔄 INVENTORY TRANSFER';
        if (action === 'USER_CREATE') return '👤 USER CREATED';
        if (action === 'USER_UPDATE') return '✏️ USER UPDATED';
        if (action === 'USER_MANAGEMENT') return '👥 USER MANAGEMENT';
        if (action === 'STOCK_IN') return '📥 STOCK IN';
        if (action === 'STOCK_OUT') return '📤 STOCK OUT';
        if (action === 'STOCK_ADJUSTMENT') return '📊 STOCK ADJUSTMENT';
        if (action === 'STOCK_TRANSFER') return '🔄 STOCK TRANSFER';
        return action || '📝 System Action';
      case 'login_status':
        const loginStatus = row[columnKey];
        if (loginStatus === 'ONLINE') {
          return (
            <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.successBg, color: theme.colors.success }}>
              🟢 ONLINE
            </span>
          );
        }
        if (loginStatus === 'OFFLINE') {
          return (
            <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.warningBg, color: theme.colors.warning }}>
              🔴 OFFLINE
            </span>
          );
        }
        return loginStatus || '📊 Unknown';
      case 'location':
        return row[columnKey] || '🏢 Main Office';
      case 'terminal':
        return row[columnKey] || '💻 System Terminal';
      case 'session_duration':
        const duration = row[columnKey];
        if (!duration || duration === 0) return '📊 N/A';
        
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        
        if (hours > 0) {
          return `⏱️ ${hours}h ${minutes}m`;
        } else {
          return `⏱️ ${minutes}m`;
        }
      case 'description':
        const description = row[columnKey];
        if (!description) return '📄 System Activity';
        
        // Truncate long descriptions for better display
        if (description.length > 100) {
          return (
            <span title={description}>
              {description.substring(0, 100)}...
            </span>
          );
        }
        return description;
      case 'status':
        const activityStatus = row[columnKey];
        if (activityStatus === 'ONLINE') {
          return (
            <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.successBg, color: theme.colors.success }}>
              🟢 ONLINE
            </span>
          );
        }
        if (activityStatus === 'OFFLINE') {
          return (
            <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.warningBg, color: theme.colors.warning }}>
              🔴 OFFLINE
            </span>
          );
        }
        if (activityStatus === 'ACTIVE') {
          return (
            <span className="px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: theme.colors.accent + '20', color: theme.colors.accent }}>
              ⚡ ACTIVE
            </span>
          );
        }
        return activityStatus || '📊 Unknown';
      default:
        return row[columnKey] || '📊 Not Available';
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-3" style={{ backgroundColor: theme.bg.card }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <span className="text-2xl">{reportIcon}</span>
              <div>
                <h1 className="text-xl font-bold" style={{ color: theme.text.primary }}>{reportName}</h1>
                <p className="text-sm" style={{ color: theme.text.secondary }}>Detailed Report Analysis</p>
                {currentUserData && currentUserData.role && (
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" 
                          style={{ 
                            backgroundColor: theme.bg.hover, 
                            color: theme.text.primary 
                          }}>
                      👤 {currentUserData.full_name || currentUserData.username} 
                      <span className="ml-1 px-1 py-0.5 rounded text-xs" 
                            style={{ 
                              backgroundColor: theme.text.muted, 
                              color: 'white' 
                            }}>
                        {currentUserData.role.toUpperCase()}
                      </span>
                    </span>
                    <p className="text-xs mt-1" style={{ color: theme.text.muted }}>
                      {currentUserData.role.toLowerCase() === 'cashier' 
                        ? '📊 Showing only your sales transactions'
                        : currentUserData.role.toLowerCase() === 'admin' || currentUserData.role.toLowerCase() === 'manager'
                        ? '📊 Showing all sales transactions'
                        : '📊 Showing filtered data based on your role'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openCombineModal}
              disabled={reportDataLoading}
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
            <h3 className="text-lg font-semibold mb-3" style={{ color: theme.text.primary }}>
              {reportType === 'activity_logs' ? 'Activity Logs - Today Only' : 'Date Range'}
            </h3>
            {reportType === 'activity_logs' && (
              <div className="mb-3 p-3 rounded-md" style={{ backgroundColor: theme.colors.accent + '20', color: theme.colors.accent }}>
                <p className="text-sm font-medium">📅 Activity Logs automatically show today&apos;s activities only</p>
                <p className="text-xs mt-1">Real-time system activities from tbl_activity_log table</p>
              </div>
            )}
            <div className="flex gap-4 items-center">
              {reportType !== 'activity_logs' && (
                <>
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
                </>
              )}
              
              <div className="text-xs" style={{ color: theme.text.secondary }}>
                Last updated: {lastRefresh.toLocaleTimeString()}
                {autoUpdateNotification && (
                  <div className="mt-1 p-2 bg-green-100 border border-green-400 text-green-700 rounded text-xs">
                    {autoUpdateNotification}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* New Data Available Notification */}
        {newDataAvailable && (reportType === 'sales' || reportType === 'cashier_performance' || reportType === 'login_logs') && (
          <div className="mb-6">
            <div
              className="rounded-lg shadow-md p-4 border-l-4 animate-pulse"
              style={{
                backgroundColor: theme.bg.card,
                boxShadow: `0 10px 25px ${theme.shadow.lg}`,
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
                        : reportType === 'cashier_performance'
                        ? 'New cashier performance data is available.'
                        : 'New login/logout activity has been detected in the system.'
                      }
                    </p>
                    <div className="text-xs mt-1" style={{ color: theme.text.secondary }}>
                      <p>Last updated: {lastRefresh.toLocaleTimeString()}</p>
                      {autoUpdateNotification && (
                        <div className="mt-1 p-2 bg-green-100 border border-green-400 text-green-700 rounded text-xs">
                          {autoUpdateNotification}
                        </div>
                      )}
                    </div>
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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards for Sales Report */}
        {reportType === 'sales' && reportData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">🛒</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Transactions</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{reportData.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
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
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
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
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
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
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
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

        {/* Summary Cards for Login Logs Report - Show Only Online Users */}
        {reportType === 'login_logs' && (Array.isArray(reportData) ? reportData.length > 0 : (reportData.all_logs?.length > 0 || reportData.online_users?.length > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">👥</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Activities</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {Array.isArray(reportData) ? reportData.length : (reportData.all_logs?.length || 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">🟢</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Currently Online</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {Array.isArray(reportData) 
                      ? reportData.filter(item => item.login_status === 'ONLINE').length 
                      : (reportData.online_users?.length || 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">👑</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Online Admins</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {Array.isArray(reportData) 
                      ? reportData.filter(item => item.login_status === 'ONLINE' && item.role === 'admin').length
                      : (Array.isArray(reportData.online_users) ? reportData.online_users.filter(item => item.role === 'admin').length : 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">🏢</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Active Locations</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {Array.isArray(reportData) 
                      ? new Set(reportData.filter(item => item.login_status === 'ONLINE').map(item => item.location).filter(Boolean)).size
                      : new Set((Array.isArray(reportData.online_users) ? reportData.online_users : []).map(item => item.location).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards for Activity Logs Report */}
        {reportType === 'activity_logs' && reportData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">📊</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Activities</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{reportData.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">💰</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>POS Sales</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {reportData.filter(item => item.action === 'POS_SALE_SAVED').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">🔓</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Login Activities</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {reportData.filter(item => item.action === 'LOGIN' || item.action === 'LOGOUT').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">📦</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Stock Activities</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                    {reportData.filter(item => 
                      item.action === 'STOCK_ADJUSTMENT_CREATED' || 
                      item.action === 'INVENTORY_TRANSFER_CREATED' ||
                      item.action === 'STOCK_IN' ||
                      item.action === 'STOCK_OUT'
                    ).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards for Stock In Report */}
        {reportType === 'stock_in' && reportData.length > 0 && (
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
              {reportName} - {reportType === 'activity_logs' ? 'Today Only' : `${dateRange.startDate} to ${dateRange.endDate}`}
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
            ) : (Array.isArray(reportData) ? reportData.length > 0 : (reportData.all_logs?.length > 0 || reportData.online_users?.length > 0)) ? (
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
                    {(Array.isArray(reportData) ? reportData : (reportData.all_logs || [])).map((row, index) => (
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
                    : reportType === 'login_logs'
                    ? 'No login/logout activities found for the selected date range. Make sure employees have logged into the system.'
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
                    ) : reportType === 'login_logs' ? (
                      <p>💡 <strong>Tip:</strong> Login/logout activities are automatically tracked. Check if employees are logging into the system!</p>
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
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
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
                    <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
                      <div className="flex items-center">
                        <div className="text-3xl mr-3">🛒</div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Transactions</p>
                          <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{cashierDetails?.summary?.total_transactions || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
                      <div className="flex items-center">
                        <div className="text-3xl mr-3">💰</div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Sales</p>
                          <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                            ₱{parseFloat(cashierDetails?.summary?.total_sales || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
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
                  <div className="rounded-lg shadow-md" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow.lg}` }}>
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

      {/* Combine Reports Modal */}
      {showCombineModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div 
            className="rounded-xl shadow-2xl max-w-md w-full mx-4 border-2"
            style={{ 
              backgroundColor: theme.bg.card,
              borderColor: theme.colors.accent,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.2)'
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.default }}>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                  Combine {reportName}
                </h3>
                <p className="text-sm mt-1" style={{ color: theme.text.secondary }}>
                  Select date range and report types to download as a single PDF
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

export default IndividualReport;
