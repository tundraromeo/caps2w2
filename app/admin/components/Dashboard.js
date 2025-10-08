"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from './ThemeContext';
import { toast } from 'react-toastify';
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
    const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/backend.php`;
    const response = await fetch(API_BASE_URL, {
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
  const { theme } = useTheme();
  
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
    position: 'System Administrator',
    department: 'IT Department'
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
  

  // Fetch payment methods data separately
  const fetchPaymentMethods = async (days = 30) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/dashboard_sales_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'get_payment_methods',
          days: days
        })
      });
      
      const result = await response.json();
      
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

  // Fetch employee data from database
  const fetchEmployeeData = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/backend.php`, {
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
          position: result.data.position || 'System Administrator',
          department: result.data.department || 'IT Department'
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/backend.php`, {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/backend.php`, {
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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/backend.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_dashboard_data' })
      });
      
      const result = await response.json();
      
      // Fetch payment methods data separately
      const paymentMethodsData = await fetchPaymentMethods(parseInt(paymentPeriod));
      
      if (result.success) {
        setDashboardData({
          summaryCards: result.data.summaryCards || [],
          salesData: result.data.salesData || [],
          paymentMethods: paymentMethodsData,
          topProducts: result.data.topProducts || [],
          inventoryAlerts: result.data.inventoryAlerts || [],
          employeePerformance: result.data.employeePerformance || []
        });

        // Fetch active cashiers and display them even if no performance yet
        try {
          const empRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/backend.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'display_employee' })
          });
          const empJson = await empRes.json();
          if (empJson && empJson.success) {
            const employees = Array.isArray(empJson.employees) ? empJson.employees : [];
            const cashiers = employees.filter(e => String(e.role_id) === '3' && String(e.status).toLowerCase() === 'active');
            const cashierRows = cashiers.map(e => ({
              name: `${e.Fname ? e.Fname : ''} ${e.Lname ? e.Lname : ''}`.trim() || e.username || 'Unknown',
              refund: 0,
              sales: 0
            }));
            if (cashierRows.length > 0) {
              setDashboardData(prev => ({ ...prev, employeePerformance: cashierRows }));
            }
          }
        } catch (err) {
          console.warn('Failed to fetch employees for cashier table:', err);
        }
      } else {
        console.error('API Error:', result.message);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle payment period change
  const handlePaymentPeriodChange = async (newPeriod) => {
    setPaymentPeriod(newPeriod);
    const paymentMethodsData = await fetchPaymentMethods(parseInt(newPeriod));
    setDashboardData(prev => ({
      ...prev,
      paymentMethods: paymentMethodsData
    }));
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
  }, []);

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: theme.bg.primary }}>
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm border-b" style={{ borderColor: theme.border.default }}>
        <div className="px-6 py-4">
        <div className="flex items-center justify-between">
            {/* Left side - Logo and Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">EN</span>
                </div>
                <span className="text-xl font-bold" style={{ color: theme.text.primary }}>EnGuio</span>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                  <div className="w-4 h-0.5 bg-gray-600"></div>
                  <div className="w-4 h-0.5 bg-gray-600"></div>
                  <div className="w-4 h-0.5 bg-gray-600"></div>
                </div>
              </button>
            </div>

            {/* Center - Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search here"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ 
                    backgroundColor: theme.bg.card,
                    borderColor: theme.border.default,
                    color: theme.text.primary
                  }}
                />
              </div>
            </div>

            {/* Right side - Profile */}
            <div className="relative profile-dropdown">
              <button 
                className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: theme.text.primary }}>{adminProfile.name}</p>
                  <p className="text-xs" style={{ color: theme.text.muted }}>{adminProfile.email}</p>
                </div>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} style={{ color: theme.text.secondary }} />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50" style={{ borderColor: theme.border.default }}>
                  <div className="py-2">
                    {/* Profile Header */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: theme.border.default }}>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: theme.text.primary }}>Admin User</p>
                          <p className="text-xs" style={{ color: theme.text.muted }}>System Administrator</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button 
                        onClick={handleChangeName}
                        className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors" 
                        style={{ color: theme.text.primary }}
                      >
                        <Edit3 className="w-4 h-4 mr-3" style={{ color: theme.text.secondary }} />
                        Change Name
                      </button>
                      <button 
                        onClick={handleChangePassword}
                        className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors" 
                        style={{ color: theme.text.primary }}
                      >
                        <Key className="w-4 h-4 mr-3" style={{ color: theme.text.secondary }} />
                        Change Password
                      </button>
                      <button 
                        onClick={handleEmployeeInfo}
                        className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors" 
                        style={{ color: theme.text.primary }}
                      >
                        <Settings className="w-4 h-4 mr-3" style={{ color: theme.text.secondary }} />
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
               <div key={index} className="bg-white rounded-lg p-6 shadow-sm border animate-pulse">
                 <div className="flex items-center justify-between mb-4">
                   <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                   <div className="w-16 h-4 bg-gray-200 rounded"></div>
                 </div>
                 <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
                 <div className="w-32 h-8 bg-gray-200 rounded"></div>
               </div>
             ))
           ) : (
             dashboardData.summaryCards.map((card, index) => (
            <div 
              key={index} 
                 className="bg-white rounded-lg p-6 shadow-sm border"
                 style={{ borderColor: theme.border.default }}
               >
                 <div className="flex items-center justify-between mb-4">
                   <div className="p-2 rounded-lg" style={{ backgroundColor: theme.bg.hover }}>
                     {card.icon && <card.icon className="w-6 h-6" style={{ color: theme.text.primary }} />}
                   </div>
                 </div>
                 <h3 className="text-sm font-medium mb-1" style={{ color: theme.text.secondary }}>{card.title}</h3>
                 <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{card.value}</p>
            </div>
             ))
           )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Performance Chart */}
          <div 
            className="bg-white rounded-lg p-6 shadow-sm border"
            style={{ borderColor: theme.border.default }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>Sales performance</h3>
              <select className="px-3 py-1 border rounded-lg text-sm" style={{ 
              backgroundColor: theme.bg.card, 
                borderColor: theme.border.default,
                color: theme.text.primary
              }}>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            
             {/* Simple Chart Representation */}
             <div className="h-48 flex items-end justify-between space-x-2 overflow-hidden">
               {loading ? (
                 // Loading skeleton for chart
                 Array.from({ length: 10 }).map((_, index) => (
                   <div key={index} className="flex flex-col items-center space-y-1">
                     <div className="w-6 bg-gray-200 rounded-t animate-pulse" style={{ height: '60px' }}></div>
                     <div className="w-6 bg-gray-200 rounded-t animate-pulse" style={{ height: '80px' }}></div>
                     <div className="w-6 bg-gray-200 rounded-t animate-pulse" style={{ height: '70px' }}></div>
                     <div className="w-4 h-3 bg-gray-200 rounded animate-pulse"></div>
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
                       <span className="text-xs mt-2" style={{ color: theme.text.muted }}>{data.day}</span>
                     </div>
                   );
                 })
               ) : (
                 <div className="w-full h-full flex items-center justify-center">
                   <p className="text-sm" style={{ color: theme.text.muted }}>No sales data available</p>
                 </div>
               )}
             </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm" style={{ color: theme.text.secondary }}>Total transfer</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm" style={{ color: theme.text.secondary }}>Total sales</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-sm" style={{ color: theme.text.secondary }}>Total return</span>
                </div>
            </div>
          </div>

          {/* Payment Methods Chart */}
          <div 
            className="bg-white rounded-lg p-6 shadow-sm border"
            style={{ borderColor: theme.border.default }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>Payment Methods</h3>
              <select 
                className="px-3 py-1 border rounded-lg text-sm" 
                style={{ 
                  backgroundColor: theme.bg.card, 
                  borderColor: theme.border.default,
                  color: theme.text.primary
                }}
                value={paymentPeriod}
                onChange={(e) => handlePaymentPeriodChange(e.target.value)}
              >
                <option value="1">Daily</option>
                <option value="7">Weekly</option>
                <option value="30">Monthly</option>
              </select>
            </div>
            
            {/* Pie Chart Representation */}
            <div className="flex items-center justify-center">
              {loading ? (
                <div className="w-48 h-48 flex items-center justify-center">
                  <div className="w-24 h-24 border-4 border-gray-200 rounded-full animate-pulse"></div>
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
                      fill="white"
                    />
                  </svg>
                  
                  {/* Center content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-lg font-bold" style={{ color: theme.text.primary }}>
                        {dashboardData.paymentMethods.reduce((sum, method) => sum + (method.count || 0), 0)}
                      </p>
                      <p className="text-sm" style={{ color: theme.text.secondary }}>Transactions</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <p className="text-sm" style={{ color: theme.text.muted }}>No payment data available</p>
                </div>
              )}
            </div>
            
             {/* Legend */}
             <div className="space-y-3 mt-4">
               {loading ? (
                 Array.from({ length: 3 }).map((_, index) => (
                   <div key={index} className="flex items-center justify-between animate-pulse">
                     <div className="flex items-center space-x-2">
                       <div className="w-3 h-3 bg-gray-200 rounded"></div>
                       <div className="w-12 h-3 bg-gray-200 rounded"></div>
                     </div>
                     <div className="w-16 h-3 bg-gray-200 rounded"></div>
                   </div>
                 ))
               ) : (
                 dashboardData.paymentMethods.map((method, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: method.color }}></div>
                    <span className="text-sm font-medium" style={{ color: theme.text.primary }}>{method.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: theme.text.primary }}>
                      ₱{method.amount ? method.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                    </div>
                    <div className="text-xs" style={{ color: theme.text.muted }}>
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
            className="bg-white rounded-lg p-6 shadow-sm border"
            style={{ borderColor: theme.border.default }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Top Selling Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: theme.border.default }}>
                    <th className="text-left py-2 text-sm font-medium" style={{ color: theme.text.secondary }}>Product</th>
                    <th className="text-left py-2 text-sm font-medium" style={{ color: theme.text.secondary }}>Qty</th>
                    <th className="text-left py-2 text-sm font-medium" style={{ color: theme.text.secondary }}>Sales</th>
                    <th className="text-left py-2 text-sm font-medium" style={{ color: theme.text.secondary }}>Status</th>
                  </tr>
                </thead>
                 <tbody>
                   {loading ? (
                     Array.from({ length: 3 }).map((_, index) => (
                       <tr key={index} className="border-b animate-pulse">
                         <td className="py-3">
                           <div className="flex items-center space-x-2">
                             <div className="w-4 h-4 bg-gray-200 rounded"></div>
                             <div className="w-20 h-3 bg-gray-200 rounded"></div>
                           </div>
                         </td>
                         <td className="py-3"><div className="w-8 h-3 bg-gray-200 rounded"></div></td>
                         <td className="py-3"><div className="w-16 h-3 bg-gray-200 rounded"></div></td>
                         <td className="py-3"><div className="w-16 h-6 bg-gray-200 rounded-full"></div></td>
                       </tr>
                     ))
                   ) : dashboardData.topProducts.length > 0 ? (
                     dashboardData.topProducts.map((product, index) => (
                       <tr key={index} className="border-b" style={{ borderColor: theme.border.default }}>
                         <td className="py-3">
                           <div className="flex items-center space-x-2">
                             {product.icon && <product.icon className="w-4 h-4" style={{ color: theme.text.secondary }} />}
                             <span className="text-sm" style={{ color: theme.text.primary }}>{product.name}</span>
                           </div>
                         </td>
                         <td className="py-3 text-sm" style={{ color: theme.text.primary }}>{product.quantity}</td>
                         <td className="py-3 text-sm" style={{ color: theme.text.primary }}>₱{product.sales}</td>
                         <td className="py-3">
                           <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">{product.status}</span>
                         </td>
                       </tr>
                     ))
                   ) : (
                     <tr>
                       <td colSpan="4" className="py-8 text-center">
                         <p className="text-sm" style={{ color: theme.text.muted }}>No product data available</p>
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
              className="bg-white rounded-lg p-6 shadow-sm border"
              style={{ borderColor: theme.border.default }}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Inventory Alerts</h3>
               <div className="space-y-3">
                 {loading ? (
                   Array.from({ length: 3 }).map((_, index) => (
                     <div key={index} className="flex items-center justify-between animate-pulse">
                       <div className="flex items-center space-x-2">
                         <div className="w-4 h-4 bg-gray-200 rounded"></div>
                         <div className="w-20 h-3 bg-gray-200 rounded"></div>
                       </div>
                       <div className="w-6 h-3 bg-gray-200 rounded"></div>
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
                           <span className="text-sm" style={{ color: theme.text.primary }}>{alert.name}</span>
                           <span className="text-xs" style={{ color: theme.text.muted }}>({alert.quantity} units)</span>
                         </div>
                         <span className={`px-2 py-1 text-xs rounded-full font-medium ${alertColor}`}>
                           {alert.alerts}
                         </span>
                       </div>
                     );
                   })
                 ) : (
                   <div className="py-4 text-center">
                     <p className="text-sm" style={{ color: theme.text.muted }}>No inventory alerts</p>
                   </div>
                 )}
            </div>
            </div>

            {/* Employee Performance */}
            <div 
              className="bg-white rounded-lg p-6 shadow-sm border"
              style={{ borderColor: theme.border.default }}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Cashier performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: theme.border.default }}>
                      <th className="text-left py-2 text-sm font-medium" style={{ color: theme.text.secondary }}>Name</th>
                      <th className="text-left py-2 text-sm font-medium" style={{ color: theme.text.secondary }}>Refund</th>
                      <th className="text-left py-2 text-sm font-medium" style={{ color: theme.text.secondary }}>Sales</th>
                    </tr>
                  </thead>
                   <tbody>
                     {loading ? (
                       Array.from({ length: 3 }).map((_, index) => (
                         <tr key={index} className="border-b animate-pulse">
                           <td className="py-3">
                             <div className="flex items-center space-x-2">
                               <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                               <div className="w-16 h-3 bg-gray-200 rounded"></div>
                             </div>
                           </td>
                           <td className="py-3"><div className="w-12 h-3 bg-gray-200 rounded"></div></td>
                           <td className="py-3"><div className="w-12 h-3 bg-gray-200 rounded"></div></td>
                         </tr>
                       ))
                     ) : dashboardData.employeePerformance.length > 0 ? (
                       dashboardData.employeePerformance.map((employee, index) => (
                         <tr key={index} className="border-b" style={{ borderColor: theme.border.default }}>
                           <td className="py-3">
                             <div className="flex items-center space-x-2">
                               <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                 {employee.avatar && <employee.avatar className="w-3 h-3 text-white" />}
                               </div>
                               <span className="text-sm" style={{ color: theme.text.primary }}>{employee.name}</span>
                             </div>
                           </td>
                           <td className="py-3 text-sm" style={{ color: theme.text.primary }}>₱{employee.refund}</td>
                           <td className="py-3 text-sm" style={{ color: theme.text.primary }}>₱{employee.sales}</td>
                         </tr>
                       ))
                     ) : (
                       <tr>
                         <td colSpan="3" className="py-8 text-center">
                           <p className="text-sm" style={{ color: theme.text.muted }}>No employee data available</p>
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
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 shadow-lg border">
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Change Name</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Current Name</label>
                <input 
                  type="text" 
                  value={changeNameData.currentName}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                  style={{ borderColor: theme.border.default }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>New Name</label>
                <input 
                  type="text" 
                  placeholder="Enter new name"
                  value={changeNameData.newName}
                  onChange={(e) => setChangeNameData(prev => ({ ...prev, newName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: theme.border.default }}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => {
                  setShowChangeNameModal(false);
                  setChangeNameData(prev => ({ ...prev, newName: '' }));
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50"
                style={{ borderColor: theme.border.default, color: theme.text.primary }}
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
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 shadow-lg border">
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>New Password</label>
                <input 
                  type="password" 
                  placeholder="Enter new password"
                  value={changePasswordData.newPassword}
                  onChange={(e) => setChangePasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: theme.border.default }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Confirm New Password</label>
                <input 
                  type="password" 
                  placeholder="Confirm new password"
                  value={changePasswordData.confirmPassword}
                  onChange={(e) => setChangePasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: theme.border.default }}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setChangePasswordData({ newPassword: '', confirmPassword: '' });
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50"
                style={{ borderColor: theme.border.default, color: theme.text.primary }}
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
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 shadow-lg border">
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Employee Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Full Name</label>
                <input 
                  type="text" 
                  value={employeeData.fullName}
                  onChange={(e) => setEmployeeData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: theme.border.default }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Email</label>
                <input 
                  type="email" 
                  value={employeeData.email}
                  onChange={(e) => setEmployeeData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: theme.border.default }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Position</label>
                <input 
                  type="text" 
                  value={employeeData.position}
                  onChange={(e) => setEmployeeData(prev => ({ ...prev, position: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: theme.border.default }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Department</label>
                <input 
                  type="text" 
                  value={employeeData.department}
                  onChange={(e) => setEmployeeData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: theme.border.default }}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => setShowEmployeeInfoModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50"
                style={{ borderColor: theme.border.default, color: theme.text.primary }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  // Handle save employee info logic here
                  setShowEmployeeInfoModal(false);
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
