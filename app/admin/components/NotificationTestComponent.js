"use client";
import React, { useState } from 'react';
import { useNotification } from './NotificationContext';
import { useTheme } from './ThemeContext';

const NotificationTestComponent = () => {
  const { theme } = useTheme();
  const { 
    updateSystemActivityNotifications, 
    updateMultipleSystemActivities,
    updateReportsNotifications,
    updateSystemUpdates,
    clearNotifications,
    clearSystemUpdates,
    notifications,
    systemUpdates
  } = useNotification();
  
  const [isVisible, setIsVisible] = useState(false);

  const testStockInNotification = () => {
    updateSystemActivityNotifications('productEntry', true, 1);
    updateReportsNotifications(true, 1, {
      'Stock In Report': { hasUpdates: true, count: 1 }
    });
    updateSystemUpdates(true, 1);
    console.log('✅ Test Stock In notification triggered - Click on Reports or Stock In Report to auto-clear');
  };

  const testStockOutNotification = () => {
    updateSystemActivityNotifications('stockOut', true, 1);
    updateReportsNotifications(true, 1, {
      'Stock Out Report': { hasUpdates: true, count: 1 }
    });
    updateSystemUpdates(true, 1);
    console.log('✅ Test Stock Out notification triggered - Click on Reports or Stock Out Report to auto-clear');
  };

  const testSalesNotification = () => {
    updateSystemActivityNotifications('salesReport', true, 1);
    updateReportsNotifications(true, 1, {
      'Sales Report': { hasUpdates: true, count: 1 }
    });
    updateSystemUpdates(true, 1);
    console.log('✅ Test Sales notification triggered - Click on Reports or Sales Report to auto-clear');
  };

  const clearAllNotifications = () => {
    clearNotifications('reports');
    clearNotifications('systemActivity');
    clearSystemUpdates();
    console.log('✅ All notifications cleared');
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg text-white font-bold"
        style={{ backgroundColor: theme.colors.accent }}
      >
        🔔 Test
      </button>
    );
  }

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm"
      style={{ backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold" style={{ color: theme.text.primary }}>
          Notification Test
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 mb-3">
        <button
          onClick={testStockInNotification}
          className="w-full px-3 py-2 text-sm rounded border transition-colors"
          style={{
            backgroundColor: theme.colors.success,
            color: theme.text.primary,
            borderColor: theme.border.default
          }}
        >
          Test Stock In Alert
        </button>
        
        <button
          onClick={testStockOutNotification}
          className="w-full px-3 py-2 text-sm rounded border transition-colors"
          style={{
            backgroundColor: theme.colors.danger,
            color: theme.text.primary,
            borderColor: theme.border.default
          }}
        >
          Test Stock Out Alert
        </button>
        
        <button
          onClick={testSalesNotification}
          className="w-full px-3 py-2 text-sm rounded border transition-colors"
          style={{
            backgroundColor: theme.colors.accent,
            color: theme.text.primary,
            borderColor: theme.border.default
          }}
        >
          Test Sales Alert
        </button>
        
        <button
          onClick={clearAllNotifications}
          className="w-full px-3 py-2 text-sm rounded border transition-colors"
          style={{
            backgroundColor: theme.bg.hover,
            color: theme.text.secondary,
            borderColor: theme.border.default
          }}
        >
          Clear All
        </button>
      </div>

      <div className="text-xs space-y-1" style={{ color: theme.text.muted }}>
        <div>Reports: {notifications.reports.count}</div>
        <div>System Updates: {systemUpdates.count}</div>
        <div>System Activity: {Object.values(notifications.systemActivity).reduce((sum, activity) => sum + activity.count, 0)}</div>
        <div className="mt-2 pt-2 border-t" style={{ borderColor: theme.border.default }}>
          <strong>Auto-Clear:</strong><br/>
          • Click Reports → clears all<br/>
          • Click specific report → clears that report<br/>
          • Click 🔔 bell → clears all
        </div>
      </div>
    </div>
  );
};

export default NotificationTestComponent;
