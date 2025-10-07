"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from './ThemeContext';
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
  User
} from 'lucide-react';

// Helper: record login/logout as generic activity (more portable)
async function recordActivity({ activityType, description, tableName = null, recordId = null }) {
  try {
    const API_BASE_URL = "http://localhost/caps2e2/Api/backend.php";
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

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('http://localhost/caps2e2/Api/backend.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_dashboard_data' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setDashboardData({
          summaryCards: result.data.summaryCards || [],
          salesData: result.data.salesData || [],
          paymentMethods: result.data.paymentMethods || [],
          topProducts: result.data.topProducts || [],
          inventoryAlerts: result.data.inventoryAlerts || [],
          employeePerformance: result.data.employeePerformance || []
        });
      } else {
        console.error('API Error:', result.message);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
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
                  <span className="text-white font-bold text-sm">RP</span>
                </div>
                <span className="text-xl font-bold" style={{ color: theme.text.primary }}>RetailPro</span>
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

            {/* Right side - Icons and Profile */}
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Moon className="w-5 h-5" style={{ color: theme.text.secondary }} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell className="w-5 h-5" style={{ color: theme.text.secondary }} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">!</span>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <MessageCircle className="w-5 h-5" style={{ color: theme.text.secondary }} />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
          <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.primary }}>Murad</p>
                  <p className="text-xs" style={{ color: theme.text.muted }}>Khaled@gmail.com</p>
                </div>
              </div>
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
                   const maxValue = Math.max(...dashboardData.salesData.map(d => Math.max(d.totalTransfer || 0, d.totalSales || 0, d.totalProfit || 0)));
                   return (
                     <div key={index} className="flex flex-col items-center space-y-1">
                       <div className="w-6 bg-blue-500 rounded-t" style={{ height: `${Math.min(((data.totalTransfer || 0) / maxValue) * 120, 120)}px` }}></div>
                       <div className="w-6 bg-green-500 rounded-t" style={{ height: `${Math.min(((data.totalSales || 0) / maxValue) * 120, 120)}px` }}></div>
                       <div className="w-6 bg-orange-500 rounded-t" style={{ height: `${Math.min(((data.totalProfit || 0) / maxValue) * 120, 120)}px` }}></div>
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
                <span className="text-sm" style={{ color: theme.text.secondary }}>Total profit</span>
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
            
            {/* Donut Chart Representation */}
            <div className="flex items-center justify-center">
              {dashboardData.paymentMethods.length > 0 ? (
                <div className="relative w-48 h-48">
                  <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
                  <div className="absolute inset-0 rounded-full border-8 border-blue-500" style={{ 
                    clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%)' 
                  }}></div>
                  <div className="absolute inset-0 rounded-full border-8 border-green-500" style={{ 
                    clipPath: 'polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)' 
                  }}></div>
                  <div className="absolute inset-0 rounded-full border-8 border-orange-500" style={{ 
                    clipPath: 'polygon(50% 50%, 50% 100%, 0% 100%, 0% 50%)' 
                  }}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-lg font-bold" style={{ color: theme.text.primary }}>
                        {dashboardData.paymentMethods.reduce((sum, method) => sum + (method.count || 0), 0)}
                      </p>
                      <p className="text-sm" style={{ color: theme.text.secondary }}>Total</p>
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
             <div className="space-y-2 mt-4">
               {loading ? (
                 Array.from({ length: 3 }).map((_, index) => (
                   <div key={index} className="flex items-center justify-between animate-pulse">
                     <div className="flex items-center space-x-2">
                       <div className="w-3 h-3 bg-gray-200 rounded"></div>
                       <div className="w-12 h-3 bg-gray-200 rounded"></div>
                     </div>
                     <div className="w-8 h-3 bg-gray-200 rounded"></div>
                   </div>
                 ))
               ) : (
                 dashboardData.paymentMethods.map((method, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: method.color }}></div>
                    <span className="text-sm" style={{ color: theme.text.secondary }}>{method.name}</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: theme.text.primary }}>({method.count})</span>
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
                   dashboardData.inventoryAlerts.map((alert, index) => (
                     <div key={index} className="flex items-center justify-between">
                       <div className="flex items-center space-x-2">
                         {alert.icon && <alert.icon className="w-4 h-4 text-orange-500" />}
                         <span className="text-sm" style={{ color: theme.text.primary }}>{alert.name}</span>
                       </div>
                       <span className="text-sm font-medium" style={{ color: theme.text.primary }}>{alert.alerts}</span>
                     </div>
                   ))
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
              <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Employee performance</h3>
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
    </div>
  );
}

export default Dashboard;
