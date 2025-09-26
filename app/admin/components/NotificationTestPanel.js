"use client";
import React, { useState } from 'react';
import { useNotification } from './NotificationContext';
import { useTheme } from './ThemeContext';

const NotificationTestPanel = () => {
  const { 
    notifications, 
    systemUpdates,
    updateWarehouseNotifications,
    updateWarehouseSpecificNotifications,
    updateReportsNotifications,
    updateLogsNotifications,
    updateSystemUpdates,
    getTotalNotifications,
    hasWarehouseAlerts,
    getWarehouseAlertCount,
    clearNotifications,
    clearSystemUpdates
  } = useNotification();
  
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  const testWarehouseNotifications = () => {
    // Test with sample warehouse data
    updateWarehouseNotifications({
      lowStock: 5,
      expiring: 3,
      outOfStock: 2,
      expired: 1,
      warehouses: {
        '1': { name: 'Main Warehouse', lowStock: 3, expiring: 2, outOfStock: 1, expired: 1 },
        '2': { name: 'Pharmacy Storage', lowStock: 2, expiring: 1, outOfStock: 1, expired: 0 }
      }
    });
  };

  const testSystemUpdates = () => {
    updateSystemUpdates(true, 3);
    updateReportsNotifications(true, 3, {
      'Stock In Report': { hasUpdates: true, count: 1 },
      'Sales Report': { hasUpdates: true, count: 2 },
      'Inventory Balance Report': { hasUpdates: true, count: 1 }
    });
    updateLogsNotifications(true, 2, {
      'Login Logs': { hasUpdates: true, count: 2 }
    });
  };

  const testRealTimeActivities = () => {
    // Simulate real-time activities
    addActivityNotification('Stock In Report', 2, { 
      description: 'New stock received',
      timestamp: new Date().toISOString()
    });
    
    addActivityNotification('Stock Out Report', 1, { 
      description: 'Stock transferred out',
      timestamp: new Date().toISOString()
    });
    
    addActivityNotification('Sales Report', 3, { 
      description: 'New sales transactions',
      timestamp: new Date().toISOString()
    });
    
    addActivityNotification('Inventory Balance Report', 1, { 
      description: 'Inventory updated',
      timestamp: new Date().toISOString()
    });
  };

  const clearAllNotifications = () => {
    clearNotifications('warehouse');
    clearNotifications('reports');
    clearNotifications('logs');
    clearSystemUpdates();
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 p-2 rounded-full shadow-lg z-50"
        style={{ 
          backgroundColor: theme.colors.accent,
          color: 'white'
        }}
        title="Test Notifications"
      >
        🔔
      </button>
    );
  }

  return (
    <div 
      className="fixed bottom-4 right-4 w-80 max-h-96 overflow-y-auto p-4 rounded-lg shadow-lg z-50"
      style={{ 
        backgroundColor: theme.bg.modal,
        border: `1px solid ${theme.border.default}`,
        color: theme.text.primary
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Notification Test Panel</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-sm"
          style={{ color: theme.text.secondary }}
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="font-medium mb-2">Current Notifications:</h4>
          <div className="text-sm space-y-1">
            <div>Warehouse: {getTotalNotifications('warehouse')}</div>
            <div>Reports: {getTotalNotifications('reports')}</div>
            <div>Logs: {getTotalNotifications('logs')}</div>
            <div>System Updates: {systemUpdates.count}</div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Warehouse Details:</h4>
          <div className="text-sm space-y-1">
            <div>Low Stock: {notifications.warehouse.lowStock}</div>
            <div>Expiring: {notifications.warehouse.expiring}</div>
            <div>Out of Stock: {notifications.warehouse.outOfStock}</div>
            <div>Expired: {notifications.warehouse.expired}</div>
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <button
            onClick={testWarehouseNotifications}
            className="px-3 py-1 text-sm rounded"
            style={{ 
              backgroundColor: theme.colors.accent + '20',
              color: theme.colors.accent
            }}
          >
            Test Warehouse Alerts
          </button>
          
          <button
            onClick={testSystemUpdates}
            className="px-3 py-1 text-sm rounded"
            style={{ 
              backgroundColor: theme.colors.accent + '20',
              color: theme.colors.accent
            }}
          >
            Test System Updates
          </button>
          
          <button
            onClick={testRealTimeActivities}
            className="px-3 py-1 text-sm rounded"
            style={{ 
              backgroundColor: theme.colors.accent + '20',
              color: theme.colors.accent
            }}
          >
            Test Real-time Activities
          </button>
          
          <button
            onClick={clearAllNotifications}
            className="px-3 py-1 text-sm rounded"
            style={{ 
              backgroundColor: theme.colors.danger + '20',
              color: theme.colors.danger
            }}
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationTestPanel;
