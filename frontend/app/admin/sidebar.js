"use client";
import React, { useState } from "react";
import {
  FaTachometerAlt,
  FaBoxOpen,
  FaUser,
  FaSignOutAlt,
  FaCog,
  FaClipboardList,
  FaChartLine,
  FaHistory,
  FaStore,
  FaTimes,
  FaUsers,
  FaFileInvoiceDollar,
  FaTags,
  FaSignInAlt,
  FaWarehouse,
  FaChevronDown,
  FaChevronRight,
  FaArrowDown,
  FaArrowUp,
  FaShoppingCart,
  FaClipboardCheck,
  FaTools,
  FaBuilding,
  FaUserTie,
  FaKey,
  FaReceipt,
  FaUndo,
  FaExclamationTriangle,
  FaBell,
  FaBars,
  FaAngleLeft,
  FaAngleRight,
} from "react-icons/fa";
import { useTheme } from './components/ThemeContext';
import { useNotification } from './components/NotificationContext';
import NotificationPanel from './components/NotificationPanel';

const Sidebar = ({
  activeComponent,
  setActiveComponent,
  onLogout,
  isMobileOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { theme } = useTheme();
  const { getTotalNotifications, hasReportsUpdates, hasLogsUpdates, hasSubItemUpdates, notifications, systemUpdates, hasAnyNotifications, markNotificationAsViewed, clearSystemUpdates } = useNotification();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  // Navigation items with hierarchical structure and notification indicators
  const navigationItems = [
    { label: "Dashboard", icon: <FaTachometerAlt />, key: "Dashboard" },
    { 
      label: "Warehouse", 
      icon: <FaWarehouse />, 
      key: "products",
      hasNotifications: getTotalNotifications('warehouse') > 0,
      notificationCount: getTotalNotifications('warehouse'),
      notificationDetails: notifications.warehouse
    },
    { 
      label: "Convenience Store", 
      icon: <FaStore />, 
      key: "ConvenienceStore",
      hasNotifications: getTotalNotifications('convenience') > 0,
      notificationCount: getTotalNotifications('convenience')
    },
    { 
      label: "Pharmacy Store", 
      icon: <FaStore />, 
      key: "PharmacyStore",
      hasNotifications: getTotalNotifications('pharmacy') > 0,
      notificationCount: getTotalNotifications('pharmacy')
    },
    { 
      label: "User Management", 
      icon: <FaUsers />, 
      key: "User",
      hasNotifications: getTotalNotifications('users') > 0,
      notificationCount: getTotalNotifications('users')
    },
    { 
      label: "Return Management", 
      icon: <FaUndo />, 
      key: "Return Management",
      hasNotifications: getTotalNotifications('returns') > 0,
      notificationCount: getTotalNotifications('returns')
    },
    { 
      label: "Reports", 
      icon: <FaChartLine />, 
      key: "Reports",
      hasSubItems: true,
      hasNotifications: hasReportsUpdates() || systemUpdates.hasUpdates,
      notificationCount: notifications.reports.count + systemUpdates.count,
      notificationDetails: notifications.reports,
      subItems: [
        { 
          label: "Stock In Report", 
          icon: <FaArrowDown />, 
          key: "Stock In Report",
          hasNotifications: hasSubItemUpdates('reports', 'Stock In Report') || systemUpdates.hasUpdates,
          notificationCount: (notifications.reports.subItems['Stock In Report']?.count || 0) + (systemUpdates.hasUpdates ? 1 : 0)
        },
        { 
          label: "Stock Out Report", 
          icon: <FaArrowUp />, 
          key: "Stock Out Report",
          hasNotifications: hasSubItemUpdates('reports', 'Stock Out Report') || systemUpdates.hasUpdates,
          notificationCount: (notifications.reports.subItems['Stock Out Report']?.count || 0) + (systemUpdates.hasUpdates ? 1 : 0)
        },
        { 
          label: "Sales Report", 
          icon: <FaShoppingCart />, 
          key: "Sales Report",
          hasNotifications: hasSubItemUpdates('reports', 'Sales Report') || systemUpdates.hasUpdates,
          notificationCount: (notifications.reports.subItems['Sales Report']?.count || 0) + (systemUpdates.hasUpdates ? 1 : 0)
        },
        { 
          label: "Inventory Balance Report", 
          icon: <FaClipboardCheck />, 
          key: "Inventory Balance Report",
          hasNotifications: hasSubItemUpdates('reports', 'Inventory Balance Report') || systemUpdates.hasUpdates,
          notificationCount: (notifications.reports.subItems['Inventory Balance Report']?.count || 0) + (systemUpdates.hasUpdates ? 1 : 0)
        },
        { 
          label: "Cashier Performance Report", 
          icon: <FaUserTie />, 
          key: "Cashier Performance Report",
          hasNotifications: hasSubItemUpdates('reports', 'Cashier Performance Report') || systemUpdates.hasUpdates,
          notificationCount: (notifications.reports.subItems['Cashier Performance Report']?.count || 0) + (systemUpdates.hasUpdates ? 1 : 0)
        },
      ]
    },
    { 
      label: "Logs", 
      icon: <FaHistory />, 
      key: "Logs",
      hasSubItems: true,
      hasNotifications: hasLogsUpdates(),
      notificationCount: 0, // Logs notifications are boolean-based
      subItems: [
        { 
          label: "Login Logs", 
          icon: <FaKey />, 
          key: "Login Logs",
          hasNotifications: hasSubItemUpdates('logs', 'Login Logs')
        },
        { 
          label: "Activity Logs", 
          icon: <FaHistory />, 
          key: "Activity Logs",
          hasNotifications: hasSubItemUpdates('logs', 'Activity Logs')
        },
      ]
    },
    { label: "Store Settings", icon: <FaCog />, key: "Store Settings" },
  ];

  const toggleMenu = (key) => {
    setExpandedMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };


  const handleNavigation = (componentKey) => {
    setActiveComponent(componentKey);
    
    // Auto-clear notifications when navigating to a section
    if (componentKey === 'products') {
      markNotificationAsViewed('warehouse');
    } else if (componentKey === 'ConvenienceStore') {
      markNotificationAsViewed('convenience');
    } else if (componentKey === 'PharmacyStore') {
      markNotificationAsViewed('pharmacy');
    } else if (componentKey === 'Reports') {
      markNotificationAsViewed('reports');
      clearSystemUpdates();
    } else if (componentKey === 'Logs') {
      markNotificationAsViewed('logs');
    } else if (componentKey === 'User') {
      markNotificationAsViewed('users');
    } else if (componentKey === 'Return Management') {
      markNotificationAsViewed('returns');
    }
    
    // Clear specific report notifications when clicked
    if (componentKey === 'Stock In Report') {
      markNotificationAsViewed('reports', 'Stock In Report');
    } else if (componentKey === 'Stock Out Report') {
      markNotificationAsViewed('reports', 'Stock Out Report');
    } else if (componentKey === 'Sales Report') {
      markNotificationAsViewed('reports', 'Sales Report');
    } else if (componentKey === 'Inventory Balance Report') {
      markNotificationAsViewed('reports', 'Inventory Balance Report');
    } else if (componentKey === 'Cashier Performance Report') {
      markNotificationAsViewed('reports', 'Cashier Performance Report');
    } else if (componentKey === 'Stock Adjustment Report') {
      markNotificationAsViewed('reports', 'Stock Adjustment Report');
    } else if (componentKey === 'Login Logs') {
      markNotificationAsViewed('logs', 'Login Logs');
    } else if (componentKey === 'Activity Logs') {
      markNotificationAsViewed('logs', 'Activity Logs');
    }
    
    if (onClose) onClose();
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 h-full transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 md:flex md:flex-col md:z-auto ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? 'w-16' : 'w-64'}`}
      style={{ backgroundColor: theme.bg.card, borderRight: `1px solid ${theme.border.default}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:hidden" style={{ borderBottom: `1px solid ${theme.border.default}` }}>
        <div className="font-semibold" style={{ color: theme.text.primary }}>Menu</div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="p-2 rounded"
            aria-label="Close sidebar"
            style={{ color: theme.text.primary }}
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Profile Section */}
      <div className="p-6" style={{ borderBottom: `1px solid ${theme.border.default}` }}>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <p className="font-semibold" style={{ color: theme.text.primary }}>Admin User</p>
                <p className="text-sm" style={{ color: theme.text.secondary }}>System Administrator</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-lg">A</span>
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
      <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <div key={item.key}>
              {/* Main Menu Item */}
              <button
                onClick={() => {
                  if (item.hasSubItems && !isCollapsed) {
                    toggleMenu(item.key);
                  } else {
                    handleNavigation(item.key);
                  }
                }}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3'} rounded-lg text-left transition-all duration-200 relative group`}
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
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                </div>
                
                {!isCollapsed && (
                  <div className="flex items-center space-x-2">
                    {/* Notification Indicator */}
                    {item.hasNotifications && (
                      <div className="flex items-center">
                        {item.notificationCount > 0 ? (
                          <span className="text-xs font-bold text-white bg-red-500 rounded-full px-2 py-1 min-w-[20px] text-center">
                            {item.notificationCount > 99 ? '99+' : item.notificationCount}
                          </span>
                        ) : (
                          <FaExclamationTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                        )}
                      </div>
                    )}
                    
                    {/* Warehouse-specific alert details with red exclamation mark */}
                    {item.key === 'products' && item.hasNotifications && item.notificationDetails && (
                      <div className="ml-2 text-xs text-red-500">
                        {/* Red exclamation mark for warehouse alerts */}
                        <span className="text-red-500 font-bold text-lg">!</span>
                        {item.notificationDetails.expired > 0 && (
                          <span className="block">⚠️ {item.notificationDetails.expired} expired</span>
                        )}
                        {item.notificationDetails.expiring > 0 && (
                          <span className="block">⏰ {item.notificationDetails.expiring} expiring</span>
                        )}
                        {item.notificationDetails.lowStock > 0 && (
                          <span className="block">📉 {item.notificationDetails.lowStock} low stock</span>
                        )}
                        {item.notificationDetails.outOfStock > 0 && (
                          <span className="block">📦 {item.notificationDetails.outOfStock} out of stock</span>
                        )}
                      </div>
                    )}
                    
                    {/* Submenu Arrow */}
                    {item.hasSubItems && (
                      <span className="text-sm" style={{ color: theme.text.secondary }}>
                        {expandedMenus[item.key] ? <FaChevronDown /> : <FaChevronRight />}
                      </span>
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

              {/* Sub Items - Hidden when collapsed */}
              {!isCollapsed && item.hasSubItems && expandedMenus[item.key] && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.key}
                      onClick={() => handleNavigation(subItem.key)}
                      className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-left transition-all duration-200 text-sm"
                      style={{
                        backgroundColor: activeComponent === subItem.key ? theme.colors.accent + '20' : 'transparent',
                        color: activeComponent === subItem.key ? theme.colors.accent : theme.text.secondary,
                        borderLeft: activeComponent === subItem.key ? `3px solid ${theme.colors.accent}` : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (activeComponent !== subItem.key) {
                          e.target.style.backgroundColor = theme.bg.hover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeComponent !== subItem.key) {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm" style={{ color: activeComponent === subItem.key ? theme.colors.accent : theme.text.secondary }}>
                          {subItem.icon}
                        </span>
                        <span className="font-medium">{subItem.label}</span>
                      </div>
                      
                      {/* Sub-item Notification Indicator */}
                      {subItem.hasNotifications && (
                        <div className="flex items-center">
                          {subItem.notificationCount > 0 ? (
                            <span className="text-xs font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                              {subItem.notificationCount > 9 ? '9+' : subItem.notificationCount}
                            </span>
                          ) : (
                            <FaExclamationTriangle className="h-3 w-3 text-red-500 animate-pulse" />
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Logout Button */}
      <div className="p-4" style={{ borderTop: `1px solid ${theme.border.default}` }}>
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-4 py-3'} rounded-lg text-left transition-all duration-200 relative group`}
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
          {!isCollapsed && <span className="font-medium">Logout</span>}
          
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Logout
            </div>
          )}
        </button>
      </div>

      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={showNotificationPanel} 
        onClose={() => setShowNotificationPanel(false)} 
      />
    </div>
  );
};

export default Sidebar;
