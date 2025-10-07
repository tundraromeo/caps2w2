"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useAPI } from "../hooks/useAPI";
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
      
      // Fetch reports data
      const response = await fetch('http://localhost/caps2e2/Api/combined_reports_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: #f8fafc; border: 2px solid #000000;">
          <div style="font-size: 24px; font-weight: bold; color: #000000; margin-bottom: 5px;">ENGUIO PHARMACY SYSTEM</div>
          <div style="font-size: 14px; color: #000000;">Combined Reports</div>
        </div>
        
        <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #000000;">
          <div style="font-size: 20px; font-weight: bold; color: #000000; margin-bottom: 10px;">Combined Reports</div>
          <div style="font-size: 12px; color: #000000; margin: 2px 0;">Date Range: ${dateRange.start} to ${dateRange.end}</div>
          <div style="font-size: 12px; color: #000000; margin: 2px 0;">Generated on: ${new Date().toLocaleString()}</div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #f1f5f9; border-left: 4px solid #000000;">
          <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Report Summary</div>
          <div style="display: table; width: 100%;">
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">Total Reports:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">${reports.length}</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">Date Range:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">${dateRange.start} to ${dateRange.end}</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">Generated By:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">System</div>
            </div>
          </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px;">
          <thead>
            <tr style="background: #e0e0e0; color: #000000;">
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Product Name</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Barcode</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Category</th>
              <th style="padding: 8px 4px; text-align: right; font-weight: bold; border: 1px solid #000000; color: #000000;">Quantity</th>
              <th style="padding: 8px 4px; text-align: right; font-weight: bold; border: 1px solid #000000; color: #000000;">SRP</th>
              <th style="padding: 8px 4px; text-align: center; font-weight: bold; border: 1px solid #000000; color: #000000;">Movement Type</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Reference No</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Date</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Location</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Supplier</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Brand</th>
            </tr>
          </thead>
          <tbody>
            ${reports.map((item, index) => `
              <tr style="${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;"><strong>${item.product_name || ''}</strong></td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.barcode || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.category || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; text-align: right; color: #000000;">${item.quantity?.toLocaleString() || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; text-align: right; color: #000000;">₱${parseFloat(item.srp || 0).toFixed(2)}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; text-align: center; color: #000000;">${item.movement_type || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.reference_no || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.movement_date || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.location_name || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.supplier_name || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.brand || ''}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #e0e0e0; color: #000000; font-weight: bold;">
              <td colspan="11" style="padding: 6px 4px; border: 1px solid #000000; text-align: center; color: #000000;"><strong>End of Report</strong></td>
            </tr>
          </tfoot>
        </table>
        
        <div style="margin-top: 30px; text-align: center; color: #000000; font-size: 9px; border-top: 1px solid #000000; padding-top: 10px;">
          <p style="color: #000000;">This report was generated by Enguio Pharmacy System on ${new Date().toLocaleString()}</p>
          <p style="color: #000000;">For questions or support, please contact your system administrator.</p>
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
      
      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save PDF
      const fileName = `Combined_Reports_${dateRange.start}_to_${dateRange.end}.pdf`;
      pdf.save(fileName);
      
      toast.success(`PDF downloaded successfully: ${fileName}`);
      
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
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: #f8fafc; border: 2px solid #000000;">
          <div style="font-size: 24px; font-weight: bold; color: #000000; margin-bottom: 5px;">ENGUIO PHARMACY SYSTEM</div>
          <div style="font-size: 14px; color: #000000;">Inventory Management Report</div>
        </div>
        
        <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #000000;">
          <div style="font-size: 20px; font-weight: bold; color: #000000; margin-bottom: 10px;">${report.title}</div>
          <div style="font-size: 12px; color: #000000; margin: 2px 0;">Generated on: ${report.date} at ${report.time}</div>
          <div style="font-size: 12px; color: #000000; margin: 2px 0;">Generated by: ${report.generatedBy}</div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #f1f5f9; border-left: 4px solid #000000;">
          <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Report Information</div>
          <div style="display: table; width: 100%;">
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">Report Type:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">${report.type}</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">Status:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">${report.status}</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">File Format:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">${report.format}</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">File Size:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">${report.fileSize}</div>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #f1f5f9; border-left: 4px solid #000000;">
          <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Description</div>
          <div style="color: #000000; font-size: 11px;">${report.description}</div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px;">
          <thead>
            <tr style="background: #f0f0f0; color: #000000;">
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Product Name</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Barcode</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Category</th>
              <th style="padding: 8px 4px; text-align: right; font-weight: bold; border: 1px solid #000000; color: #000000;">Qty</th>
              <th style="padding: 8px 4px; text-align: right; font-weight: bold; border: 1px solid #000000; color: #000000;">SRP</th>
              <th style="padding: 8px 4px; text-align: center; font-weight: bold; border: 1px solid #000000; color: #000000;">Movement</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Ref No</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Date</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Location</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Supplier</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Brand</th>
            </tr>
          </thead>
          <tbody>
            ${reportDetails.map((item, index) => `
              <tr style="${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;"><strong>${item.product_name || ''}</strong></td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.barcode || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.category || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; text-align: right; color: #000000;">${item.quantity?.toLocaleString() || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; text-align: right; color: #000000;">₱${parseFloat(item.srp || 0).toFixed(2)}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; text-align: center; color: #000000;">${item.movement_type || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.reference_no || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.date || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.location_name || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.supplier_name || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.brand || ''}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #e0e0e0; color: #000000; font-weight: bold;">
              <td colspan="12" style="padding: 6px 4px; border: 1px solid #000000; text-align: center; color: #000000;"><strong>End of Report</strong></td>
            </tr>
          </tfoot>
        </table>
        
        <div style="margin-top: 30px; text-align: center; color: #000000; font-size: 9px; border-top: 1px solid #000000; padding-top: 10px;">
          <p style="color: #000000;">This report was generated by Enguio Pharmacy System on ${new Date().toLocaleString()}</p>
          <p style="color: #000000;">For questions or support, please contact your system administrator.</p>
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
      
      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save PDF
      const fileName = `${report.title.replace(/\s+/g, '_')}_${report.date}.pdf`;
      pdf.save(fileName);
      
      toast.success(`PDF downloaded successfully: ${fileName}`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = async (report) => {
    if (reportDetails.length === 0) {
      toast.info('No data to print');
      return;
    }

    try {
      toast.info('Generating PDF for printing... Please wait.');
      
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
      
      
      // Create PDF content with professional formatting
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: #f8fafc; border: 2px solid #000000;">
          <div style="font-size: 24px; font-weight: bold; color: #000000; margin-bottom: 5px;">ENGUIO PHARMACY SYSTEM</div>
          <div style="font-size: 14px; color: #000000;">Inventory Management Report</div>
        </div>
        
        <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #000000;">
          <div style="font-size: 20px; font-weight: bold; color: #000000; margin-bottom: 10px;">${report.title}</div>
          <div style="font-size: 12px; color: #000000; margin: 2px 0;">Generated on: ${report.date} at ${report.time}</div>
          <div style="font-size: 12px; color: #000000; margin: 2px 0;">Generated by: ${report.generatedBy}</div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #f1f5f9; border-left: 4px solid #000000;">
          <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Report Information</div>
          <div style="display: table; width: 100%;">
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">Report Type:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">${report.type}</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">Status:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">${report.status}</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">File Format:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">PDF Document</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; font-weight: bold; color: #000000; font-size: 11px; padding: 3px 10px 3px 0; width: 30%;">Print Date:</div>
              <div style="display: table-cell; color: #000000; font-size: 11px; padding: 3px 0;">${new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #f1f5f9; border-left: 4px solid #000000;">
          <div style="font-size: 14px; font-weight: bold; color: #000000; margin-bottom: 10px;">Description</div>
          <div style="color: #000000; font-size: 11px;">${report.description}</div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px;">
          <thead>
            <tr style="background: #f0f0f0; color: #000000;">
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Product Name</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Barcode</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Category</th>
              <th style="padding: 8px 4px; text-align: right; font-weight: bold; border: 1px solid #000000; color: #000000;">Qty</th>
              <th style="padding: 8px 4px; text-align: right; font-weight: bold; border: 1px solid #000000; color: #000000;">SRP</th>
              <th style="padding: 8px 4px; text-align: center; font-weight: bold; border: 1px solid #000000; color: #000000;">Movement</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Ref No</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Date</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Location</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Supplier</th>
              <th style="padding: 8px 4px; text-align: left; font-weight: bold; border: 1px solid #000000; color: #000000;">Brand</th>
            </tr>
          </thead>
          <tbody>
            ${reportDetails.map((item, index) => `
              <tr style="${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;"><strong>${item.product_name || ''}</strong></td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.barcode || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.category || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; text-align: right; color: #000000;">${item.quantity?.toLocaleString() || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; text-align: right; color: #000000;">₱${parseFloat(item.srp || 0).toFixed(2)}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; text-align: center; color: #000000;">${item.movement_type || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.reference_no || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.date || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.location_name || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.supplier_name || ''}</td>
                <td style="padding: 6px 4px; border: 1px solid #000000; vertical-align: top; color: #000000;">${item.brand || ''}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #e0e0e0; color: #000000; font-weight: bold;">
              <td colspan="12" style="padding: 6px 4px; border: 1px solid #000000; text-align: center; color: #000000;"><strong>End of Report</strong></td>
            </tr>
          </tfoot>
        </table>
        
        <div style="margin-top: 30px; text-align: center; color: #000000; font-size: 9px; border-top: 1px solid #000000; padding-top: 10px;">
          <p style="color: #000000;">This report was generated by Enguio Pharmacy System on ${new Date().toLocaleString()}</p>
          <p style="color: #000000;">For questions or support, please contact your system administrator.</p>
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
      
      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Open PDF in new window for printing
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, '_blank');
      
      // Wait for PDF to load then trigger print
      setTimeout(() => {
        if (printWindow) {
          printWindow.print();
          // Clean up URL after printing
          setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
          }, 1000);
        }
      }, 1000);
      
      toast.success(`PDF generated for printing: ${report.title}`);
      
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
      backgroundColor: isDarkMode ? 'var(--inventory-bg-primary)' : 'var(--inventory-bg-primary)',
      color: isDarkMode ? 'var(--inventory-text-primary)' : 'var(--inventory-text-primary)'
    },
    card: {
      backgroundColor: isDarkMode ? 'var(--inventory-bg-card)' : 'var(--inventory-bg-card)',
      borderColor: isDarkMode ? 'var(--inventory-border)' : 'var(--inventory-border)',
      boxShadow: isDarkMode ? 'var(--inventory-shadow)' : 'var(--inventory-shadow)'
    },
    text: {
      primary: isDarkMode ? 'var(--inventory-text-primary)' : 'var(--inventory-text-primary)',
      secondary: isDarkMode ? 'var(--inventory-text-secondary)' : 'var(--inventory-text-secondary)',
      muted: isDarkMode ? 'var(--inventory-text-muted)' : 'var(--inventory-text-muted)'
    },
    border: {
      color: isDarkMode ? 'var(--inventory-border)' : 'var(--inventory-border)',
      light: isDarkMode ? 'var(--inventory-border-light)' : 'var(--inventory-border-light)'
    },
    input: {
      backgroundColor: isDarkMode ? 'var(--inventory-bg-card)' : 'var(--inventory-bg-card)',
      borderColor: isDarkMode ? 'var(--inventory-border)' : 'var(--inventory-border)',
      color: isDarkMode ? 'var(--inventory-text-primary)' : 'var(--inventory-text-primary)',
      placeholderColor: isDarkMode ? 'var(--inventory-text-muted)' : 'var(--inventory-text-muted)'
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-screen" style={themeStyles.container}>
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
                  <span className="text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 px-3 py-1 rounded-full">
                    System Updates Available
                  </span>
                  <button
                    onClick={() => {
                      clearNotifications('reports');
                      clearSystemUpdates();
                      toast.success('Notifications cleared');
                    }}
                    className="ml-2 p-1 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200 transition-colors"
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
            onClick={() => {
              fetchReportsData(true);
              setLastRefresh(new Date());
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <FaChartBar className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
          </select>
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
          <button 
            onClick={() => handleGenerateReport('inventory_summary')}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-md disabled:opacity-50 transition-colors"
            style={{ backgroundColor: theme.colors.accent }}
          >
            <FaChartBar className="h-4 w-4" />
            {isLoading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-900/20 dark:to-purple-900/20 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            (Every {refreshInterval / 1000}s)
          </span>
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <span className="text-xs font-medium">Updating...</span>
            </div>
          )}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-8 shadow-xl border border-slate-200 dark:border-slate-700">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
          <div className="relative">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <PieChart className="h-6 w-6 text-white" />
          </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Top Categories Distribution</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">Product category breakdown</p>
              </div>
            </div>
            <div className="space-y-6">
            {topCategories.map((category, index) => (
                <div key={index} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${categoryColors[index % categoryColors.length]} shadow-sm`}></div>
                      <span className="font-semibold text-slate-800 dark:text-white">{category.category_name}</span>
                </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-300">{category.product_count} products</span>
                      <span className="font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-sm">
                        {category.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="w-full rounded-full h-3 bg-slate-200 dark:bg-slate-700 overflow-hidden">
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
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-xl border border-slate-200 dark:border-slate-700">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
            <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <FaFilter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Search & Filter Reports</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Find specific reports quickly</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Search Reports</label>
              <div className="relative group">
                <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-gray-500 transition-colors" />
              <input
                type="text"
                  placeholder="Search by title, type, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-800 dark:text-white placeholder-slate-400"
              />
            </div>
          </div>
          <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Report Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-800 dark:text-white"
            >
              {reportTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All Types" : type}
                </option>
              ))}
            </select>
          </div>
          <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date Range</label>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-800 dark:text-white"
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
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
        <div className="relative">
          <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <FaFileAlt className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Generated Reports</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">Manage and view all your reports</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-full">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {filteredReports.length} reports found
                  </span>
                </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
            <table className="w-full min-w-max">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-b border-slate-200 dark:border-slate-600 sticky top-0 z-10">
              <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  REPORT TITLE
                </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  TYPE
                </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  GENERATED BY
                </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  DATE & TIME
                </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  STATUS
                </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  FILE INFO
                </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  ACTIONS
                </th>
              </tr>
            </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {items.map((item, index) => (
                  <tr key={item.movement_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200 group">
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                          <FaFileAlt className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">{item.title}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">{item.description}</div>
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
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.generatedBy}</span>
                      </div>
                  </td>
                    <td className="px-6 py-5">
                      <div className="text-sm">
                        <div className="font-semibold text-slate-800 dark:text-white">{item.date}</div>
                        <div className="text-slate-500 dark:text-slate-400">{item.time}</div>
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
                        <div className="font-semibold text-slate-800 dark:text-white">{item.format}</div>
                        <div className="text-slate-500 dark:text-slate-400">{item.fileSize}</div>
                    </div>
                  </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex justify-center gap-1">
                      <button 
                        onClick={() => handleViewDetails(item)}
                          className="p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded-lg transition-all duration-200 group"
                          title="View Details"
                      >
                          <FaEye className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={() => handleDownload(item)}
                          className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200 group"
                          title="Download"
                      >
                          <FaDownload className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={() => handlePrint(item)}
                          className="p-2 text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all duration-200 group"
                          title="Print"
                      >
                          <FaPrint className="h-4 w-4 group-hover:scale-110 transition-transform" />
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
            <div className="px-8 py-6 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {((page - 1) * rowsPerPage) + 1} to {Math.min(page * rowsPerPage, filteredReports.length)} of {filteredReports.length} reports
                </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                              ? 'text-white shadow-lg'
                              : 'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                          }`}
                          style={pageNum === page ? { backgroundColor: theme.colors.accent } : {}}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
              <button
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page === pages}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
        <div className="fixed inset-0 bg-gray-200 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {selectedReport?.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Report Details - {selectedReport?.type}
                  </p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
                >
                  <FaTimes className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
                  <span className="ml-3 text-slate-600 dark:text-slate-300">Loading report details...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Report Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <FaInfoCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Report Type</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedReport?.type}</p>
                        </div>
                        </div>
                    </div>
                    
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <FaCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Status</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedReport?.status}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2">
                        <FaFileAlt className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <div>
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">File Format</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedReport?.format}</p>
                        </div>
                        </div>
                    </div>
                    
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2">
                        <FaWeight className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        <div>
                          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">File Size</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedReport?.fileSize}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Description</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {selectedReport?.description}
                    </p>
                  </div>

                  {/* Generated On */}
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Generated On</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Date</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedReport?.date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Time</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedReport?.time}</p>
                      </div>
                    </div>
                  </div>

                  {/* Report Line Items */}
                  {reportDetails.length > 0 && (
                    <div className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-600 border-b border-slate-200 dark:border-slate-600">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Report Line Items ({reportDetails.length} items)
                        </h3>
                    </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-100 dark:bg-slate-600">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Product Name</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Barcode</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Category</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Quantity</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">SRP</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Movement Type</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Reference No</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Date</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Time</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Location</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Supplier</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Brand</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Expiration Date</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-700 divide-y divide-slate-200 dark:divide-slate-600">
                            {reportDetails.map((item, index) => (
                              <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors duration-150">
                                <td className="px-3 py-2 text-sm font-medium text-slate-900 dark:text-white">{item.product_name || ''}</td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{item.barcode || ''}</td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{item.category || ''}</td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{item.quantity || ''}</td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">₱{parseFloat(item.srp || 0).toFixed(2)}</td>
                                <td className="px-3 py-2 text-sm">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    item.movement_type === 'IN' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    item.movement_type === 'OUT' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    item.movement_type === 'ADJUSTMENT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                  }`}>
                                    {item.movement_type || ''}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{item.reference_no || ''}</td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{item.date || ''}</td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{item.time || ''}</td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{item.location_name || ''}</td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{item.supplier_name || ''}</td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{item.brand || ''}</td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{item.expiration_date || ''}</td>
                                <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">{item.notes || ''}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-green-50 dark:bg-green-900/20">
                            <tr>
                              <td colSpan="13" className="px-3 py-2 text-center text-sm font-semibold text-slate-900 dark:text-white">End of Report</td>
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
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
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
        <div className="fixed inset-0 bg-gray-200 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Combine Reports
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Select date range and report types to combine into a single PDF
                  </p>
                </div>
                <button 
                  onClick={() => setShowCombineModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
                >
                  <FaTimes className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                {/* Quick Select Options */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Select</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Custom Date Range</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={combineStartDate}
                        onChange={(e) => setCombineStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={combineEndDate}
                        onChange={(e) => setCombineEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Report Types Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Report Types</h3>
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
                        <span className="text-sm text-slate-700 dark:text-slate-300">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
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


  );
};

export default Reports; 