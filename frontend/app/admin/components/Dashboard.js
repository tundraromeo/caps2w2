"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from './ThemeContext';
import { toast } from 'react-toastify';
import { API_BASE_URL, getApiUrl } from '../../lib/apiConfig';
import { 
  Search, 
  Bell, 
  MessageCircle, 
  Moon, 
  ChevronUp, 
  ChevronDown,
  Home,
  DollarSign,
  RotateCcw,
  TrendingUp,
  Package,
  AlertTriangle,
  User,
  Settings,
  Key,
  Edit3,
  ChevronDown as ChevronDownIcon
} from 'lucide-react';

// Helper: record login/logout as generic activity (more portable)
async function recordActivity({ activityType, description, tableName = null, recordId = null }) {
  try {
    const endpoint = getApiUrl('backend.php');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'record_activity',
        activity_type: activityType,
        description: description,
        table_name: tableName,
        record_id: recordId
      })
    });
    const result = await response.json();
    if (!result.success) {
      console.warn('Activity logging failed:', result.message);
    }
  } catch (error) {
    console.warn('Activity logging error:', error);
  }
}

function Dashboard() {
  const { theme, isDarkMode } = useTheme();
  
  // Use the actual theme from ThemeContext
  const safeTheme = theme;
  
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState({
    summaryCards: [],
    salesData: [],
    paymentMethods: [],
    topProducts: [],
    inventoryAlerts: [],
    employeePerformance: []
  });
  
  const [loading, setLoading] = useState(false);
  const [paymentPeriod, setPaymentPeriod] = useState('30'); // Default to 30 days
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [globalPeriod, setGlobalPeriod] = useState('all'); // Global filter for all dashboard data: today, week, month, all
  
  // Admin profile state for top navigation
  const [adminProfile, setAdminProfile] = useState({
    name: 'Admin',
    email: 'admin@enguio.com'
  });
  
  // Modal states
  const [showChangeNameModal, setShowChangeNameModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showEmployeeInfoModal, setShowEmployeeInfoModal] = useState(false);
  
  // Employee data state
  const [employeeData, setEmployeeData] = useState({
    fullName: 'Admin User',
    email: 'admin@enguio.com',
    username: 'admin',
    position: 'System Administrator'
  });
  
  // Change name modal state
  const [changeNameData, setChangeNameData] = useState({
    currentName: '',
    newName: ''
  });
  
  // Change password modal state
  const [changePasswordData, setChangePasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  

  // Fetch payment methods data separately (legacy function)
  const fetchPaymentMethods = async (days = 30) => {
    try {
      const response = await fetch(`${getApiUrl('dashboard_sales_api.php')}?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'get_payment_methods',
          days: days
        })
      });
      
      // Check if response is ok
      if (!response.ok) {
        console.error('Payment methods API HTTP Error:', response.status, response.statusText);
        return [];
      }
      
      // Get response text first to handle empty responses
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.error('Payment methods API returned empty response');
        return [];
      }
      
      // Try to parse JSON
      const result = JSON.parse(text);
      
      if (result.success) {
        return result.data || [];
      } else {
        console.error('Payment methods API Error:', result.message);
        return [];
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  };

  // Fetch payment methods data with global period filter
  const fetchPaymentMethodsWithPeriod = async (period = 'all') => {
    try {
      console.log('💳 Fetching payment methods with period:', period);
      const response = await fetch(`${getApiUrl('dashboard_sales_api.php')}?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'get_payment_methods',
          period: period
        })
      });
      
      // Check if response is ok
      if (!response.ok) {
        console.error('❌ Payment methods API HTTP Error:', response.status, response.statusText);
        return [];
      }
      
      // Get response text first to handle empty responses
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.error('❌ Payment methods API returned empty response');
        return [];
      }
      
      // Try to parse JSON
      const result = JSON.parse(text);
      console.log('💳 Payment methods result:', result);
      
      if (result.success) {
        console.log('✅ Payment methods loaded:', result.data?.length, 'methods');
        if (result.debug) {
          console.log('📅 Payment methods date range:', result.debug);
        }
        return result.data || [];
      } else {
        console.error('❌ Payment methods API Error:', result.message);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching payment methods:', error);
      return [];
    }
  };

  // Fetch cashier performance data with global period filter
  const fetchCashierPerformance = async () => {
    try {
      console.log('🔍 Fetching cashier performance with period:', globalPeriod);
      const perfRes = await fetch(`${getApiUrl('employee_manager.php')}?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'get_cashier_performance',
          period: globalPeriod
        })
      });
      
      console.log('📡 Response status:', perfRes.status);
      
      if (perfRes.ok) {
        const perfData = await perfRes.json();
        console.log('📊 Cashier performance data:', perfData);
        
        if (perfData.success && perfData.performance) {
          const cashierRows = perfData.performance.map(perf => ({
            name: perf.cashier_name || perf.username || 'Unknown',
            refund: parseFloat(perf.total_returns || 0).toFixed(2),
            sales: parseFloat(perf.total_sales || 0).toFixed(2)
          }));
          console.log('✅ Mapped cashier rows:', cashierRows);
          setDashboardData(prev => ({ ...prev, employeePerformance: cashierRows }));
        } else {
          console.warn('⚠️ No performance data or API failed:', perfData);
        }
      } else {
        console.error('❌ Response not OK:', perfRes.status);
      }
    } catch (err) {
      console.error('❌ Failed to fetch cashier performance data:', err);
    }
  };

  // Fetch employee data from database
  const fetchEmployeeData = async () => {
    try {
      const response = await fetch(getApiUrl('backend.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'get_admin_employee_info'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setEmployeeData({
          fullName: result.data.fullName || 'Admin User',
          email: result.data.email || 'admin@enguio.com',
          username: result.data.username || 'admin',
          position: result.data.position || 'System Administrator'
        });
        
        // Update change name data with current full name
        setChangeNameData(prev => ({
          ...prev,
          currentName: result.data.fullName || 'Admin User'
        }));
        
        // Update admin profile for top navigation
        setAdminProfile({
          name: result.data.fullName || 'Admin User',
          email: result.data.email || 'admin@enguio.com'
        });
      } else {
        console.error('Employee data API Error:', result.message);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  // Update admin name in database
  const updateAdminName = async (newName) => {
    try {
      const response = await fetch(getApiUrl('backend.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_admin_name',
          newName: newName
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update local state with new name
        setEmployeeData(prev => ({
          ...prev,
          fullName: result.data.fullName
        }));
        
        setChangeNameData(prev => ({
          ...prev,
          currentName: result.data.fullName,
          newName: ''
        }));
        
        // Update admin profile for top navigation
        setAdminProfile(prev => ({
          ...prev,
          name: result.data.fullName
        }));
        
        return { success: true, message: result.message };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Error updating admin name:', error);
      return { success: false, message: 'Network error occurred' };
    }
  };

  // Update admin password in database
  const updateAdminPassword = async (newPassword) => {
    try {
      const response = await fetch(getApiUrl('backend.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'change_admin_password',
          newPassword: newPassword
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        return { success: true, message: result.message };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Error updating admin password:', error);
      return { success: false, message: 'Network error occurred' };
    }
  };

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching dashboard data with period:', globalPeriod);
      console.log('📅 Period filter applied:', globalPeriod);
      
      const response = await fetch(`${getApiUrl('backend.php')}?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'get_dashboard_data',
          period: globalPeriod
        })
      });
      
      const result = await response.json();
      console.log('📊 Dashboard data received:', result);
      
      // Fetch payment methods data using global period filter
      const paymentMethodsData = await fetchPaymentMethodsWithPeriod(globalPeriod);
      console.log('💳 Payment methods data:', paymentMethodsData);
      
      if (result.success) {
        setDashboardData({
          summaryCards: result.data.summaryCards || [],
          salesData: result.data.salesData || [],
          paymentMethods: paymentMethodsData,
          topProducts: result.data.topProducts || [],
          inventoryAlerts: result.data.inventoryAlerts || [],
          employeePerformance: [] // Will be populated by fetchCashierPerformance
        });

        // Fetch actual cashier performance data with period filter
        await fetchCashierPerformance();
        
        console.log('✅ Dashboard data loaded successfully with period:', globalPeriod);
      } else {
        console.error('❌ API Error:', result.message);
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle payment period change (legacy - no longer used)
  const handlePaymentPeriodChange = async (newPeriod) => {
    // This function is no longer used since Payment Methods now uses global filter
    console.log('Payment period change deprecated - using global filter instead');
  };

  // Handle global period change
  const handleGlobalPeriodChange = async (newPeriod) => {
    console.log('📅 Global period changing from', globalPeriod, 'to', newPeriod);
    setGlobalPeriod(newPeriod);
    // Note: fetchDashboardData will be triggered by useEffect when globalPeriod changes
  };

  // Profile menu handlers
  const handleChangeName = () => {
    setShowChangeNameModal(true);
    setProfileDropdownOpen(false);
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
    setProfileDropdownOpen(false);
  };

  const handleEmployeeInfo = () => {
    fetchEmployeeData();
    setShowEmployeeInfoModal(true);
    setProfileDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownOpen && !event.target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  useEffect(() => {
    fetchDashboardData();
    fetchEmployeeData(); // Fetch admin employee data on component load
    recordActivity({ activityType: 'DASHBOARD_VIEW', description: 'Dashboard loaded' });
  }, [globalPeriod]); // Refresh when global period changes

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: safeTheme.bg.primary }}>
      {/* Top Navigation Bar */}
      <div className="shadow-sm border-b" style={{ backgroundColor: safeTheme.bg.card, borderColor: safeTheme.border.default }}>
        <div className="px-6 py-4">
        <div className="flex items-center justify-between">
            {/* Left side - Logo and Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">EN</span>
                </div>
                <span className="text-xl font-bold" style={{ color: safeTheme.text.primary }}>EnGuio</span>
              </div>
              {/* Global Period Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium" style={{ color: safeTheme.text.secondary }}>Filter:</span>
                <select
                  value={globalPeriod}
                  onChange={(e) => handleGlobalPeriodChange(e.target.value)}
                  className="px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ 
                    backgroundColor: safeTheme.bg.card,
                    borderColor: safeTheme.border.default,
                    color: safeTheme.text.primary
                  }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>


            {/* Right side - Profile */}
            <div className="relative profile-dropdown">
              <button 
                className="flex items-center space-x-3 rounded-lg p-2 transition-colors"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{ 
                  backgroundColor: profileDropdownOpen ? safeTheme.bg.hover : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (!profileDropdownOpen) {
                    e.target.style.backgroundColor = safeTheme.bg.hover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!profileDropdownOpen) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: safeTheme.text.primary }}>{adminProfile.name}</p>
                  <p className="text-xs" style={{ color: safeTheme.text.muted }}>{adminProfile.email}</p>
                </div>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} style={{ color: safeTheme.text.secondary }} />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg border z-50" style={{ backgroundColor: safeTheme.bg.card, borderColor: safeTheme.border.default }}>
                  <div className="py-2">
                    {/* Profile Header */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: safeTheme.border.default }}>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: safeTheme.text.primary }}>Admin User</p>
                          <p className="text-xs" style={{ color: safeTheme.text.muted }}>System Administrator</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button 
                        onClick={handleChangeName}
                        className="flex items-center w-full px-4 py-2 text-sm transition-colors" 
                        style={{ color: safeTheme.text.primary }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = safeTheme.bg.hover}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <Edit3 className="w-4 h-4 mr-3" style={{ color: safeTheme.text.secondary }} />
                        Change Name
                      </button>
                      <button 
                        onClick={handleChangePassword}
                        className="flex items-center w-full px-4 py-2 text-sm transition-colors" 
                        style={{ color: safeTheme.text.primary }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = safeTheme.bg.hover}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <Key className="w-4 h-4 mr-3" style={{ color: safeTheme.text.secondary }} />
                        Change Password
                      </button>
                      <button 
                        onClick={handleEmployeeInfo}
                        className="flex items-center w-full px-4 py-2 text-sm transition-colors" 
                        style={{ color: safeTheme.text.primary }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = safeTheme.bg.hover}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <Settings className="w-4 h-4 mr-3" style={{ color: safeTheme.text.secondary }} />
                        Employee Information
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-8">
         {/* Summary Cards Row */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           {loading ? (
             // Loading skeleton for summary cards
             Array.from({ length: 3 }).map((_, index) => (
               <div key={index} className="rounded-lg p-6 shadow-sm border animate-pulse" style={{ backgroundColor: safeTheme.bg.card, borderColor: safeTheme.border.default }}>
                 <div className="flex items-center justify-between mb-4">
                   <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                   <div className="w-16 h-4 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                 </div>
                 <div className="w-24 h-4 rounded mb-2" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                 <div className="w-32 h-8 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div>
               </div>
             ))
           ) : (
             dashboardData.summaryCards.map((card, index) => (
            <div 
              key={index} 
                 className="rounded-lg p-6 shadow-sm border"
                 style={{ backgroundColor: safeTheme.bg.card, borderColor: safeTheme.border.default }}
               >
                 <div className="flex items-center justify-between mb-4">
                   <div className="p-2 rounded-lg" style={{ backgroundColor: safeTheme.bg.hover }}>
                     {card.icon && <card.icon className="w-6 h-6" style={{ color: safeTheme.text.primary }} />}
                   </div>
                 </div>
                 <h3 className="text-sm font-medium mb-1" style={{ color: safeTheme.text.secondary }}>{card.title}</h3>
                 <p className="text-2xl font-bold" style={{ color: safeTheme.text.primary }}>{card.value}</p>
            </div>
             ))
           )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Performance Chart */}
          <div 
            className="rounded-lg p-6 shadow-sm border"
            style={{ backgroundColor: safeTheme.bg.card, borderColor: safeTheme.border.default }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: safeTheme.text.primary }}>Sales performance</h3>
            </div>
            
             {/* Simple Chart Representation */}
             <div className="h-48 flex items-end justify-between space-x-2 overflow-hidden">
               {loading ? (
                 // Loading skeleton for chart
                 Array.from({ length: 10 }).map((_, index) => (
                   <div key={index} className="flex flex-col items-center space-y-1">
                     <div className="w-6 rounded-t animate-pulse" style={{ height: '60px', backgroundColor: safeTheme.bg.hover }}></div>
                     <div className="w-6 rounded-t animate-pulse" style={{ height: '80px', backgroundColor: safeTheme.bg.hover }}></div>
                     <div className="w-6 rounded-t animate-pulse" style={{ height: '70px', backgroundColor: safeTheme.bg.hover }}></div>
                     <div className="w-4 h-3 rounded animate-pulse" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                   </div>
                 ))
               ) : dashboardData.salesData.length > 0 ? (
                 dashboardData.salesData.map((data, index) => {
                   const maxValue = Math.max(...dashboardData.salesData.map(d => Math.max(d.totalTransfer || 0, d.totalSales || 0, d.totalReturn || 0)));
                   return (
                     <div key={index} className="flex flex-col items-center space-y-1">
                       <div className="w-6 bg-blue-500 rounded-t" style={{ height: `${Math.min(((data.totalTransfer || 0) / maxValue) * 120, 120)}px` }}></div>
                       <div className="w-6 bg-green-500 rounded-t" style={{ height: `${Math.min(((data.totalSales || 0) / maxValue) * 120, 120)}px` }}></div>
                       <div className="w-6 bg-orange-500 rounded-t" style={{ height: `${Math.min(((data.totalReturn || 0) / maxValue) * 120, 120)}px` }}></div>
                       <span className="text-xs mt-2" style={{ color: safeTheme.text.muted }}>{data.day}</span>
                     </div>
                   );
                 })
               ) : (
                 <div className="w-full h-full flex items-center justify-center">
                   <p className="text-sm" style={{ color: safeTheme.text.muted }}>No sales data available</p>
                 </div>
               )}
             </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm" style={{ color: safeTheme.text.secondary }}>Total transfer</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm" style={{ color: safeTheme.text.secondary }}>Total sales</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-sm" style={{ color: safeTheme.text.secondary }}>Total return</span>
                </div>
            </div>
          </div>

          {/* Payment Methods Chart */}
          <div 
            className="rounded-lg p-6 shadow-sm border"
            style={{ backgroundColor: safeTheme.bg.card, borderColor: safeTheme.border.default }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: safeTheme.text.primary }}>Payment Methods</h3>
            </div>
            
            {/* Pie Chart Representation */}
            <div className="flex items-center justify-center">
              {loading ? (
                <div className="w-48 h-48 flex items-center justify-center">
                  <div className="w-24 h-24 border-4 rounded-full animate-pulse" style={{ borderColor: safeTheme.bg.hover }}></div>
                </div>
              ) : dashboardData.paymentMethods.length > 0 ? (
                <div className="relative w-48 h-48">
                  {/* Create pie chart using SVG */}
                  <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                    {(() => {
                      const total = dashboardData.paymentMethods.reduce((sum, method) => sum + (method.percentage || 0), 0);
                      let cumulativePercentage = 0;
                      
                      return dashboardData.paymentMethods.map((method, index) => {
                        const percentage = (method.percentage || 0) / total * 100;
                        const circumference = 2 * Math.PI * 40; // radius = 40
                        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -(cumulativePercentage / 100) * circumference;
                        
                        cumulativePercentage += percentage;
                        
                        return (
                          <circle
                            key={index}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={method.color || '#6B7280'}
                            strokeWidth="8"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-300"
                          />
                        );
                      });
                    })()}
                    
                    {/* Center circle for donut effect */}
                    <circle
                      cx="50"
                      cy="50"
                      r="25"
                      fill={safeTheme.bg.card}
                    />
                  </svg>
                  
                  {/* Center content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-lg font-bold" style={{ color: safeTheme.text.primary }}>
                        {dashboardData.paymentMethods.reduce((sum, method) => sum + (method.count || 0), 0)}
                      </p>
                      <p className="text-sm" style={{ color: safeTheme.text.secondary }}>Transactions</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <p className="text-sm" style={{ color: safeTheme.text.muted }}>No payment data available</p>
                </div>
              )}
            </div>
            
             {/* Legend */}
             <div className="space-y-3 mt-4">
               {loading ? (
                 Array.from({ length: 3 }).map((_, index) => (
                   <div key={index} className="flex items-center justify-between animate-pulse">
                     <div className="flex items-center space-x-2">
                       <div className="w-3 h-3 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                       <div className="w-12 h-3 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                     </div>
                     <div className="w-16 h-3 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                   </div>
                 ))
               ) : (
                 dashboardData.paymentMethods.map((method, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: method.color }}></div>
                    <span className="text-sm font-medium" style={{ color: safeTheme.text.primary }}>{method.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: safeTheme.text.primary }}>
                      ₱{method.amount ? method.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                    </div>
                    <div className="text-xs" style={{ color: safeTheme.text.muted }}>
                      {method.percentage ? method.percentage.toFixed(1) : '0.0'}% ({method.count} txns)
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
          {/* Top Selling Products */}
          <div 
            className="rounded-lg p-6 shadow-sm border"
            style={{ backgroundColor: safeTheme.bg.card, borderColor: safeTheme.border.default }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: safeTheme.text.primary }}>Top Selling Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: safeTheme.border.default }}>
                    <th className="text-left py-2 text-sm font-medium" style={{ color: safeTheme.text.secondary }}>Product</th>
                    <th className="text-left py-2 text-sm font-medium" style={{ color: safeTheme.text.secondary }}>Qty</th>
                    <th className="text-left py-2 text-sm font-medium" style={{ color: safeTheme.text.secondary }}>Sales</th>
                    <th className="text-left py-2 text-sm font-medium" style={{ color: safeTheme.text.secondary }}>Status</th>
                  </tr>
                </thead>
                 <tbody>
                   {loading ? (
                     Array.from({ length: 3 }).map((_, index) => (
                       <tr key={index} className="border-b animate-pulse">
                         <td className="py-3">
                           <div className="flex items-center space-x-2">
                             <div className="w-4 h-4 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                             <div className="w-20 h-3 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                           </div>
                         </td>
                         <td className="py-3"><div className="w-8 h-3 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div></td>
                         <td className="py-3"><div className="w-16 h-3 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div></td>
                         <td className="py-3"><div className="w-16 h-6 rounded-full" style={{ backgroundColor: safeTheme.bg.hover }}></div></td>
                       </tr>
                     ))
                   ) : dashboardData.topProducts.length > 0 ? (
                     dashboardData.topProducts.map((product, index) => (
                       <tr key={index} className="border-b" style={{ borderColor: safeTheme.border.default }}>
                         <td className="py-3">
                           <div className="flex items-center space-x-2">
                             {product.icon && <product.icon className="w-4 h-4" style={{ color: safeTheme.text.secondary }} />}
                             <span className="text-sm" style={{ color: safeTheme.text.primary }}>{product.name}</span>
                           </div>
                         </td>
                         <td className="py-3 text-sm" style={{ color: safeTheme.text.primary }}>{product.quantity}</td>
                         <td className="py-3 text-sm" style={{ color: safeTheme.text.primary }}>₱{product.sales}</td>
                         <td className="py-3">
                           <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">{product.status}</span>
                         </td>
                       </tr>
                     ))
                   ) : (
                     <tr>
                       <td colSpan="4" className="py-8 text-center">
                         <p className="text-sm" style={{ color: safeTheme.text.muted }}>No product data available</p>
                       </td>
                     </tr>
                   )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column - Inventory Alerts & Employee Performance */}
          <div className="space-y-6 mb-8">
            {/* Inventory Alerts */}
            <div 
              className="rounded-lg p-6 shadow-sm border"
              style={{ backgroundColor: safeTheme.bg.card, borderColor: safeTheme.border.default }}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ color: safeTheme.text.primary }}>Inventory Alerts</h3>
               <div className="space-y-3">
                 {loading ? (
                   Array.from({ length: 3 }).map((_, index) => (
                     <div key={index} className="flex items-center justify-between animate-pulse">
                       <div className="flex items-center space-x-2">
                         <div className="w-4 h-4 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                         <div className="w-20 h-3 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                       </div>
                       <div className="w-6 h-3 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                     </div>
                   ))
                 ) : dashboardData.inventoryAlerts.length > 0 ? (
                   dashboardData.inventoryAlerts.map((alert, index) => {
                     // Determine color based on alert type
                     let alertColor = '';
                     let iconColor = '';
                     
                     switch (alert.alert_type) {
                       case 'Out of Stock':
                         alertColor = 'bg-red-100 text-red-800';
                         iconColor = 'text-red-500';
                         break;
                       case 'Stock Out':
                         alertColor = 'bg-red-100 text-red-800';
                         iconColor = 'text-red-500';
                         break;
                       case 'Low Stock':
                         alertColor = 'bg-orange-100 text-orange-800';
                         iconColor = 'text-orange-500';
                         break;
                       default:
                         alertColor = 'bg-gray-100 text-gray-800';
                         iconColor = 'text-gray-500';
                     }
                     
                     return (
                       <div key={index} className="flex items-center justify-between">
                         <div className="flex items-center space-x-2">
                           <div className={`w-2 h-2 rounded-full ${iconColor.replace('text-', 'bg-')}`}></div>
                           <span className="text-sm" style={{ color: safeTheme.text.primary }}>{alert.name}</span>
                           <span className="text-xs" style={{ color: safeTheme.text.muted }}>({alert.quantity} units)</span>
                         </div>
                         <span className={`px-2 py-1 text-xs rounded-full font-medium ${alertColor}`}>
                           {alert.alerts}
                         </span>
                       </div>
                     );
                   })
                 ) : (
                   <div className="py-4 text-center">
                     <p className="text-sm" style={{ color: safeTheme.text.muted }}>No inventory alerts</p>
                   </div>
                 )}
            </div>
            </div>

            {/* Employee Performance */}
            <div 
              className="rounded-lg p-6 shadow-sm border"
              style={{ backgroundColor: safeTheme.bg.card, borderColor: safeTheme.border.default }}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ color: safeTheme.text.primary }}>Cashier performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: safeTheme.border.default }}>
                      <th className="text-left py-2 text-sm font-medium" style={{ color: safeTheme.text.secondary }}>Name</th>
                      <th className="text-left py-2 text-sm font-medium" style={{ color: safeTheme.text.secondary }}>Return</th>
                      <th className="text-left py-2 text-sm font-medium" style={{ color: safeTheme.text.secondary }}>Sales</th>
                    </tr>
                  </thead>
                   <tbody>
                     {loading ? (
                       Array.from({ length: 3 }).map((_, index) => (
                         <tr key={index} className="border-b animate-pulse">
                           <td className="py-3">
                             <div className="flex items-center space-x-2">
                               <div className="w-6 h-6 rounded-full" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                               <div className="w-16 h-3 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div>
                             </div>
                           </td>
                           <td className="py-3"><div className="w-12 h-3 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div></td>
                           <td className="py-3"><div className="w-12 h-3 rounded" style={{ backgroundColor: safeTheme.bg.hover }}></div></td>
                         </tr>
                       ))
                     ) : dashboardData.employeePerformance.length > 0 ? (
                       dashboardData.employeePerformance.map((employee, index) => (
                         <tr key={index} className="border-b" style={{ borderColor: safeTheme.border.default }}>
                           <td className="py-3">
                             <div className="flex items-center space-x-2">
                               <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                 {employee.avatar && <employee.avatar className="w-3 h-3 text-white" />}
                               </div>
                               <span className="text-sm" style={{ color: safeTheme.text.primary }}>{employee.name}</span>
                             </div>
                           </td>
                           <td className="py-3 text-sm" style={{ color: safeTheme.text.primary }}>₱{employee.refund}</td>
                           <td className="py-3 text-sm" style={{ color: safeTheme.text.primary }}>₱{employee.sales}</td>
                         </tr>
                       ))
                     ) : (
                       <tr>
                         <td colSpan="3" className="py-8 text-center">
                           <p className="text-sm" style={{ color: safeTheme.text.muted }}>No employee data available</p>
                         </td>
                       </tr>
                     )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Name Modal */}
      {showChangeNameModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 w-96 max-w-md mx-4 shadow-lg border" style={{ backgroundColor: safeTheme.bg.card, borderColor: safeTheme.border.default }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: safeTheme.text.primary }}>Change Name</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: safeTheme.text.secondary }}>Current Name</label>
                <input 
                  type="text" 
                  value={changeNameData.currentName}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg"
                  style={{ backgroundColor: safeTheme.bg.hover, borderColor: safeTheme.border.default }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: safeTheme.text.secondary }}>New Name</label>
                <input 
                  type="text" 
                  placeholder="Enter new name"
                  value={changeNameData.newName}
                  onChange={(e) => setChangeNameData(prev => ({ ...prev, newName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: safeTheme.border.default }}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => {
                  setShowChangeNameModal(false);
                  setChangeNameData(prev => ({ ...prev, newName: '' }));
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                onMouseEnter={(e) => e.target.style.backgroundColor = safeTheme.bg.hover}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                style={{ borderColor: safeTheme.border.default, color: safeTheme.text.primary }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!changeNameData.newName.trim()) {
                    toast.error('Please enter a new name');
                    return;
                  }
                  
                  const result = await updateAdminName(changeNameData.newName.trim());
                  
                  if (result.success) {
                    toast.success('Name updated successfully!');
                    setShowChangeNameModal(false);
                  } else {
                    toast.error('Error: ' + result.message);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 w-96 max-w-md mx-4 shadow-lg border" style={{ backgroundColor: safeTheme.bg.card, borderColor: safeTheme.border.default }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: safeTheme.text.primary }}>Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: safeTheme.text.secondary }}>New Password</label>
                <input 
                  type="password" 
                  placeholder="Enter new password"
                  value={changePasswordData.newPassword}
                  onChange={(e) => setChangePasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: safeTheme.border.default }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: safeTheme.text.secondary }}>Confirm New Password</label>
                <input 
                  type="password" 
                  placeholder="Confirm new password"
                  value={changePasswordData.confirmPassword}
                  onChange={(e) => setChangePasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: safeTheme.border.default }}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setChangePasswordData({ newPassword: '', confirmPassword: '' });
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                onMouseEnter={(e) => e.target.style.backgroundColor = safeTheme.bg.hover}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                style={{ borderColor: safeTheme.border.default, color: safeTheme.text.primary }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!changePasswordData.newPassword.trim()) {
                    toast.error('Please enter a new password');
                    return;
                  }
                  
                  if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
                    toast.error('Passwords do not match');
                    return;
                  }
                  
                  if (changePasswordData.newPassword.length < 6) {
                    toast.error('Password must be at least 6 characters long');
                    return;
                  }
                  
                  const result = await updateAdminPassword(changePasswordData.newPassword);
                  
                  if (result.success) {
                    toast.success('Password updated successfully!');
                    setShowChangePasswordModal(false);
                    setChangePasswordData({ newPassword: '', confirmPassword: '' });
                  } else {
                    toast.error('Error: ' + result.message);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Information Modal */}
      {showEmployeeInfoModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 w-96 max-w-md mx-4 shadow-lg border" style={{ backgroundColor: safeTheme.bg.card, borderColor: safeTheme.border.default }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: safeTheme.text.primary }}>Employee Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: safeTheme.text.secondary }}>Full Name</label>
                <input 
                  type="text" 
                  value={employeeData.fullName}
                  onChange={(e) => setEmployeeData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: safeTheme.border.default }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: safeTheme.text.secondary }}>Email</label>
                <input 
                  type="email" 
                  value={employeeData.email}
                  onChange={(e) => setEmployeeData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: safeTheme.border.default }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: safeTheme.text.secondary }}>Username</label>
                <input 
                  type="text" 
                  value={employeeData.username}
                  onChange={(e) => setEmployeeData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: safeTheme.border.default }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: safeTheme.text.secondary }}>Position</label>
                <input 
                  type="text" 
                  value={employeeData.position}
                  onChange={(e) => setEmployeeData(prev => ({ ...prev, position: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: safeTheme.border.default }}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => setShowEmployeeInfoModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                onMouseEnter={(e) => e.target.style.backgroundColor = safeTheme.bg.hover}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                style={{ borderColor: safeTheme.border.default, color: safeTheme.text.primary }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!employeeData.fullName.trim()) {
                    toast.error('Full name is required');
                    return;
                  }
                  
                  if (!employeeData.email.trim()) {
                    toast.error('Email is required');
                    return;
                  }
                  
                  if (!employeeData.username.trim()) {
                    toast.error('Username is required');
                    return;
                  }
                  
                  // Validate email format
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(employeeData.email)) {
                    toast.error('Please enter a valid email address');
                    return;
                  }
                  
                  // Validate username format (alphanumeric and underscores only, 3-20 characters)
                  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
                  if (!usernameRegex.test(employeeData.username)) {
                    toast.error('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
                    return;
                  }
                  
                  try {
                    const response = await fetch(getApiUrl('backend.php'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        action: 'update_admin_employee_info',
                        fullName: employeeData.fullName.trim(),
                        email: employeeData.email.trim(),
                        username: employeeData.username.trim(),
                        position: employeeData.position.trim()
                      })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                      toast.success('Employee information updated successfully!');
                      
                      // Update admin profile for top navigation
                      setAdminProfile(prev => ({
                        ...prev,
                        name: result.data.fullName,
                        email: result.data.email
                      }));
                      
                      // Update local employee data with response
                      setEmployeeData(prev => ({
                        ...prev,
                        fullName: result.data.fullName,
                        email: result.data.email,
                        username: result.data.username,
                        position: result.data.position
                      }));
                      
                      setShowEmployeeInfoModal(false);
                    } else {
                      toast.error('Error: ' + result.message);
                    }
                  } catch (error) {
                    console.error('Error updating employee info:', error);
                    toast.error('Network error occurred');
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default Dashboard;
