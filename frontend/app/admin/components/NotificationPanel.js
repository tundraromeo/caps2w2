"use client";
import React, { useState } from 'react';
import { useNotification } from './NotificationContext';
import { useTheme } from './ThemeContext';
import NotificationIndicator from './NotificationIndicator';
import { FaTimes, FaBell, FaWarehouse, FaChartLine, FaHistory, FaUsers, FaStore, FaUndo } from 'react-icons/fa';

const NotificationPanel = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const { 
    notifications, 
    systemUpdates, 
    getTotalNotifications, 
    hasAnyNotifications,
    clearNotifications,
    clearSystemUpdates 
  } = useNotification();

  if (!isOpen) return null;

  const notificationSections = [
    {
      key: 'warehouse',
      title: 'Warehouse Alerts',
      icon: <FaWarehouse />,
      count: getTotalNotifications('warehouse'),
      hasNotifications: getTotalNotifications('warehouse') > 0,
      details: notifications.warehouse,
      color: 'text-red-500'
    },
    {
      key: 'reports',
      title: 'Reports Updates',
      icon: <FaChartLine />,
      count: notifications.reports.count + systemUpdates.count,
      hasNotifications: notifications.reports.hasUpdates || systemUpdates.hasUpdates,
      details: notifications.reports,
      color: 'text-gray-500'
    },
    {
      key: 'logs',
      title: 'System Logs',
      icon: <FaHistory />,
      count: notifications.logs.count,
      hasNotifications: notifications.logs.hasUpdates,
      details: notifications.logs,
      color: 'text-green-500'
    },
    {
      key: 'users',
      title: 'User Management',
      icon: <FaUsers />,
      count: getTotalNotifications('users'),
      hasNotifications: getTotalNotifications('users') > 0,
      details: notifications.users,
      color: 'text-purple-500'
    },
    {
      key: 'suppliers',
      title: 'Supplier Management',
      icon: <FaStore />,
      count: getTotalNotifications('suppliers'),
      hasNotifications: getTotalNotifications('suppliers') > 0,
      details: notifications.suppliers,
      color: 'text-orange-500'
    },
    {
      key: 'returns',
      title: 'Return Management',
      icon: <FaUndo />,
      count: getTotalNotifications('returns'),
      hasNotifications: getTotalNotifications('returns') > 0,
      details: notifications.returns,
      color: 'text-yellow-500'
    }
  ];

  const renderWarehouseDetails = (details) => {
    if (!details) return null;
    
    return (
      <div className="space-y-1 text-sm">
        {details.expired > 0 && (
          <div className="flex justify-between">
            <span className="text-red-500">⚠️ Expired Products:</span>
            <span className="font-semibold">{details.expired}</span>
          </div>
        )}
        {details.expiring > 0 && (
          <div className="flex justify-between">
            <span className="text-orange-500">⏰ Expiring Soon:</span>
            <span className="font-semibold">{details.expiring}</span>
          </div>
        )}
        {details.lowStock > 0 && (
          <div className="flex justify-between">
            <span className="text-yellow-500">📉 Low Stock:</span>
            <span className="font-semibold">{details.lowStock}</span>
          </div>
        )}
        {details.outOfStock > 0 && (
          <div className="flex justify-between">
            <span className="text-red-500">📦 Out of Stock:</span>
            <span className="font-semibold">{details.outOfStock}</span>
          </div>
        )}
      </div>
    );
  };

  const renderReportsDetails = (details) => {
    if (!details || !details.subItems) return null;
    
    return (
      <div className="space-y-1 text-sm">
        {Object.entries(details.subItems).map(([reportName, reportData]) => {
          if (!reportData.hasUpdates) return null;
          return (
            <div key={reportName} className="flex justify-between">
              <span>{reportName}:</span>
              <span className="font-semibold">{reportData.count}</span>
            </div>
          );
        })}
        {systemUpdates.hasUpdates && (
          <div className="flex justify-between">
            <span className="text-gray-500">🔄 System Updates:</span>
            <span className="font-semibold">{systemUpdates.count}</span>
          </div>
        )}
      </div>
    );
  };

  const renderGenericDetails = (details, sectionKey) => {
    if (!details) return null;
    
    const detailItems = [];
    Object.entries(details).forEach(([key, value]) => {
      if (typeof value === 'number' && value > 0) {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        detailItems.push(
          <div key={key} className="flex justify-between">
            <span>{label}:</span>
            <span className="font-semibold">{value}</span>
          </div>
        );
      }
    });
    
    return detailItems.length > 0 ? (
      <div className="space-y-1 text-sm">
        {detailItems}
      </div>
    ) : null;
  };

  return (
    <div className="fixed inset-0 bg-gray-200 bg-opacity-50 z-50 flex items-center justify-center">
      <div style={{ transform: 'scale(0.8)', transformOrigin: 'center' }}>
      <div 
        className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto rounded-lg shadow-lg"
        style={{ backgroundColor: theme.bg.card }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: theme.border.default }}
        >
          <div className="flex items-center space-x-3">
            <FaBell className="text-lg" style={{ color: theme.colors.accent }} />
            <h2 className="text-xl font-semibold" style={{ color: theme.text.primary }}>
              Notification Center
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: theme.text.secondary }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!hasAnyNotifications() ? (
            <div className="text-center py-8">
              <FaBell className="text-4xl mx-auto mb-4" style={{ color: theme.text.muted }} />
              <p className="text-lg font-medium" style={{ color: theme.text.secondary }}>
                No notifications at this time
              </p>
              <p className="text-sm" style={{ color: theme.text.muted }}>
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notificationSections.map((section) => {
                if (!section.hasNotifications) return null;
                
                return (
                  <div 
                    key={section.key}
                    className="p-4 rounded-lg border"
                    style={{ 
                      backgroundColor: theme.bg.hover,
                      borderColor: theme.border.default 
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className={section.color}>{section.icon}</span>
                        <h3 className="font-semibold" style={{ color: theme.text.primary }}>
                          {section.title}
                        </h3>
                      </div>
                      <NotificationIndicator
                        hasNotifications={section.hasNotifications}
                        count={section.count}
                        size="normal"
                      />
                    </div>
                    
                    {/* Section Details */}
                    <div className="ml-6">
                      {section.key === 'warehouse' && renderWarehouseDetails(section.details)}
                      {section.key === 'reports' && renderReportsDetails(section.details)}
                      {!['warehouse', 'reports'].includes(section.key) && renderGenericDetails(section.details, section.key)}
                    </div>
                    
                    {/* Clear Button */}
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => clearNotifications(section.key)}
                        className="px-3 py-1 text-sm rounded border transition-colors"
                        style={{
                          backgroundColor: theme.bg.input,
                          borderColor: theme.border.default,
                          color: theme.text.secondary
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {/* Clear All Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => {
                    clearNotifications('reports');
                    clearNotifications('logs');
                    clearNotifications('warehouse');
                    clearNotifications('users');
                    clearNotifications('suppliers');
                    clearNotifications('returns');
                    clearSystemUpdates();
                  }}
                  className="px-6 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: theme.colors.danger,
                    color: theme.text.primary
                  }}
                >
                  Clear All Notifications
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
