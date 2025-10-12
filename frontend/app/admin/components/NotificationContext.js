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
      lastUpdate: null,
      subItems: {
        'Stock In Report': { hasUpdates: false, count: 0 },
        'Stock Out Report': { hasUpdates: false, count: 0 },
        'Sales Report': { hasUpdates: false, count: 0 },
        'Inventory Balance Report': { hasUpdates: false, count: 0 },
        'Supplier Report': { hasUpdates: false, count: 0 },
        'Cashier Performance Report': { hasUpdates: false, count: 0 },
        'Stock Adjustment Report': { hasUpdates: false, count: 0 },
        'Login Logs Report': { hasUpdates: false, count: 0 }
      }
    },
    logs: {
      hasUpdates: false,
      count: 0,
      lastUpdate: null,
      subItems: {
        'Login Logs': { hasUpdates: false, count: 0 }
      }
    },
    warehouse: {
      lowStock: 0,
      expiring: 0,
      outOfStock: 0,
      expired: 0,
      warehouses: {}, // Store alerts per warehouse with red exclamation mark
      lastUpdate: null
    },
    users: {
      pendingApprovals: 0,
      inactiveUsers: 0,
      lastUpdate: null
    },
    suppliers: {
      pendingApprovals: 0,
      inactiveSuppliers: 0,
      lastUpdate: null
    },
    returns: {
      pendingReturns: 0,
      pendingApprovals: 0,
      lastUpdate: null
    },
    // New notification types for system updates
    systemActivity: {
      productEntry: { hasUpdates: false, count: 0, lastUpdate: null },
      stockOut: { hasUpdates: false, count: 0, lastUpdate: null },
      inventoryBalance: { hasUpdates: false, count: 0, lastUpdate: null },
      cashierReport: { hasUpdates: false, count: 0, lastUpdate: null },
      salesReport: { hasUpdates: false, count: 0, lastUpdate: null },
      posActivity: { hasUpdates: false, count: 0, lastUpdate: null }
    }
  });

  const [systemUpdates, setSystemUpdates] = useState({
    hasUpdates: false,
    count: 0,
    lastCheck: null
  });

  // Update warehouse notifications
  const updateWarehouseNotifications = (data) => {
    setNotifications(prev => ({
      ...prev,
      warehouse: {
        lowStock: data.lowStock || 0,
        expiring: data.expiring || 0,
        outOfStock: data.outOfStock || 0,
        expired: data.expired || 0,
        warehouses: data.warehouses || prev.warehouse.warehouses,
        lastUpdate: new Date().toISOString()
      }
    }));
  };

  // Update warehouse-specific notifications
  const updateWarehouseSpecificNotifications = (warehouseId, warehouseName, alerts) => {
    setNotifications(prev => ({
      ...prev,
      warehouse: {
        ...prev.warehouse,
        warehouses: {
          ...prev.warehouse.warehouses,
          [warehouseId]: {
            name: warehouseName,
            lowStock: alerts.lowStock || 0,
            expiring: alerts.expiring || 0,
            outOfStock: alerts.outOfStock || 0,
            expired: alerts.expired || 0,
            lastUpdate: new Date().toISOString()
          }
        },
        lastUpdate: new Date().toISOString()
      }
    }));
  };

  // Update user notifications
  const updateUserNotifications = (data) => {
    setNotifications(prev => ({
      ...prev,
      users: {
        pendingApprovals: data.pendingApprovals || 0,
        inactiveUsers: data.inactiveUsers || 0,
        lastUpdate: new Date().toISOString()
      }
    }));
  };

  // Update supplier notifications
  const updateSupplierNotifications = (data) => {
    setNotifications(prev => ({
      ...prev,
      suppliers: {
        pendingApprovals: data.pendingApprovals || 0,
        inactiveSuppliers: data.inactiveSuppliers || 0,
        lastUpdate: new Date().toISOString()
      }
    }));
  };

  // Update return notifications
  const updateReturnNotifications = (data) => {
    setNotifications(prev => ({
      ...prev,
      returns: {
        pendingReturns: data.pendingReturns || 0,
        pendingApprovals: data.pendingApprovals || 0,
        lastUpdate: new Date().toISOString()
      }
    }));
  };

  // Update system activity notifications
  const updateSystemActivityNotifications = (activityType, hasUpdates, count = 0) => {
    setNotifications(prev => ({
      ...prev,
      systemActivity: {
        ...prev.systemActivity,
        [activityType]: {
          hasUpdates,
          count,
          lastUpdate: new Date().toISOString()
        }
      }
    }));
  };

  // Update multiple system activities at once
  const updateMultipleSystemActivities = (activities) => {
    setNotifications(prev => ({
      ...prev,
      systemActivity: {
        ...prev.systemActivity,
        ...Object.keys(activities).reduce((acc, key) => {
          acc[key] = {
            hasUpdates: activities[key].hasUpdates || false,
            count: activities[key].count || 0,
            lastUpdate: new Date().toISOString()
          };
          return acc;
        }, {})
      }
    }));
  };

  // Update reports notifications
  const updateReportsNotifications = (hasUpdates, count = 0, subItemUpdates = {}) => {
    setNotifications(prev => ({
      ...prev,
      reports: {
        hasUpdates,
        count,
        lastUpdate: new Date().toISOString(),
        subItems: {
          ...prev.reports.subItems,
          ...subItemUpdates
        }
      }
    }));
  };

  // Add new activity notification
  const addActivityNotification = (activityType, count, details = {}) => {
    setNotifications(prev => ({
      ...prev,
      reports: {
        ...prev.reports,
        hasUpdates: true,
        count: prev.reports.count + count,
        lastUpdate: new Date().toISOString(),
        subItems: {
          ...prev.reports.subItems,
          [activityType]: {
            hasUpdates: true,
            count: (prev.reports.subItems[activityType]?.count || 0) + count,
            ...details
          }
        }
      }
    }));
  };

  // Update logs notifications
  const updateLogsNotifications = (hasUpdates, count = 0, subItemUpdates = {}) => {
    setNotifications(prev => ({
      ...prev,
      logs: {
        hasUpdates,
        count,
        lastUpdate: new Date().toISOString(),
        subItems: {
          ...prev.logs.subItems,
          ...subItemUpdates
        }
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
    if (section === 'logs') {
      return notifications.logs.count;
    }
    if (section === 'systemActivity') {
      return Object.values(notifications.systemActivity).reduce((total, activity) => total + activity.count, 0);
    }
    
    const sectionData = notifications[section];
    if (!sectionData) return 0;
    
    if (section === 'users') {
      return sectionData.pendingApprovals + sectionData.inactiveUsers;
    }
    if (section === 'suppliers') {
      return sectionData.pendingApprovals + sectionData.inactiveSuppliers;
    }
    if (section === 'returns') {
      return sectionData.pendingReturns + sectionData.pendingApprovals;
    }
    
    return sectionData.lowStock + sectionData.expiring + sectionData.outOfStock + sectionData.expired;
  };

  // Check if any section has notifications
  const hasAnyNotifications = () => {
    return Object.keys(notifications).some(section => {
      if (section === 'reports' || section === 'logs') {
        return notifications[section].hasUpdates;
      }
      if (section === 'systemActivity') {
        return Object.values(notifications.systemActivity).some(activity => activity.hasUpdates);
      }
      const sectionData = notifications[section];
      if (section === 'users') {
        return sectionData && (sectionData.pendingApprovals > 0 || sectionData.inactiveUsers > 0);
      }
      if (section === 'suppliers') {
        return sectionData && (sectionData.pendingApprovals > 0 || sectionData.inactiveSuppliers > 0);
      }
      if (section === 'returns') {
        return sectionData && (sectionData.pendingReturns > 0 || sectionData.pendingApprovals > 0);
      }
      return sectionData && (sectionData.lowStock > 0 || sectionData.expiring > 0 || sectionData.outOfStock > 0 || sectionData.expired > 0);
    });
  };

  // Check if reports has updates
  const hasReportsUpdates = () => {
    return notifications.reports.hasUpdates || systemUpdates.hasUpdates;
  };

  // Check if logs has updates
  const hasLogsUpdates = () => {
    return notifications.logs.hasUpdates || systemUpdates.hasUpdates;
  };

  // Check if sub-item has updates
  const hasSubItemUpdates = (parentSection, subItemKey) => {
    return notifications[parentSection]?.subItems?.[subItemKey]?.hasUpdates || false;
  };

  // Check if a specific warehouse has alerts
  const hasWarehouseAlerts = (warehouseId) => {
    const warehouse = notifications.warehouse.warehouses[warehouseId];
    if (!warehouse) return false;
    return warehouse.lowStock > 0 || warehouse.expiring > 0 || warehouse.outOfStock > 0 || warehouse.expired > 0;
  };

  // Get warehouse alert count
  const getWarehouseAlertCount = (warehouseId) => {
    const warehouse = notifications.warehouse.warehouses[warehouseId];
    if (!warehouse) return 0;
    return warehouse.lowStock + warehouse.expiring + warehouse.outOfStock + warehouse.expired;
  };

  // Check if system activity has updates
  const hasSystemActivityUpdates = (activityType) => {
    return notifications.systemActivity[activityType]?.hasUpdates || false;
  };

  // Get system activity count
  const getSystemActivityCount = (activityType) => {
    return notifications.systemActivity[activityType]?.count || 0;
  };

  // Check if any system activity has updates
  const hasAnySystemActivityUpdates = () => {
    return Object.values(notifications.systemActivity).some(activity => activity.hasUpdates);
  };

  // Clear notifications for a section
  const clearNotifications = (section) => {
    if (section === 'reports') {
      setNotifications(prev => ({
        ...prev,
        reports: {
          hasUpdates: false,
          count: 0,
          lastUpdate: new Date().toISOString(),
          subItems: Object.keys(prev.reports.subItems).reduce((acc, key) => {
            acc[key] = { hasUpdates: false, count: 0 };
            return acc;
          }, {})
        }
      }));
    } else if (section === 'logs') {
      setNotifications(prev => ({
        ...prev,
        logs: {
          hasUpdates: false,
          count: 0,
          lastUpdate: new Date().toISOString(),
          subItems: Object.keys(prev.logs.subItems).reduce((acc, key) => {
            acc[key] = { hasUpdates: false, count: 0 };
            return acc;
          }, {})
        }
      }));
    } else if (section === 'systemActivity') {
      setNotifications(prev => ({
        ...prev,
        systemActivity: Object.keys(prev.systemActivity).reduce((acc, key) => {
          acc[key] = { hasUpdates: false, count: 0, lastUpdate: new Date().toISOString() };
          return acc;
        }, {})
      }));
    } else if (notifications[section]) {
      setNotifications(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          ...Object.keys(prev[section]).reduce((acc, key) => {
            if (key === 'lastUpdate') {
              acc[key] = new Date().toISOString();
            } else if (typeof prev[section][key] === 'number') {
              acc[key] = 0;
            }
            return acc;
          }, {})
        }
      }));
    }
  };

  // Mark notification as viewed (auto-clear when viewed)
  const markNotificationAsViewed = (section, subItem = null) => {
    if (section === 'reports') {
      setNotifications(prev => ({
        ...prev,
        reports: {
          ...prev.reports,
          hasUpdates: false,
          count: 0,
          lastUpdate: new Date().toISOString(),
          subItems: subItem ? {
            ...prev.reports.subItems,
            [subItem]: { hasUpdates: false, count: 0 }
          } : Object.keys(prev.reports.subItems).reduce((acc, key) => {
            acc[key] = { hasUpdates: false, count: 0 };
            return acc;
          }, {})
        }
      }));
    } else if (section === 'logs') {
      setNotifications(prev => ({
        ...prev,
        logs: {
          ...prev.logs,
          hasUpdates: false,
          count: 0,
          lastUpdate: new Date().toISOString(),
          subItems: subItem ? {
            ...prev.logs.subItems,
            [subItem]: { hasUpdates: false, count: 0 }
          } : Object.keys(prev.logs.subItems).reduce((acc, key) => {
            acc[key] = { hasUpdates: false, count: 0 };
            return acc;
          }, {})
        }
      }));
    } else if (section === 'systemActivity') {
      setNotifications(prev => ({
        ...prev,
        systemActivity: subItem ? {
          ...prev.systemActivity,
          [subItem]: { hasUpdates: false, count: 0, lastUpdate: new Date().toISOString() }
        } : Object.keys(prev.systemActivity).reduce((acc, key) => {
          acc[key] = { hasUpdates: false, count: 0, lastUpdate: new Date().toISOString() };
          return acc;
        }, {})
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
      const savedNotifications = localStorage.getItem('enguio-admin-notifications');
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(prev => ({ ...prev, ...parsed }));
      }

      const savedSystemUpdates = localStorage.getItem('enguio-admin-system-updates');
      if (savedSystemUpdates) {
        const parsed = JSON.parse(savedSystemUpdates);
        setSystemUpdates(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Error loading admin notifications from localStorage:', error);
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('enguio-admin-notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving admin notifications to localStorage:', error);
    }
  }, [notifications]);

  // Save system updates to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('enguio-admin-system-updates', JSON.stringify(systemUpdates));
    } catch (error) {
      console.error('Error saving admin system updates to localStorage:', error);
    }
  }, [systemUpdates]);

  const value = {
    notifications,
    systemUpdates,
    updateWarehouseNotifications,
    updateWarehouseSpecificNotifications,
    updateUserNotifications,
    updateSupplierNotifications,
    updateReturnNotifications,
    updateReportsNotifications,
    updateLogsNotifications,
    updateSystemUpdates,
    updateSystemActivityNotifications,
    updateMultipleSystemActivities,
    addActivityNotification,
    getTotalNotifications,
    hasAnyNotifications,
    hasReportsUpdates,
    hasLogsUpdates,
    hasSubItemUpdates,
    hasWarehouseAlerts,
    getWarehouseAlertCount,
    hasSystemActivityUpdates,
    getSystemActivityCount,
    hasAnySystemActivityUpdates,
    clearNotifications,
    clearSystemUpdates,
    markNotificationAsViewed
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
