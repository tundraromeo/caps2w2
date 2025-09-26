"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState({
    reports: {
      hasUpdates: false,
      count: 0,
      lastUpdate: null
    },
    warehouse: {
      lowStock: 0,
      expiring: 0,
      outOfStock: 0,
      lastUpdate: null
    },
    pharmacy: {
      lowStock: 0,
      expiring: 0,
      outOfStock: 0,
      lastUpdate: null
    },
    convenience: {
      lowStock: 0,
      expiring: 0,
      outOfStock: 0,
      lastUpdate: null
    }
  });

  const [systemUpdates, setSystemUpdates] = useState({
    hasUpdates: false,
    count: 0,
    lastCheck: null
  });

  const [isInitialized, setIsInitialized] = useState(false);

  // Update warehouse notifications
  const updateWarehouseNotifications = (data) => {
    setNotifications(prev => ({
      ...prev,
      warehouse: {
        lowStock: data.lowStock || 0,
        expiring: data.expiring || 0,
        outOfStock: data.outOfStock || 0,
        lastUpdate: new Date().toISOString()
      }
    }));
  };

  // Update pharmacy notifications
  const updatePharmacyNotifications = (data) => {
    setNotifications(prev => ({
      ...prev,
      pharmacy: {
        lowStock: data.lowStock || 0,
        expiring: data.expiring || 0,
        outOfStock: data.outOfStock || 0,
        lastUpdate: new Date().toISOString()
      }
    }));
  };

  // Update convenience store notifications
  const updateConvenienceNotifications = (data) => {
    setNotifications(prev => ({
      ...prev,
      convenience: {
        lowStock: data.lowStock || 0,
        expiring: data.expiring || 0,
        outOfStock: data.outOfStock || 0,
        lastUpdate: new Date().toISOString()
      }
    }));
  };

  // Update reports notifications
  const updateReportsNotifications = (hasUpdates, count = 0) => {
    setNotifications(prev => ({
      ...prev,
      reports: {
        hasUpdates,
        count,
        lastUpdate: new Date().toISOString()
      }
    }));
  };

  // Update system updates
  const updateSystemUpdates = (hasUpdates, count = 0) => {
    setSystemUpdates({
      hasUpdates,
      count,
      lastCheck: new Date().toISOString()
    });
  };

  // Get total notification count for a section
  const getTotalNotifications = (section) => {
    if (section === 'reports') {
      return notifications.reports.count;
    }
    
    const sectionData = notifications[section];
    if (!sectionData) return 0;
    
    return sectionData.lowStock + sectionData.expiring + sectionData.outOfStock;
  };

  // Check if any section has notifications
  const hasAnyNotifications = () => {
    return Object.keys(notifications).some(section => {
      if (section === 'reports') {
        return notifications.reports.hasUpdates;
      }
      const sectionData = notifications[section];
      return sectionData && (sectionData.lowStock > 0 || sectionData.expiring > 0 || sectionData.outOfStock > 0);
    });
  };

  // Check if reports has updates
  const hasReportsUpdates = () => {
    return notifications.reports.hasUpdates || systemUpdates.hasUpdates;
  };

  // Clear notifications for a section
  const clearNotifications = (section) => {
    if (section === 'reports') {
      setNotifications(prev => ({
        ...prev,
        reports: {
          hasUpdates: false,
          count: 0,
          lastUpdate: new Date().toISOString()
        }
      }));
    } else if (notifications[section]) {
      setNotifications(prev => ({
        ...prev,
        [section]: {
          lowStock: 0,
          expiring: 0,
          outOfStock: 0,
          lastUpdate: new Date().toISOString()
        }
      }));
    }
  };

  // Clear system updates
  const clearSystemUpdates = () => {
    setSystemUpdates({
      hasUpdates: false,
      count: 0,
      lastCheck: new Date().toISOString()
    });
  };

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const savedNotifications = localStorage.getItem('enguio-notifications');
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(prev => ({ ...prev, ...parsed }));
      }

      const savedSystemUpdates = localStorage.getItem('enguio-system-updates');
      if (savedSystemUpdates) {
        const parsed = JSON.parse(savedSystemUpdates);
        setSystemUpdates(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save notifications to localStorage whenever they change (but not during initial load)
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem('enguio-notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }, [notifications, isInitialized]);

  // Save system updates to localStorage whenever they change (but not during initial load)
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem('enguio-system-updates', JSON.stringify(systemUpdates));
    } catch (error) {
      console.error('Error saving system updates to localStorage:', error);
    }
  }, [systemUpdates, isInitialized]);

  const value = {
    notifications,
    systemUpdates,
    updateWarehouseNotifications,
    updatePharmacyNotifications,
    updateConvenienceNotifications,
    updateReportsNotifications,
    updateSystemUpdates,
    getTotalNotifications,
    hasAnyNotifications,
    hasReportsUpdates,
    clearNotifications,
    clearSystemUpdates
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
