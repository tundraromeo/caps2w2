"use client";
import React, { useState } from "react";
import {
  FaTachometerAlt,
  FaBoxOpen,
  FaUser,
  FaSignOutAlt,
  FaCog,
  FaTruck,
  FaClipboardList,
  FaTags,
  FaChartLine,
  FaHistory,
  FaBoxes,
  FaWarehouse,
  FaPills,
  FaFileInvoiceDollar,
  FaArchive,
  FaTimes,
  FaStore,
  FaUndo,
  FaExclamationTriangle,
  FaAngleRight,
  FaStoreAlt,
} from "react-icons/fa";
import { useTheme } from "./ThemeContext";
import { useNotification } from "./NotificationContext";

const Sidebar = ({
  activeComponent,
  setActiveComponent,
  onLogout,
  isMobileOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [isInventoryDropdownOpen, setIsInventoryDropdownOpen] = useState(false);
  const { theme } = useTheme();
  const { getTotalNotifications, hasReportsUpdates } = useNotification();

  // Navigation items with proper mapping and notification indicators
  const navigationItems = [
    { label: "Dashboard", icon: <FaTachometerAlt />, key: "Dashboard" },
    { 
      label: "Warehouse", 
      icon: <FaWarehouse />, 
      key: "Warehouse",
      hasNotifications: getTotalNotifications('warehouse') > 0,
      notificationCount: getTotalNotifications('warehouse')
    },
    { 
      label: "Convenience Store", 
      icon: <FaStore />, 
      key: "ConvenienceStore",
      hasNotifications: getTotalNotifications('convenience') > 0,
      notificationCount: getTotalNotifications('convenience')
    },
    { 
      label: "Pharmacy Inventory", 
      icon: <FaPills />, 
      key: "PharmacyInventory",
      hasNotifications: getTotalNotifications('pharmacy') > 0,
      notificationCount: getTotalNotifications('pharmacy')
    },
    { label: "Inventory Transfer", icon: <FaTruck />, key: "InventoryTransfer" },
    { label: "Create Purchase Order", icon: <FaFileInvoiceDollar />, key: "CreatePurchaseOrder" },
    { label: "Stock Adjustment", icon: <FaClipboardList />, key: "StockAdjustment" },
    { 
      label: "Reports", 
      icon: <FaChartLine />, 
      key: "Reports",
      hasNotifications: hasReportsUpdates(),
      notificationCount: 0 // Reports notifications are boolean-based
    },

    { 
      label: "Return Management", 
      icon: <FaUndo />, 
      key: "ReturnManagement",
      hasNotifications: getTotalNotifications('returns') > 0,
      notificationCount: getTotalNotifications('returns')
    },

    { label: "Movement History", icon: <FaHistory />, key: "MovementHistory" },
    { label: "Archive", icon: <FaArchive />, key: "Archive" },
    { label: "Settings", icon: <FaCog />, key: "Settings" },
  ];

  const handleNavigation = (componentKey) => {
    setActiveComponent(componentKey);
    if (onClose) onClose();
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 h-full transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 md:flex md:flex-col md:z-auto ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? 'w-16' : 'w-64 sm:w-72 lg:w-auto'}`}
      style={{ backgroundColor: theme.bg.card, borderRight: `1px solid ${theme.border.default}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 md:hidden" style={{ borderBottom: `1px solid ${theme.border.default}` }}>
        <div className="font-semibold" style={{ color: theme.text.primary }}>Menu</div>
        <button
          onClick={onClose}
          className="p-2 rounded"
          aria-label="Close sidebar"
          style={{ color: theme.text.primary }}
        >
          <FaTimes />
        </button>
      </div>

      {/* Profile Section */}
      <div className="p-4 sm:p-6" style={{ borderBottom: `1px solid ${theme.border.default}` }}>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <div>
                <p className="font-semibold text-sm sm:text-base" style={{ color: theme.text.primary }}>Elmer Enguio</p>
                <p className="text-xs sm:text-sm" style={{ color: theme.text.secondary }}>Inventory Manager</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-lg">E</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            {/* Collapse/Expand Toggle Button */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-2 rounded hover:bg-gray-100 transition-colors"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                style={{ color: theme.text.primary }}
              >
                <FaAngleRight />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavigation(item.key)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2 sm:py-3' : 'justify-between px-3 sm:px-4 py-2 sm:py-3'} rounded-lg text-left transition-all duration-200 relative group min-h-[44px]`}
              style={{
                backgroundColor: activeComponent === item.key ? theme.colors.accent + '20' : 'transparent',
                color: activeComponent === item.key ? theme.colors.accent : theme.text.primary,
                borderLeft: activeComponent === item.key ? `4px solid ${theme.colors.accent}` : 'none',
              }}
              onMouseEnter={(e) => {
                if (activeComponent !== item.key) {
                  e.target.style.backgroundColor = theme.bg.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (activeComponent !== item.key) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
                <span className="text-lg" style={{ color: activeComponent === item.key ? theme.colors.accent : theme.text.secondary }}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="font-medium text-sm sm:text-base">{item.label}</span>}
              </div>
              
              {!isCollapsed && (
                <div className="flex items-center">
                  {/* Notification Indicator */}
                  {item.hasNotifications && (
                    <div className="flex items-center">
                      {item.notificationCount > 0 ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-bold text-white bg-red-500 rounded-full px-2 py-1 min-w-[20px] text-center">
                            {item.notificationCount > 99 ? '99+' : item.notificationCount}
                          </span>
                        </div>
                      ) : (
                        <FaExclamationTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notification badge for collapsed state */}
              {isCollapsed && item.hasNotifications && (
                <div className="absolute -top-1 -right-1">
                  {item.notificationCount > 0 ? (
                    <span className="text-xs font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                      {item.notificationCount > 9 ? '9+' : item.notificationCount}
                    </span>
                  ) : (
                    <FaExclamationTriangle className="h-3 w-3 text-red-500 animate-pulse" />
                  )}
                </div>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                  {item.hasNotifications && item.notificationCount > 0 && (
                    <div className="text-xs text-red-300 mt-1">
                      {item.notificationCount} notification{item.notificationCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Logout Button */}
      <div className="p-3 sm:p-4" style={{ borderTop: `1px solid ${theme.border.default}` }}>
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2 sm:py-3' : 'space-x-3 px-3 sm:px-4 py-2 sm:py-3'} rounded-lg text-left transition-all duration-200 relative group min-h-[44px]`}
          style={{ color: theme.colors.danger }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = theme.colors.danger + '20';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
          title={isCollapsed ? "Logout" : undefined}
        >
          <FaSignOutAlt className="text-lg" />
          {!isCollapsed && <span className="font-medium text-sm sm:text-base">Logout</span>}
          
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Logout
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
