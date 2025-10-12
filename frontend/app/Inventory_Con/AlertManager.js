"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

const AlertManagerContext = createContext();

export const useAlertManager = () => {
  const context = useContext(AlertManagerContext);
  if (!context) {
    throw new Error('useAlertManager must be used within an AlertManagerProvider');
  }
  return context;
};

export const AlertManagerProvider = ({ children }) => {
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [alertHistory, setAlertHistory] = useState([]);

  // Load dismissed alerts from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('enguio-dismissed-alerts');
      if (saved) {
        const parsed = JSON.parse(saved);
        setDismissedAlerts(new Set(parsed));
      }
    } catch (error) {
      console.error('Error loading dismissed alerts:', error);
    }
  }, []);

  // Save dismissed alerts to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('enguio-dismissed-alerts', JSON.stringify([...dismissedAlerts]));
    } catch (error) {
      console.error('Error saving dismissed alerts:', error);
    }
  }, [dismissedAlerts]);

  // Dismiss an alert
  const dismissAlert = (alertId, alertType, productName, details = {}) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    
    // Add to alert history for reporting
    setAlertHistory(prev => [...prev, {
      id: alertId,
      type: alertType,
      productName,
      dismissedAt: new Date().toISOString(),
      details
    }]);
  };

  // Check if an alert is dismissed
  const isAlertDismissed = (alertId) => {
    return dismissedAlerts.has(alertId);
  };

  // Clear all dismissed alerts (for testing or reset)
  const clearDismissedAlerts = () => {
    setDismissedAlerts(new Set());
    setAlertHistory([]);
    localStorage.removeItem('enguio-dismissed-alerts');
  };

  // Get alert history for reporting
  const getAlertHistory = (filterType = null, dateRange = null) => {
    let filtered = alertHistory;
    
    if (filterType) {
      filtered = filtered.filter(alert => alert.type === filterType);
    }
    
    if (dateRange) {
      const { start, end } = dateRange;
      filtered = filtered.filter(alert => {
        const alertDate = new Date(alert.dismissedAt);
        return alertDate >= start && alertDate <= end;
      });
    }
    
    return filtered.sort((a, b) => new Date(b.dismissedAt) - new Date(a.dismissedAt));
  };

  // Get alert statistics
  const getAlertStats = () => {
    const total = alertHistory.length;
    const byType = alertHistory.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {});
    
    const byDay = alertHistory.reduce((acc, alert) => {
      const day = new Date(alert.dismissedAt).toDateString();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total,
      byType,
      byDay,
      recent: alertHistory.slice(0, 10) // Last 10 alerts
    };
  };

  const value = {
    dismissedAlerts,
    alertHistory,
    dismissAlert,
    isAlertDismissed,
    clearDismissedAlerts,
    getAlertHistory,
    getAlertStats
  };

  return (
    <AlertManagerContext.Provider value={value}>
      {children}
    </AlertManagerContext.Provider>
  );
};

export default AlertManagerProvider;
