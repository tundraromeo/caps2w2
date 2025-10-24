"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useAPI } from "../hooks/useAPI";
import { fetchWithCORS } from '../lib/fetchWrapper';
import { API_BASE_URL } from '../lib/apiConfig';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  FaDownload, 
  FaPrint, 
  FaChartBar, 
  FaChartLine, 
  FaChartPie, 
  FaCalendar, 
  FaFilter, 
  FaEye, 
  FaFileAlt,
  FaTimes,
  FaInfoCircle,
  FaCheckCircle,
  FaWeight,
  FaExclamationTriangle,
  FaBell
} from "react-icons/fa";
import { BarChart3, TrendingUp, PieChart, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useTheme } from './ThemeContext';
import { useSettings } from './SettingsContext';
import { useNotification } from './NotificationContext';

const Reports = () => {
  const { isDarkMode, theme } = useTheme();
  const { settings } = useSettings();
  const { updateReportsNotifications, updateSystemUpdates, systemUpdates, hasReportsUpdates, clearNotifications, clearSystemUpdates } = useNotification();
  const { api, loading: apiLoading, error: apiError } = useAPI();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetails, setReportDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0
  });
  const [topCategories, setTopCategories] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [combineStartDate, setCombineStartDate] = useState('');
  const [combineEndDate, setCombineEndDate] = useState('');
  const [selectedReportTypes, setSelectedReportTypes] = useState(['all']);

  // Fetch data from database
  useEffect(() => {
    fetchReportsData();
  }, []);

  // Check for system updates and new reports
  useEffect(() => {
    const checkForUpdates = () => {
      // Check if there are new reports since last check
      const lastCheck = localStorage.getItem('reports-last-check');
      const currentTime = new Date().getTime();
      
      if (!lastCheck || (currentTime - parseInt(lastCheck)) > 300000) { // 5 minutes
        updateSystemUpdates(true, 1);
        localStorage.setItem('reports-last-check', currentTime.toString());
      }

      // Check if there are pending reports or system updates
      const hasNewReports = reports.some(report => {
        const reportDate = new Date(report.date);
        const now = new Date();
        const diffHours = (now - reportDate) / (1000 * 60 * 60);
        return diffHours < 24; // Reports from last 24 hours
      });

      updateReportsNotifications(hasNewReports, hasNewReports ? reports.length : 0);
    };

    if (reports.length > 0) {
      checkForUpdates();
    }
  }, [reports]);

  // Auto-refresh functionality
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchReportsData();
        setLastRefresh(new Date());
      }, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const fetchReportsData = async (showToast = false) => {
    setIsLoading(true);
    try {
      const response = await api.callGenericAPI('sales_api.php', 'get_report_data', {
        report_type: 'all',
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      });
      
      if (response.success) {
        setReports(response.reports || []);
        setFilteredReports(response.reports || []);
        setAnalyticsData(response.analytics || {
          totalProducts: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          totalValue: 0
        });
        setTopCategories(response.topCategories || []);
        
        if (showToast) {
          toast.success('Reports data refreshed successfully');
        }
      } else {
        toast.error('Failed to fetch reports data: ' + response.message);
      }
    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast.error('Error connecting to server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    filterReports();
  }, [searchTerm, selectedType, selectedDateRange, reports]);

  const filterReports = () => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.generatedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedType !== "all") {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    if (selectedDateRange !== "all") {
      const today = new Date();
      const filteredDate = new Date();
      
      switch (selectedDateRange) {
        case "today":
          filtered = filtered.filter(item => item.date === today.toISOString().split('T')[0]);
          break;
        case "week":
          filteredDate.setDate(today.getDate() - 7);
          filtered = filtered.filter(item => new Date(item.date) >= filteredDate);
          break;
        case "month":
          filteredDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(item => new Date(item.date) >= filteredDate);
          break;
        default:
          break;
      }
    }

    setFilteredReports(filtered);
  };

  const getStatusColor = (status) => {
    if (isDarkMode) {
      switch (status) {
        case "Completed":
          return "bg-green-900 text-green-200 border border-green-700";
        case "In Progress":
          return "bg-yellow-900 text-yellow-200 border border-yellow-700";
        case "Failed":
          return "bg-red-900 text-red-200 border border-red-700";
        default:
          return "bg-gray-800 text-gray-200 border border-gray-700";
      }
    } else {
      switch (status) {
        case "Completed":
          return "bg-green-100 text-green-800 border border-green-300";
        case "In Progress":
          return "bg-yellow-100 text-yellow-800 border border-yellow-300";
        case "Failed":
          return "bg-red-100 text-red-800 border border-red-300";
        default:
          return "bg-gray-100 text-gray-800 border border-gray-300";
      }
    }
  };

  const getTypeColor = (type) => {
    if (isDarkMode) {
      switch (type) {
        case "Stock In Report":
          return "bg-gray-900 text-gray-200 border border-gray-700";
        case "Stock Out Report":
          return "bg-red-900 text-red-200 border border-red-700";
        case "Stock Adjustment Report":
          return "bg-yellow-900 text-yellow-200 border border-yellow-700";
        case "Transfer Report":
          return "bg-purple-900 text-purple-200 border border-purple-700";
        default:
          return "bg-gray-800 text-gray-200 border border-gray-700";
      }
    } else {
      switch (type) {
        case "Stock In Report":
          return "bg-gray-100 text-gray-800 border border-gray-300";
        case "Stock Out Report":
          return "bg-red-100 text-red-800 border border-red-300";
        case "Stock Adjustment Report":
          return "bg-yellow-100 text-yellow-800 border border-yellow-300";
        case "Transfer Report":
          return "bg-purple-100 text-purple-800 border border-purple-300";
        default:
          return "bg-gray-100 text-gray-800 border border-gray-300";
      }
    }
  };

  const handleViewDetails = async (report) => {
    setSelectedReport(report);
    setIsLoading(true);
    
    try {
      const response = await api.callGenericAPI('sales_api.php', 'get_report_details', {
        report_id: report.movement_id 
      });
      
      if (response.success) {
        setReportDetails(response.details || []);
      } else {
        setReportDetails([]);
        toast.error('Failed to load report details: ' + response.message);
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
      setReportDetails([]);
      toast.error('Error loading report details');
    } finally {
      setIsLoading(false);
    setShowModal(true);
    }
  };

  const handleGenerateReport = async (reportType) => {
    setIsLoading(true);
    try {
      let parameters = {};
      
      switch (reportType) {
        case 'inventory_summary':
          parameters = {};
          break;
        case 'low_stock':
          parameters = { threshold: settings.lowStockThreshold || 10 };
          break;
        case 'expiry':
          parameters = { days_threshold: settings.expiryWarningDays || 30 };
          break;
        case 'movement_history':
          parameters = { 
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0]
          };
          break;
        default:
          toast.info('Report generation feature coming soon');
          setIsLoading(false);
          return;
      }

      const response = await api.callGenericAPI('sales_api.php', 'generate_report', {
        report_type: reportType,
        generated_by: 'Inventory Manager',
        parameters: parameters
      });
      
      if (response.success) {
        toast.success(`${reportType.replace('_', ' ')} report generated successfully`);
        // Refresh the reports list
        fetchReportsData();
        console.log('Report generated with ID:', response.report_id);
      } else {
        toast.error('Failed to generate report: ' + response.message);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error generating report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCombineReports = async (dateRange, reportTypes = ['all']) => {
    setIsLoading(true);
    try {
      toast.info('Generating PDF... Please wait.');
      
      // Check if jsPDF is available
      if (typeof jsPDF === 'undefined') {
        throw new Error('PDF library not loaded. Please refresh the page and try again.');
      }
      
      // Fetch reports data
      const response = await fetchWithCORS(`${API_BASE_URL}/combined_reports_api.php`, {
        method: 'POST',
        headers: {
        },
        body: JSON.stringify({
          action: 'get_reports_data',
          start_date: dateRange.start,
          end_date: dateRange.end,
          report_types: reportTypes
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports data');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        toast.error(data.message || 'No reports found for the selected date range');
        return;
      }
      
      const reports = data.reports || [];
      
      if (reports.length === 0) {
        toast.error('No data found for the selected date range');
        return;
      }
      
      console.log('📄 Creating PDF document...');
      
      // Create PDF with simplified approach
      const pdf = new jsPDF('p', 'mm', 'a4');
      let yPosition = 20;
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      // Helper function to add text with word wrap
      const addTextWithWrap = (text, fontSize = 10, isBold = false) => {
        pdf.setFontSize(fontSize);
        if (isBold) {
          pdf.setFont(undefined, 'bold');
        } else {
          pdf.setFont(undefined, 'normal');
        }
        
        const lines = pdf.splitTextToSize(text, contentWidth);
        pdf.text(lines, margin, yPosition);
        yPosition += lines.length * (fontSize * 0.35);
        
        // Check if we need a new page
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = 20;
        }
      };
      
      // Header
      addTextWithWrap('ENGUIO PHARMACY SYSTEM', 16, true);
      addTextWithWrap('Combined Reports', 12, true);
      addTextWithWrap('', 8);
      
      // Report Information
      addTextWithWrap('Report Information:', 10, true);
      addTextWithWrap(`Date Range: ${dateRange.start} to ${dateRange.end}`, 9);
      addTextWithWrap(`Generated: ${new Date().toLocaleDateString('en-PH')} at ${new Date().toLocaleTimeString('en-PH')}`, 9);
      addTextWithWrap(`Generated by: System`, 9);
      addTextWithWrap(`Total Reports: ${reports.length}`, 9);
      addTextWithWrap('', 8);
      
      // Create table header
      const columns = ['Product Name', 'Barcode', 'Category', 'Qty', 'SRP', 'Type', 'Reference', 'Date', 'Location', 'Brand'];
      const cellWidth = contentWidth / columns.length;
      const cellHeight = 6;
      
      // Draw table header
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');
      let xPos = margin;
      columns.forEach((column) => {
        // Draw cell background
        pdf.setFillColor(200, 200, 200);
        pdf.rect(xPos, yPosition - 4, cellWidth, cellHeight, 'F');
        
        // Draw cell border
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(xPos, yPosition - 4, cellWidth, cellHeight);
        
        // Add text
        const text = column.substring(0, 12); // Limit text length
        pdf.text(text, xPos + 2, yPosition);
        xPos += cellWidth;
      });
      
      yPosition += cellHeight + 2;
      
      // Draw data rows
      pdf.setFont(undefined, 'normal');
      const limitedData = reports.slice(0, 50); // Limit for PDF size
      limitedData.forEach((item, rowIndex) => {
        xPos = margin;
        const isEvenRow = rowIndex % 2 === 0;
        
        // Alternate row background
        if (!isEvenRow) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(margin, yPosition - 4, contentWidth, cellHeight, 'F');
        }
        
        const rowData = [
          (item.product_name || '').substring(0, 15),
          (item.barcode || '').substring(0, 12),
          (item.category || '').substring(0, 10),
          (item.quantity?.toLocaleString() || ''),
          `₱${parseFloat(item.srp || 0).toFixed(2)}`,
          (item.movement_type || '').substring(0, 8),
          (item.reference_no || '').substring(0, 12),
          (item.movement_date || '').substring(0, 8),
          (item.location_name || '').substring(0, 8),
          (item.brand || '').substring(0, 8)
        ];
        
        rowData.forEach((cellValue, colIndex) => {
          // Draw cell border
          pdf.setDrawColor(0, 0, 0);
          pdf.rect(xPos, yPosition - 4, cellWidth, cellHeight);
          
          // Add text
          pdf.text(cellValue.toString(), xPos + 2, yPosition);
          xPos += cellWidth;
        });
        
        yPosition += cellHeight + 2;
        
        // Check if we need a new page
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = 20;
        }
      });
      
      if (reports.length > 50) {
        addTextWithWrap(`Showing 50 of ${reports.length} records`, 8);
      }
      
      // Save PDF
      const fileName = `Combined_Reports_${dateRange.start}_to_${dateRange.end}.pdf`;
      
      console.log('💾 Saving PDF:', fileName);
      
      // Simple save method
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
      
    } catch (error) {
      console.error('Error combining reports:', error);
      toast.error('Error generating PDF: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCombine = async (quickSelect) => {
    const today = new Date();
    let startDate, endDate;
    
    switch (quickSelect) {
      case 'today':
        startDate = endDate = today.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = endDate = yesterday.toISOString().split('T')[0];
        break;
      case 'this_week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = endOfWeek.toISOString().split('T')[0];
        break;
      case 'last_week':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        startDate = lastWeekStart.toISOString().split('T')[0];
        endDate = lastWeekEnd.toISOString().split('T')[0];
        break;
      case 'this_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'last_month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        startDate = lastMonth.toISOString().split('T')[0];
        endDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
        break;
      default:
        toast.error('Invalid quick select option');
        return;
    }
    
    // Call the real combine reports function
    await handleCombineReports({ start: startDate, end: endDate });
  };

  const handleDownload = async (report) => {
    if (reportDetails.length === 0) {
      toast.info('No data to download');
      return;
    }

    try {
      toast.info('Generating PDF... Please wait.');
      
      // Check if jsPDF is available
      if (typeof jsPDF === 'undefined') {
        throw new Error('PDF library not loaded. Please refresh the page and try again.');
      }
      
      console.log('📄 Creating PDF document...');
      
      // Create PDF with simplified approach
      const pdf = new jsPDF('p', 'mm', 'a4');
      let yPosition = 20;
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      // Helper function to add text with word wrap
      const addTextWithWrap = (text, fontSize = 10, isBold = false) => {
        pdf.setFontSize(fontSize);
        if (isBold) {
          pdf.setFont(undefined, 'bold');
        } else {
          pdf.setFont(undefined, 'normal');
        }
        
        const lines = pdf.splitTextToSize(text, contentWidth);
        pdf.text(lines, margin, yPosition);
        yPosition += lines.length * (fontSize * 0.35);
        
        // Check if we need a new page
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = 20;
        }
      };
      
      // Header
      addTextWithWrap('ENGUIO PHARMACY SYSTEM', 16, true);
      addTextWithWrap('Inventory Management Report', 12, true);
      addTextWithWrap('', 8);
      
      // Report Information
      addTextWithWrap(`${report.title}`, 12, true);
      addTextWithWrap(`Generated on: ${report.date} at ${report.time}`, 9);
      addTextWithWrap(`Generated by: ${report.generatedBy}`, 9);
      addTextWithWrap(`Report Type: ${report.type}`, 9);
      addTextWithWrap(`Status: ${report.status}`, 9);
      addTextWithWrap(`File Format: ${report.format}`, 9);
      addTextWithWrap(`File Size: ${report.fileSize}`, 9);
      addTextWithWrap('', 8);
      
      // Description
      if (report.description) {
        addTextWithWrap('Description:', 10, true);
        addTextWithWrap(report.description, 9);
        addTextWithWrap('', 8);
      }
      
      // Create table header
      const columns = ['Product Name', 'Barcode', 'Category', 'Qty', 'SRP', 'Movement', 'Ref No', 'Date', 'Location', 'Brand'];
      const cellWidth = contentWidth / columns.length;
      const cellHeight = 6;
      
      // Draw table header
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');
      let xPos = margin;
      columns.forEach((column) => {
        // Draw cell background
        pdf.setFillColor(200, 200, 200);
        pdf.rect(xPos, yPosition - 4, cellWidth, cellHeight, 'F');
        
        // Draw cell border
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(xPos, yPosition - 4, cellWidth, cellHeight);
        
        // Add text
        const text = column.substring(0, 12); // Limit text length
        pdf.text(text, xPos + 2, yPosition);
        xPos += cellWidth;
      });
      
      yPosition += cellHeight + 2;
      
      // Draw data rows
      pdf.setFont(undefined, 'normal');
      const limitedData = reportDetails.slice(0, 50); // Limit for PDF size
      limitedData.forEach((item, rowIndex) => {
        xPos = margin;
        const isEvenRow = rowIndex % 2 === 0;
        
        // Alternate row background
        if (!isEvenRow) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(margin, yPosition - 4, contentWidth, cellHeight, 'F');
        }
        
        const rowData = [
          (item.product_name || '').substring(0, 15),
          (item.barcode || '').substring(0, 12),
          (item.category || '').substring(0, 10),
          (item.quantity?.toLocaleString() || ''),
          `₱${parseFloat(item.srp || 0).toFixed(2)}`,
          (item.movement_type || '').substring(0, 8),
          (item.reference_no || '').substring(0, 12),
          (item.date || '').substring(0, 8),
          (item.location_name || '').substring(0, 8),
          (item.brand || '').substring(0, 8)
        ];
        
        rowData.forEach((cellValue, colIndex) => {
          // Draw cell border
          pdf.setDrawColor(0, 0, 0);
          pdf.rect(xPos, yPosition - 4, cellWidth, cellHeight);
          
          // Add text
          pdf.text(cellValue.toString(), xPos + 2, yPosition);
          xPos += cellWidth;
        });
        
        yPosition += cellHeight + 2;
        
        // Check if we need a new page
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = 20;
        }
      });
      
      if (reportDetails.length > 50) {
        addTextWithWrap(`Showing 50 of ${reportDetails.length} records`, 8);
      }
      
      // Footer
      addTextWithWrap('', 8);
      addTextWithWrap(`This report was generated by Enguio Pharmacy System on ${new Date().toLocaleString()}`, 8);
      addTextWithWrap('For questions or support, please contact your system administrator.', 8);
      
      // Save PDF
      const fileName = `${report.title.replace(/\s+/g, '_')}_${report.date}.pdf`;
      
      console.log('💾 Saving PDF:', fileName);
      
      // Simple save method
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
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const handleCSVExport = async (report) => {
    if (reportDetails.length === 0) {
      toast.info('No data to export');
      return;
    }

    try {
      toast.info('Generating CSV... Please wait.');
      
      // Create CSV content
      let csvContent = 'ENGUIO PHARMACY SYSTEM - INVENTORY REPORT\n';
      csvContent += `Report: ${report.title}\n`;
      csvContent += `Generated: ${report.date} at ${report.time}\n`;
      csvContent += `Generated by: ${report.generatedBy}\n`;
      csvContent += `Report Type: ${report.type}\n`;
      csvContent += `Status: ${report.status}\n\n`;
      
      // CSV Headers
      const headers = ['Product Name', 'Barcode', 'Category', 'Quantity', 'SRP', 'Movement Type', 'Reference No', 'Date', 'Location', 'Supplier', 'Brand'];
      csvContent += headers.join(',') + '\n';
      
      // CSV Data
      reportDetails.forEach(item => {
        const rowData = [
          `"${(item.product_name || '').replace(/"/g, '""')}"`,
          `"${(item.barcode || '').replace(/"/g, '""')}"`,
          `"${(item.category || '').replace(/"/g, '""')}"`,
          item.quantity?.toLocaleString() || '',
          `₱${parseFloat(item.srp || 0).toFixed(2)}`,
          `"${(item.movement_type || '').replace(/"/g, '""')}"`,
          `"${(item.reference_no || '').replace(/"/g, '""')}"`,
          `"${(item.date || '').replace(/"/g, '""')}"`,
          `"${(item.location_name || '').replace(/"/g, '""')}"`,
          `"${(item.supplier_name || '').replace(/"/g, '""')}"`,
          `"${(item.brand || '').replace(/"/g, '""')}"`
        ];
        csvContent += rowData.join(',') + '\n';
      });
      
      // Create and download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${report.title.replace(/\s+/g, '_')}_${report.date}.csv`);
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
    }
  };

  const handlePrint = async (report) => {
    if (reportDetails.length === 0) {
      toast.info('No data to print');
      return;
    }

    try {
      toast.info('Generating PDF for printing... Please wait.');
      
      // Check if jsPDF is available
      if (typeof jsPDF === 'undefined') {
        throw new Error('PDF library not loaded. Please refresh the page and try again.');
      }
      
      console.log('📄 Creating PDF document for printing...');
      
      // Create PDF with simplified approach
      const pdf = new jsPDF('p', 'mm', 'a4');
      let yPosition = 20;
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      // Helper function to add text with word wrap
      const addTextWithWrap = (text, fontSize = 10, isBold = false) => {
        pdf.setFontSize(fontSize);
        if (isBold) {
          pdf.setFont(undefined, 'bold');
        } else {
          pdf.setFont(undefined, 'normal');
        }
        
        const lines = pdf.splitTextToSize(text, contentWidth);
        pdf.text(lines, margin, yPosition);
        yPosition += lines.length * (fontSize * 0.35);
        
        // Check if we need a new page
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = 20;
        }
      };
      
      // Header
      addTextWithWrap('ENGUIO PHARMACY SYSTEM', 16, true);
      addTextWithWrap('Inventory Management Report', 12, true);
      addTextWithWrap('', 8);
      
      // Report Information
      addTextWithWrap(`${report.title}`, 12, true);
      addTextWithWrap(`Generated on: ${report.date} at ${report.time}`, 9);
      addTextWithWrap(`Generated by: ${report.generatedBy}`, 9);
      addTextWithWrap(`Report Type: ${report.type}`, 9);
      addTextWithWrap(`Status: ${report.status}`, 9);
      addTextWithWrap(`Print Date: ${new Date().toLocaleDateString()}`, 9);
      addTextWithWrap('', 8);
      
      // Description
      if (report.description) {
        addTextWithWrap('Description:', 10, true);
        addTextWithWrap(report.description, 9);
        addTextWithWrap('', 8);
      }
      
      // Create table header
      const columns = ['Product Name', 'Barcode', 'Category', 'Qty', 'SRP', 'Movement', 'Ref No', 'Date', 'Location', 'Supplier', 'Brand'];
      const cellWidth = contentWidth / columns.length;
      const cellHeight = 6;
      
      // Draw table header
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'bold');
      let xPos = margin;
      columns.forEach((column) => {
        // Draw cell background
        pdf.setFillColor(200, 200, 200);
        pdf.rect(xPos, yPosition - 4, cellWidth, cellHeight, 'F');
        
        // Draw cell border
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(xPos, yPosition - 4, cellWidth, cellHeight);
        
        // Add text
        const text = column.substring(0, 10); // Limit text length for print
        pdf.text(text, xPos + 2, yPosition);
        xPos += cellWidth;
      });
      
      yPosition += cellHeight + 2;
      
      // Draw data rows
      pdf.setFont(undefined, 'normal');
      const limitedData = reportDetails.slice(0, 50); // Limit for PDF size
      limitedData.forEach((item, rowIndex) => {
        xPos = margin;
        const isEvenRow = rowIndex % 2 === 0;
        
        // Alternate row background
        if (!isEvenRow) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(margin, yPosition - 4, contentWidth, cellHeight, 'F');
        }
        
        const rowData = [
          (item.product_name || '').substring(0, 12),
          (item.barcode || '').substring(0, 10),
          (item.category || '').substring(0, 8),
          (item.quantity?.toLocaleString() || ''),
          `₱${parseFloat(item.srp || 0).toFixed(2)}`,
          (item.movement_type || '').substring(0, 6),
          (item.reference_no || '').substring(0, 10),
          (item.date || '').substring(0, 6),
          (item.location_name || '').substring(0, 8),
          (item.supplier_name || '').substring(0, 8),
          (item.brand || '').substring(0, 6)
        ];
        
        rowData.forEach((cellValue, colIndex) => {
          // Draw cell border
          pdf.setDrawColor(0, 0, 0);
          pdf.rect(xPos, yPosition - 4, cellWidth, cellHeight);
          
          // Add text
          pdf.text(cellValue.toString(), xPos + 2, yPosition);
          xPos += cellWidth;
        });
        
        yPosition += cellHeight + 2;
        
        // Check if we need a new page
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = 20;
        }
      });
      
      if (reportDetails.length > 50) {
        addTextWithWrap(`Showing 50 of ${reportDetails.length} records`, 8);
      }
      
      // Footer
      addTextWithWrap('', 8);
      addTextWithWrap(`This report was generated by Enguio Pharmacy System on ${new Date().toLocaleString()}`, 8);
      addTextWithWrap('For questions or support, please contact your system administrator.', 8);
      
      // Open PDF in new window for printing
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
        };
        toast.success('📄 PDF opened for printing');
      } else {
        throw new Error('Unable to open print window. Please check your browser settings.');
      }
      
    } catch (error) {
      console.error('Error generating PDF for printing:', error);
      toast.error('Failed to generate PDF for printing. Please try again.');
    }
  };

  const reportTypes = ["all", "Stock In Report", "Stock Out Report", "Stock Adjustment Report", "Transfer Report"];
  const dateRanges = ["all", "today", "week", "month"];

  const pages = Math.ceil(filteredReports.length / rowsPerPage);
  const items = filteredReports.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Calculate statistics
  const totalReports = filteredReports.length;
  const completedReports = filteredReports.filter(r => r.status === 'Completed').length;
  const inProgressReports = filteredReports.filter(r => r.status === 'In Progress').length;
  const totalFileSize = filteredReports.reduce((sum, r) => {
    const size = parseFloat(r.fileSize.replace(' MB', ''));
    return sum + size;
  }, 0);

  // Generate colors for categories
  const categoryColors = [
    "bg-green-500", "bg-gray-500", "bg-yellow-500", 
    "bg-purple-500", "bg-red-500", "bg-indigo-500"
  ];

  // Theme-based styles
  const themeStyles = {
    container: {
      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
      color: isDarkMode ? '#f1f5f9' : '#1e293b'
    },
    card: {
      backgroundColor: isDarkMode ? '#334155' : '#ffffff',
      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
      boxShadow: isDarkMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    text: {
      primary: isDarkMode ? '#f1f5f9' : '#1e293b',
      secondary: isDarkMode ? '#cbd5e1' : '#64748b',
      muted: isDarkMode ? '#94a3b8' : '#94a3b8'
    },
    border: {
      color: isDarkMode ? '#475569' : '#e2e8f0',
      light: isDarkMode ? '#64748b' : '#f1f5f9'
    },
    input: {
      backgroundColor: isDarkMode ? '#334155' : '#ffffff',
      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
      color: isDarkMode ? '#f1f5f9' : '#1e293b',
      placeholderColor: isDarkMode ? '#94a3b8' : '#94a3b8'
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-screen" style={themeStyles.container}>
      <div style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%', minHeight: '125vh' }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold" style={{ color: themeStyles.text.primary }}>Reports</h1>
              {/* System Update Notification Indicator */}
              {hasReportsUpdates() && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <FaBell className="h-6 w-6 text-orange-500 animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                  </div>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      isDarkMode 
                        ? 'text-orange-300 bg-orange-900/30 border border-orange-700' 
                        : 'text-orange-600 bg-orange-100 border border-orange-300'
                    }`}>
                    System Updates Available
                  </span>
                  <button
                    onClick={() => {
                      clearNotifications('reports');
                      clearSystemUpdates();
                      toast.success('Notifications cleared');
                    }}
                      className={`ml-2 p-1 transition-colors ${
                        isDarkMode 
                          ? 'text-orange-300 hover:text-orange-200' 
                          : 'text-orange-600 hover:text-orange-800'
                      }`}
                    title="Clear notifications"
                  >
                    <FaTimes className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <p style={{ color: themeStyles.text.secondary }}>Generate and manage inventory reports and analytics</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              autoRefresh 
                ? 'bg-orange-600 text-white hover:bg-orange-700' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
          </button>
          <button 
            onClick={() => setShowCombineModal(true)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <FaFileAlt className="h-4 w-4" />
            Combine Reports
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className={`flex items-center justify-between p-4 rounded-xl border ${
        isDarkMode 
          ? 'bg-gradient-to-r from-slate-800/50 to-purple-900/20 border-slate-700' 
          : 'bg-gradient-to-r from-gray-50 to-purple-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className={`text-sm font-medium ${
            isDarkMode ? 'text-slate-200' : 'text-slate-700'
          }`}>
            {autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
          </span>
          <span className={`text-xs ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            (Every {refreshInterval / 1000}s)
          </span>
          {isLoading && (
            <div className={`flex items-center gap-2 ${
              isDarkMode ? 'text-slate-400' : 'text-gray-600'
            }`}>
              <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
                isDarkMode ? 'border-slate-400' : 'border-gray-600'
              }`}></div>
              <span className="text-xs font-medium">Updating...</span>
            </div>
          )}
        </div>
        <div className={`text-sm ${
          isDarkMode ? 'text-slate-400' : 'text-slate-600'
        }`}>
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-600/20"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-gray-100 text-sm font-medium mb-1">Total Products</p>
              <p className="text-3xl font-bold">{analyticsData.totalProducts?.toLocaleString() || 0}</p>
              <p className="text-gray-200 text-xs mt-1">Active inventory items</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Total Reports</p>
              <p className="text-3xl font-bold">{totalReports}</p>
              <p className="text-emerald-200 text-xs mt-1">Generated reports</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <FileText className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-green-600/20"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Completed</p>
              <p className="text-3xl font-bold">{completedReports}</p>
              <p className="text-green-200 text-xs mt-1">Successfully processed</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <CheckCircle className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-amber-600/20"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium mb-1">In Progress</p>
              <p className="text-3xl font-bold">{inProgressReports}</p>
              <p className="text-amber-200 text-xs mt-1">Currently processing</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Clock className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-purple-600/20"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Total Size</p>
              <p className="text-3xl font-bold">{totalFileSize.toFixed(1)} MB</p>
              <p className="text-purple-200 text-xs mt-1">Data storage used</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      {topCategories.length > 0 && (
        <div className={`relative overflow-hidden rounded-2xl p-8 shadow-xl border ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' 
            : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
          <div className="relative">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <PieChart className="h-6 w-6 text-white" />
          </div>
              <div>
                <h3 className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>Top Categories Distribution</h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>Product category breakdown</p>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-200 dark:scrollbar-thumb-slate-600 dark:scrollbar-track-slate-700">
            {topCategories.map((category, index) => (
                <div key={index} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${categoryColors[index % categoryColors.length]} shadow-sm`}></div>
                      <span className={`font-semibold ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                      }`}>{category.category_name}</span>
                </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}>{category.product_count} products</span>
                      <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                        isDarkMode 
                          ? 'text-white bg-slate-700 border border-slate-600' 
                          : 'text-slate-800 bg-slate-100 border border-slate-300'
                      }`}>
                        {category.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className={`w-full rounded-full h-3 overflow-hidden ${
                      isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                    }`}>
                      <div 
                        className={`h-3 rounded-full transition-all duration-1000 ease-out ${categoryColors[index % categoryColors.length]} shadow-sm`}
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className={`relative overflow-hidden rounded-xl p-4 shadow-lg border ${
        isDarkMode 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-white border-slate-200'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
            <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
              <FaFilter className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>Search & Filter Reports</h3>
              <p className={`text-xs ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>Find specific reports quickly</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className={`block text-xs font-medium mb-1 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>Search Reports</label>
              <div className="relative group">
                <FaFilter className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 transition-colors ${
                  isDarkMode ? 'text-slate-400 group-focus-within:text-slate-300' : 'text-slate-400 group-focus-within:text-gray-500'
                }`} />
              <input
                type="text"
                  placeholder="Search by title, type, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
              />
            </div>
          </div>
          <div>
              <label className={`block text-xs font-medium mb-1 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>Report Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              {reportTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All Types" : type}
                </option>
              ))}
            </select>
          </div>
          <div>
              <label className={`block text-xs font-medium mb-1 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>Date Range</label>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
            >
              {dateRanges.map((range) => (
                <option key={range} value={range}>
                  {range === "all" ? "All Time" : 
                   range === "today" ? "Today" :
                   range === "week" ? "Last 7 Days" :
                   range === "month" ? "Last 30 Days" : range}
                </option>
              ))}
            </select>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className={`relative overflow-hidden rounded-2xl shadow-xl border ${
        isDarkMode 
          ? 'bg-slate-800 border-slate-700' 
          : 'bg-white border-slate-200'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
        <div className="relative">
          <div className={`px-8 py-6 border-b ${
            isDarkMode ? 'border-slate-700' : 'border-slate-200'
          }`}>
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <FaFileAlt className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>Generated Reports</h3>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>Manage and view all your reports</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-full ${
                  isDarkMode ? 'bg-slate-700' : 'bg-slate-100'
                }`}>
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
              {filteredReports.length} reports found
                  </span>
                </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
            <table className="w-full min-w-max">
              <thead className={`bg-gradient-to-r border-b sticky top-0 z-10 ${
                isDarkMode 
                  ? 'from-slate-700 to-slate-800 border-slate-600' 
                  : 'from-slate-50 to-slate-100 border-slate-200'
              }`}>
              <tr>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                  REPORT TITLE
                </th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                  TYPE
                </th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                  GENERATED BY
                </th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                  DATE & TIME
                </th>
                  <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                  STATUS
                </th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                  FILE INFO
                </th>
                  <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                  ACTIONS
                </th>
              </tr>
            </thead>
              <tbody className={`divide-y ${
                isDarkMode 
                  ? 'bg-slate-800 divide-slate-700' 
                  : 'bg-white divide-slate-200'
              }`}>
                {items.map((item, index) => (
                  <tr key={item.movement_id} className={`transition-all duration-200 group ${
                    isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
                  }`}>
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                          <FaFileAlt className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-semibold truncate ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>{item.title}</div>
                          <div className={`text-sm truncate max-w-xs ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>{item.description}</div>
                        </div>
                    </div>
                  </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${getTypeColor(item.type)}`}>
                      <FaFileAlt className="h-3 w-3" />
                      {item.type}
                    </span>
                  </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{item.generatedBy?.charAt(0) || 'A'}</span>
                        </div>
                        <span className={`text-sm font-medium ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>{item.generatedBy}</span>
                      </div>
                  </td>
                    <td className="px-6 py-5">
                      <div className="text-sm">
                        <div className={`font-semibold ${
                          isDarkMode ? 'text-white' : 'text-slate-800'
                        }`}>{item.date}</div>
                        <div className={`${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>{item.time}</div>
                    </div>
                  </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${getStatusColor(item.status)}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          item.status === 'Completed' ? 'bg-green-500' :
                          item.status === 'In Progress' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></div>
                      {item.status}
                    </span>
                  </td>
                    <td className="px-6 py-5">
                      <div className="text-sm">
                        <div className={`font-semibold ${
                          isDarkMode ? 'text-white' : 'text-slate-800'
                        }`}>{item.format}</div>
                        <div className={`${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>{item.fileSize}</div>
                    </div>
                  </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex justify-center gap-1">
                      <button 
                        onClick={() => handleViewDetails(item)}
                          className={`p-2 rounded-lg transition-all duration-200 group ${
                            isDarkMode 
                              ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50' 
                              : 'text-gray-500 hover:text-gray-600 hover:bg-gray-50'
                          }`}
                          title="View Details"
                      >
                          <FaEye className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={() => handleDownload(item)}
                          className={`p-2 rounded-lg transition-all duration-200 group ${
                            isDarkMode 
                              ? 'text-green-400 hover:text-green-300 hover:bg-green-900/20' 
                              : 'text-green-500 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title="Download"
                      >
                          <FaDownload className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={() => handlePrint(item)}
                          className={`p-2 rounded-lg transition-all duration-200 group ${
                            isDarkMode 
                              ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-900/20' 
                              : 'text-purple-500 hover:text-purple-600 hover:bg-purple-50'
                          }`}
                          title="Print"
                      >
                          <FaPrint className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={() => handleCSVExport(item)}
                          className={`p-2 rounded-lg transition-all duration-200 group ${
                            isDarkMode 
                              ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20' 
                              : 'text-blue-500 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                          title="Export CSV"
                      >
                          📊
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
            <div className={`px-8 py-6 border-t ${
              isDarkMode ? 'border-slate-700' : 'border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`text-sm ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Showing {((page - 1) * rowsPerPage) + 1} to {Math.min(page * rowsPerPage, filteredReports.length)} of {filteredReports.length} reports
                </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                    className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
                      isDarkMode 
                        ? 'text-slate-300 bg-slate-700 border border-slate-600 hover:bg-slate-600' 
                        : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                    }`}
              >
                Previous
              </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(pages - 4, page - 2)) + i;
                      if (pageNum > pages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                            pageNum === page
                              ? 'text-white shadow-lg bg-blue-600'
                              : isDarkMode 
                                ? 'text-slate-300 bg-slate-700 border border-slate-600 hover:bg-slate-600' 
                                : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
              <button
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page === pages}
                    className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
                      isDarkMode 
                        ? 'text-slate-300 bg-slate-700 border border-slate-600 hover:bg-slate-600' 
                        : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                    }`}
              >
                Next
              </button>
                </div>
            </div>
          </div>
        )}
        </div>
      </div>
     

      {/* Report Details Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-3xl w-full max-h-[40vh] overflow-hidden border-2 ${
            isDarkMode 
              ? 'bg-slate-800 border-blue-500 shadow-blue-500/20' 
              : 'bg-white border-blue-600 shadow-blue-600/20'
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b ${
              isDarkMode ? 'border-slate-700' : 'border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-xl font-semibold ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {selectedReport?.title}
                  </h2>
                  <p className={`text-sm mt-1 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Report Details - {selectedReport?.type}
                  </p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                  }`}
                >
                  <FaTimes className={`h-5 w-5 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(40vh-140px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                    isDarkMode ? 'border-slate-400' : 'border-gray-500'
                  }`}></div>
                  <span className={`ml-3 ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>Loading report details...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Report Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-slate-700/50 border-slate-600' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <FaInfoCircle className={`h-5 w-5 ${
                          isDarkMode ? 'text-slate-400' : 'text-gray-600'
                        }`} />
                    <div>
                          <p className={`text-xs font-medium ${
                            isDarkMode ? 'text-slate-400' : 'text-gray-600'
                          }`}>Report Type</p>
                          <p className={`text-sm font-semibold ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>{selectedReport?.type}</p>
                        </div>
                        </div>
                    </div>
                    
                    <div className={`p-4 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-green-900/20 border-green-700' 
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <FaCheckCircle className={`h-5 w-5 ${
                          isDarkMode ? 'text-green-400' : 'text-green-600'
                        }`} />
                        <div>
                          <p className={`text-xs font-medium ${
                            isDarkMode ? 'text-green-400' : 'text-green-600'
                          }`}>Status</p>
                          <p className={`text-sm font-semibold ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>{selectedReport?.status}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`p-4 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-purple-900/20 border-purple-700' 
                        : 'bg-purple-50 border-purple-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <FaFileAlt className={`h-5 w-5 ${
                          isDarkMode ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                    <div>
                          <p className={`text-xs font-medium ${
                            isDarkMode ? 'text-purple-400' : 'text-purple-600'
                          }`}>File Format</p>
                          <p className={`text-sm font-semibold ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>{selectedReport?.format}</p>
                        </div>
                        </div>
                    </div>
                    
                    <div className={`p-4 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-orange-900/20 border-orange-700' 
                        : 'bg-orange-50 border-orange-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <FaWeight className={`h-5 w-5 ${
                          isDarkMode ? 'text-orange-400' : 'text-orange-600'
                        }`} />
                        <div>
                          <p className={`text-xs font-medium ${
                            isDarkMode ? 'text-orange-400' : 'text-orange-600'
                          }`}>File Size</p>
                          <p className={`text-sm font-semibold ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>{selectedReport?.fileSize}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className={`p-4 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <h3 className={`text-sm font-semibold mb-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>Description</h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {selectedReport?.description}
                    </p>
                  </div>

                  {/* Generated On */}
                  <div className={`p-4 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-indigo-900/20 border-indigo-700' 
                      : 'bg-indigo-50 border-indigo-200'
                  }`}>
                    <h3 className={`text-sm font-semibold mb-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>Generated On</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                        <p className={`text-xs ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>Date</p>
                        <p className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>{selectedReport?.date}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>Time</p>
                        <p className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>{selectedReport?.time}</p>
                      </div>
                    </div>
                  </div>

                  {/* Report Line Items */}
                  {reportDetails.length > 0 && (
                    <div className={`rounded-lg border overflow-hidden ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600' 
                        : 'bg-white border-slate-200'
                    }`}>
                      <div className={`px-4 py-3 border-b ${
                        isDarkMode 
                          ? 'bg-slate-600 border-slate-600' 
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <h3 className={`text-sm font-semibold ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          Report Line Items ({reportDetails.length} items)
                        </h3>
                    </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className={isDarkMode ? 'bg-slate-600' : 'bg-slate-100'}>
                            <tr>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>Product Name</th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>Barcode</th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>Category</th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>Quantity</th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>SRP</th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>Movement Type</th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>Reference No</th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>Date</th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>Time</th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>Location</th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>Supplier</th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>Brand</th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>Expiration Date</th>
                              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                              }`}>Notes</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${
                            isDarkMode 
                              ? 'bg-slate-700 divide-slate-600' 
                              : 'bg-white divide-slate-200'
                          }`}>
                            {reportDetails.map((item, index) => (
                              <tr key={index} className={`transition-colors duration-150 ${
                                isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-50'
                              }`}>
                                <td className={`px-3 py-2 text-sm font-medium ${
                                  isDarkMode ? 'text-white' : 'text-slate-900'
                                }`}>{item.product_name || ''}</td>
                                <td className={`px-3 py-2 text-sm ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>{item.barcode || ''}</td>
                                <td className={`px-3 py-2 text-sm ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>{item.category || ''}</td>
                                <td className={`px-3 py-2 text-sm ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>{item.quantity || ''}</td>
                                <td className={`px-3 py-2 text-sm ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>₱{parseFloat(item.srp || 0).toFixed(2)}</td>
                                <td className="px-3 py-2 text-sm">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    item.movement_type === 'IN' ? 
                                      (isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800') :
                                    item.movement_type === 'OUT' ? 
                                      (isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800') :
                                    item.movement_type === 'ADJUSTMENT' ? 
                                      (isDarkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800') :
                                      (isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800')
                                  }`}>
                                    {item.movement_type || ''}
                                  </span>
                                </td>
                                <td className={`px-3 py-2 text-sm ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>{item.reference_no || ''}</td>
                                <td className={`px-3 py-2 text-sm ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>{item.date || ''}</td>
                                <td className={`px-3 py-2 text-sm ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>{item.time || ''}</td>
                                <td className={`px-3 py-2 text-sm ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>{item.location_name || ''}</td>
                                <td className={`px-3 py-2 text-sm ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>{item.supplier_name || ''}</td>
                                <td className={`px-3 py-2 text-sm ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>{item.brand || ''}</td>
                                <td className={`px-3 py-2 text-sm ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>{item.expiration_date || ''}</td>
                                <td className={`px-3 py-2 text-sm ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>{item.notes || ''}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className={isDarkMode ? 'bg-green-900/20' : 'bg-green-50'}>
                            <tr>
                              <td colSpan="13" className={`px-3 py-2 text-center text-sm font-semibold ${
                                isDarkMode ? 'text-white' : 'text-slate-900'
                              }`}>End of Report</td>
                            </tr>
                          </tfoot>
                        </table>
                  </div>
                </div>
              )}
            </div>
              )}
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t ${
              isDarkMode 
                ? 'border-slate-700 bg-slate-800' 
                : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex justify-end gap-3">
              <button 
                onClick={() => handleDownload(selectedReport)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                <FaDownload className="h-4 w-4" />
                  Download PDF
              </button>
              <button 
                onClick={() => handlePrint(selectedReport)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
              >
                <FaPrint className="h-4 w-4" />
                  Print Report
              </button>
              <button 
                onClick={() => handleCSVExport(selectedReport)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                📊
                  Export CSV
              </button>
              <button 
                onClick={() => setShowModal(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200"
              >
                  <FaTimes className="h-4 w-4" />
                Close
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Combined Reports Modal */}
      {showCombineModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl w-full max-w-2xl h-auto max-h-[80vh] overflow-hidden border-2 ${
            isDarkMode 
              ? 'bg-slate-800 border-purple-500 shadow-purple-500/20' 
              : 'bg-white border-purple-600 shadow-purple-600/20'
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b ${
              isDarkMode ? 'border-slate-700' : 'border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-xl font-semibold ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    Combine Reports
                  </h2>
                  <p className={`text-sm mt-1 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Select date range and report types to combine into a single PDF
                  </p>
                </div>
                <button 
                  onClick={() => setShowCombineModal(false)}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                  }`}
                >
                  <FaTimes className={`h-5 w-5 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
              <div className="space-y-6">
                {/* Quick Select Options */}
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>Quick Select</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'today', label: 'Today' },
                      { key: 'yesterday', label: 'Yesterday' },
                      { key: 'this_week', label: 'This Week' },
                      { key: 'last_week', label: 'Last Week' },
                      { key: 'this_month', label: 'This Month' },
                      { key: 'last_month', label: 'Last Month' }
                    ].map((option) => (
                      <button
                        key={option.key}
                        onClick={() => handleQuickCombine(option.key)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Range */}
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>Custom Date Range</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={combineStartDate}
                        onChange={(e) => setCombineStartDate(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        End Date
                      </label>
                      <input
                        type="date"
                        value={combineEndDate}
                        onChange={(e) => setCombineEndDate(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Report Types Selection */}
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>Report Types</h3>
                  <div className="space-y-2">
                    {[
                      { key: 'all', label: 'All Reports' },
                      { key: 'stock_in', label: 'Stock In Reports' },
                      { key: 'stock_out', label: 'Stock Out Reports' },
                      { key: 'stock_adjustment', label: 'Stock Adjustment Reports' },
                      { key: 'transfer', label: 'Transfer Reports' }
                    ].map((type) => (
                      <label key={type.key} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedReportTypes.includes(type.key)}
                          onChange={(e) => {
                            if (type.key === 'all') {
                              setSelectedReportTypes(['all']);
                            } else {
                              const newTypes = selectedReportTypes.filter(t => t !== 'all');
                              if (e.target.checked) {
                                setSelectedReportTypes([...newTypes, type.key]);
                              } else {
                                setSelectedReportTypes(newTypes.length > 0 ? newTypes : ['all']);
                              }
                            }
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className={`text-sm ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t ${
              isDarkMode 
                ? 'border-slate-700 bg-slate-800' 
                : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => {
                    if (combineStartDate && combineEndDate) {
                      handleCombineReports(
                        { start: combineStartDate, end: combineEndDate },
                        selectedReportTypes
                      );
                      setShowCombineModal(false);
                    } else {
                      toast.error('Please select both start and end dates');
                    }
                  }}
                  disabled={isLoading || !combineStartDate || !combineEndDate}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors duration-200"
                >
                  <FaFileAlt className="h-4 w-4" />
                  Combine Reports
                </button>
                <button 
                  onClick={() => setShowCombineModal(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200"
                >
                  <FaTimes className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
 </div>


  );
};

export default Reports; 