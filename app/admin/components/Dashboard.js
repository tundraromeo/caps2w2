"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from './ThemeContext';

// Helper: record login/logout as generic activity (more portable)
async function recordActivity({ activityType, description, tableName = null, recordId = null }) {
  try {
    const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";
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

// Helper: record login/logout as generic activity (more portable)
async function recordLogin({ loginType = 'LOGIN', status = 'SUCCESS' }) {
  const desc = loginType === 'LOGOUT' ? `User logged out (${status})` : `User logged in (${status})`;
  await recordActivity({ activityType: loginType, description: desc, tableName: 'tbl_login', recordId: null });
}

function Dashboard() {
  const { theme } = useTheme();
  
  const metrics = [
    {
      title: "TOTAL SALES",
      value: "₱24,780",
      subtitle: "+20% from last month",
      icon: "💰", // Using emoji instead of lucide icon
      trend: "up",
    },
    {
      title: "TOTAL ORDERS",
      value: "156",
      subtitle: "+12% from last month",
      icon: "📦", // Using emoji instead of lucide icon
      trend: "up",
    },
    {
      title: "TOTAL CUSTOMERS",
      value: "89",
      subtitle: "+20% from last month",
      icon: "👥", // Using emoji instead of lucide icon
      trend: "up",
    },
    {
      title: "TOTAL PRODUCTS",
      value: "1,284",
      subtitle: "+4% from last month",
      icon: "📦", // Using emoji instead of lucide icon
      trend: "up",
    },
  ];

  const recentActivities = [
    {
      title: "New order #1234 received",
      color: "bg-green-500",
    },
    {
      title: "Product 'Medicine A' restocked",
      color: "bg-blue-500",
    },
    {
      title: "Customer 'John Doe' registered",
      color: "bg-purple-500",
    },
    {
      title: "Sales report generated",
      color: "bg-orange-500",
    },
  ];

  const quickActions = [
    {
      title: "ADD PRODUCTS",
      icon: "➕", // Using emoji instead of lucide icon
      color: "bg-gray-100 hover:bg-gray-200",
    },
    {
      title: "STOCKS RECEIVING",
      icon: "📥", // Using emoji instead of lucide icon
      color: "bg-gray-100 hover:bg-gray-200",
    },
    {
      title: "STOCKS TRANSFER",
      icon: "🔄", // Using emoji instead of lucide icon
      color: "bg-gray-100 hover:bg-gray-200",
    },
    {
      title: "STOCKS ADJUSTMENT",
      icon: "⚖️", // Using emoji instead of lucide icon
      color: "bg-gray-100 hover:bg-gray-200",
    },
  ];

  useEffect(() => {
    // Removed navigation/viewing logging
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-6" style={{ backgroundColor: theme.colors.accent }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-6 mb-4">
              <span className="border-b-2 pb-1" style={{ color: theme.text.primary, borderColor: theme.text.primary }}>Admin Overview</span>
              <span style={{ color: theme.text.secondary }}>System Management</span>
              <span style={{ color: theme.text.secondary }}>User Analytics</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text.primary }}>Admin Dashboard</h1>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6 space-y-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric, index) => (
            <div 
              key={index} 
              className="p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
              style={{ 
                backgroundColor: theme.bg.card, 
                boxShadow: `0 10px 25px ${theme.shadow}` 
              }}
            >
              <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>{metric.title}</p>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{metric.value}</p>
              <p className="text-xs mt-1" style={{ color: theme.text.muted }}>{metric.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div 
            className="p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
            style={{ 
              backgroundColor: theme.bg.card, 
              boxShadow: `0 10px 25px ${theme.shadow}` 
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: theme.text.primary }}
            >
              RECENT ACTIVITY
            </h3>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${activity.color}`} />
                  <span 
                    className="text-sm"
                    style={{ color: theme.text.secondary }}
                  >
                    {activity.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div 
            className="p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
            style={{ 
              backgroundColor: theme.bg.card, 
              boxShadow: `0 10px 25px ${theme.shadow}` 
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: theme.text.primary }}
            >
              QUICK ACTIONS
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="h-20 flex flex-col items-center justify-center space-y-2 rounded-lg border transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: theme.bg.hover,
                    borderColor: theme.border.default,
                    color: theme.text.primary
                  }}
                  onClick={() => {
                    recordActivity({ activityType: 'DASHBOARD_QUICK_ACTION', description: `Clicked ${action.title}` });
                  }}
                >
                  <span className="text-2xl">{action.icon}</span>
                  <span className="text-xs font-medium">{action.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
