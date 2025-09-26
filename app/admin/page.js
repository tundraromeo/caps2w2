"use client";
import React, { useState, useEffect } from "react";
import { FaBell } from "react-icons/fa";
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { SettingsProvider } from './components/SettingsContext';
import { AlertManagerProvider } from './components/AlertManager';
import { NotificationProvider, useNotification } from './components/NotificationContext';
import ThemeToggle from './components/ThemeToggle';
import Sidebar from './sidebar';
import LogoutConfirm from './LogoutConfirm';
import NotificationManager from './components/NotificationManager';
import NotificationPanel from './components/NotificationPanel';
import NotificationTestPanel from './components/NotificationTestPanel';
import NotificationTestComponent from './components/NotificationTestComponent';
import RealtimeNotificationService from './components/RealtimeNotificationService';

// Import all components
import Dashboard from './components/Dashboard';
import Warehouse from './components/Warehouse';
import UserManagement from './components/UserManagement';
import Supplier from './components/Supplier';
import Reports from './components/Reports';
import Logs from './components/Logs';
import StoreSettings from './components/StoreSettings';

// Import individual report components
import StockInReport from './components/StockInReport';
import StockOutReport from './components/StockOutReport';
import SalesReport from './components/SalesReport';
import InventoryBalanceReport from './components/InventoryBalanceReport';
import SupplierReport from './components/SupplierReport';
import CashierPerformanceReport from './components/CashierPerformanceReport';
import LoginLogsReport from './components/LoginLogsReport';
import ReturnManagement from './components/ReturnManagement';

const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";

// Helper: get current session user (for logging)
async function getCurrentUser() {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_current_user' })
    });
    const result = await response.json();
    return result.success ? result.user : null;
  } catch (error) {
    console.warn('Could not get current user:', error);
    return null;
  }
}

// Helper: record login/logout as generic activity (more portable)
async function recordActivity({ activityType, description, tableName = null, recordId = null }) {
  try {
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
    const responseText = await response.text();
    if (responseText) {
      try {
        const result = JSON.parse(responseText);
        if (!result.success) {
          console.warn('Activity logging failed:', result.message);
        }
      } catch (parseError) {
        console.warn('Activity logging JSON parse error:', parseError);
      }
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

// Mobile Header with Notifications Component
function MobileHeaderWithNotifications({ onMenuClick, onNotificationClick }) {
  const { hasAnyNotifications } = useNotification();
  
  return (
    <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 md:hidden" style={{ backgroundColor: 'var(--inventory-bg-secondary)', borderBottom: '1px solid var(--inventory-border)' }}>
      <button
        onClick={onMenuClick}
        className="p-2 rounded"
        aria-label="Open menu"
        style={{ color: 'var(--inventory-text-primary)' }}
      >
        {/* simple hamburger */}
        <span className="block w-6 h-0.5 mb-1" style={{ backgroundColor: 'var(--inventory-text-primary)' }}></span>
        <span className="block w-6 h-0.5 mb-1" style={{ backgroundColor: 'var(--inventory-text-primary)' }}></span>
        <span className="block w-6 h-0.5" style={{ backgroundColor: 'var(--inventory-text-primary)' }}></span>
      </button>
      <div className="font-semibold" style={{ color: 'var(--inventory-text-primary)' }}>Admin</div>
      <button
        onClick={onNotificationClick}
        className="p-2 rounded relative"
        aria-label="Notification Center"
        style={{ color: 'var(--inventory-text-primary)' }}
      >
        <FaBell />
        {hasAnyNotifications() && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
            !
          </span>
        )}
      </button>
    </div>
  );
}

// Admin Content Component with Theme Support
function AdminContent() {
  const [activeComponent, setActiveComponent] = useState("Dashboard");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const { markNotificationAsViewed, clearSystemUpdates } = useNotification();

  const componentMap = {
    Dashboard: <Dashboard />,
    products: <Warehouse />,
    User: <UserManagement />,
    Supplier: <Supplier />,
    "Return Management": <ReturnManagement />,
    Reports: <Reports />,
    Logs: <Logs />,
    "Store Settings": <StoreSettings />,
    
    // Individual Report Components
    "Stock In Report": <StockInReport />,
    "Stock Out Report": <StockOutReport />,
    "Sales Report": <SalesReport />,
    "Inventory Balance Report": <InventoryBalanceReport />,
    "Supplier Report": <SupplierReport />,
    "Cashier Performance Report": <CashierPerformanceReport />,
    "Login Logs": <LoginLogsReport />,
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      await recordLogin({ loginType: 'LOGOUT', status: 'SUCCESS' });
      setShowLogoutConfirm(false);
      // Redirect to login page or handle logout
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      setShowLogoutConfirm(false);
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleNotificationClick = () => {
    setShowNotificationPanel(true);
    // Auto-clear all notifications when notification center is opened
    markNotificationAsViewed('reports');
    markNotificationAsViewed('logs');
    markNotificationAsViewed('systemActivity');
    clearSystemUpdates();
  };

  const handleSelectFeature = (componentKey) => {
    setActiveComponent(componentKey);
    // Log navigation activity
    recordActivity({ 
      activityType: 'NAVIGATION', 
      description: `Navigated to ${componentKey}` 
    });
  };

  useEffect(() => {
    // Log initial page load
    recordActivity({ 
      activityType: 'PAGE_VIEW', 
      description: 'Admin dashboard loaded' 
    });
  }, []);

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--inventory-bg-primary)' }}>
      {/* Notification Services */}
      <NotificationManager />
      <RealtimeNotificationService />
      
      {/* Mobile top bar */}
      <MobileHeaderWithNotifications 
        onMenuClick={() => setIsMobileSidebarOpen(true)}
        onNotificationClick={handleNotificationClick}
      />

      {/* Sidebar */}
      <div className="flex-shrink-0">
        <Sidebar
          activeComponent={activeComponent}
          setActiveComponent={handleSelectFeature}
          onLogout={handleLogout}
          isMobileOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pt-16 md:pt-6" style={{ backgroundColor: 'var(--inventory-bg-secondary)' }}>
          <div className="w-full min-w-0 overflow-x-auto md:overflow-visible">
            {componentMap[activeComponent] || <Dashboard />}
          </div>
        </main>

        {/* Theme Toggle Button */}
        <ThemeToggle />
      </div>

      {/* Notification Test Panel (Development Only) */}
      <NotificationTestPanel />
      
      {/* Notification Test Component */}
      <NotificationTestComponent />

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <LogoutConfirm
          onConfirm={confirmLogout}
          onCancel={cancelLogout}
        />
      )}

      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={showNotificationPanel} 
        onClose={() => setShowNotificationPanel(false)} 
      />
    </div>
  );
}

// Default Export with Theme Provider, Settings Provider, Alert Manager Provider, and Notification Provider
export default function Admin() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AlertManagerProvider>
          <NotificationProvider>
            <AdminContent />
          </NotificationProvider>
        </AlertManagerProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}