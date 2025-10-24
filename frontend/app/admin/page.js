"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import NotificationService from '../lib/NotificationService';

// Import all components
import Dashboard from './components/Dashboard';
import Warehouse from './components/Warehouse';
// Import store components
import ConvenienceStore from './components/ConvenienceStore';
import PharmacyStore from './components/PharmacyStore';
import UserManagement from './components/UserManagement';
import Reports from './components/Reports';
import Logs from './components/Logs';
import StoreSettings from './components/StoreSettings';

// Import individual report components
import StockInReport from './components/StockInReport';
import StockOutReport from './components/StockOutReport';
import SalesReport from './components/SalesReport';
import InventoryBalanceReport from './components/InventoryBalanceReport';
import CashierPerformanceReport from './components/CashierPerformanceReport';
import LoginLogsReport from './components/LoginLogsReport';
import ActivityLogsReport from './components/ActivityLogsReport';
import ReturnManagement from './components/ReturnManagement';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/backend.php`;
const LOGIN_API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/login.php`;

// Logout function
const logoutUser = async () => {
  try {
    // Get user data from sessionStorage
    const userData = sessionStorage.getItem('user_data');
    let empId = null;
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        empId = user.user_id || user.emp_id || null;
        console.log('Admin Logout - Parsed user data:', user);
        console.log('Admin Logout - Found emp_id:', empId);
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
    
    // Fallback: Try to get emp_id from localStorage
    if (!empId) {
      const localEmpId = localStorage.getItem('pos-emp-id');
      if (localEmpId) {
        empId = parseInt(localEmpId);
        console.log('Admin Logout - Using emp_id from localStorage:', empId);
      }
    }
    
    console.log('Admin Logout attempt - Final Emp ID:', empId);
    
    // Call logout API if we have an empId
    if (empId) {
      try {
        // Call logout API with credentials to include session cookies
        const response = await fetch(LOGIN_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include session cookies
          body: JSON.stringify({ 
            action: 'logout',
            emp_id: empId 
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Admin logout successful - Server confirmed logout');
        } else {
          console.warn('⚠️ Admin logout warning:', result.message);
        }
      } catch (apiError) {
        console.warn('⚠️ Admin logout API error:', apiError);
        console.log('📍 Proceeding with local cleanup even though API call failed');
        // Continue with local cleanup even if API fails
      }
    } else {
      console.warn('⚠️ No employee ID found in session or local storage');
      console.log('📍 Clearing local session data and redirecting to login');
    }
    
    // Always clear all stored data and redirect
    console.log('🧹 Cleaning up: Clearing all session and local storage');
    sessionStorage.clear();
    localStorage.removeItem('pos-terminal');
    localStorage.removeItem('pos-cashier');
    localStorage.removeItem('pos-emp-id');
    console.log('✅ Cleanup complete, redirecting to login page');
    
    // Redirect to login page
    window.location.href = '/';
    return true;
  } catch (error) {
    console.error('❌ Logout error:', error);
    console.log('📍 Proceeding with local logout despite errors');
    // Clear local data and redirect even if there's an error
    sessionStorage.clear();
    localStorage.removeItem('pos-terminal');
    localStorage.removeItem('pos-cashier');
    localStorage.removeItem('pos-emp-id');
    window.location.href = '/';
    return false;
  }
};

// Helper: get current session user (for logging)
async function getCurrentUser() {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'get_current_user' 
      })
    });
    const result = await response.json();
    return result.success ? result.user : null;
  } catch (error) {
    
    return null;
  }
}

// Helper: record login/logout as generic activity (more portable)
async function recordActivity({ activityType, description, tableName = null, recordId = null }) {
  try {
    // Get current user data from sessionStorage
    const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'record_activity',
        activity_type: activityType,
        description: description,
        table_name: tableName,
        record_id: recordId,
        user_id: userData.user_id || userData.emp_id,
        username: userData.username,
        role: userData.role,
        employee_name: userData.full_name || userData.username
      })
    });
    const responseText = await response.text();
    if (responseText) {
      try {
        const result = JSON.parse(responseText);
        if (!result.success) {
          
        }
      } catch (parseError) {
        
      }
    }
  } catch (error) {
    
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
  const { theme } = useTheme();
  
  return (
    <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 md:hidden" style={{ backgroundColor: theme.bg.secondary, borderBottom: `1px solid ${theme.border.default}` }}>
      <button
        onClick={onMenuClick}
        className="p-2 rounded"
        aria-label="Open menu"
        style={{ color: theme.text.primary, backgroundColor: 'transparent' }}
      >
        {/* simple hamburger */}
        <span className="block w-6 h-0.5 mb-1" style={{ backgroundColor: theme.text.primary }}></span>
        <span className="block w-6 h-0.5 mb-1" style={{ backgroundColor: theme.text.primary }}></span>
        <span className="block w-6 h-0.5" style={{ backgroundColor: theme.text.primary }}></span>
      </button>
      <div className="font-semibold" style={{ color: theme.text.primary }}>Admin</div>
      <button
        onClick={onNotificationClick}
        className="p-2 rounded relative"
        aria-label="Notification Center"
        style={{ color: theme.text.primary, backgroundColor: 'transparent' }}
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { markNotificationAsViewed, clearSystemUpdates } = useNotification();
  const router = useRouter();

  // Check if user is logged in and has admin permissions
  useEffect(() => {
    const userData = sessionStorage.getItem('user_data');
    if (!userData) {
      console.log('🚫 No user data found, redirecting to login');
      router.push('/');
      return;
    }

    try {
      const user = JSON.parse(userData);
      // Check if user has admin permissions
      const role = user.role?.toLowerCase() || '';
      if (!role.includes('admin') && !role.includes('manager') && !role.includes('supervisor')) {
        console.log('🚫 User does not have admin permissions, redirecting to login');
        router.push('/');
        return;
      }

      setIsAuthenticated(true);
      setIsLoading(false);

      // Add automatic logout on tab close
      const handleBeforeUnload = async (event) => {
        // Perform logout API call
        try {
          const response = await fetch(LOGIN_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              action: 'logout',
              emp_id: user.user_id || user.emp_id
            })
          });
          
          if (response.ok) {
            console.log('✅ Auto logout successful');
          } else {
            console.log('⚠️ Auto logout failed, but continuing...');
          }
        } catch (error) {
          console.log('⚠️ Auto logout error:', error.message);
        }
        
        // Clear session storage
        sessionStorage.clear();
        localStorage.removeItem('pos-terminal');
        localStorage.removeItem('pos-cashier');
        localStorage.removeItem('pos-emp-id');
      };

      // Add event listener for tab close
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Cleanup when component unmounts
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    } catch (e) {
      console.error('❌ Failed to parse user data:', e);
      router.push('/');
      return;
    }
  }, [router]);

  const componentMap = {
    Dashboard: <Dashboard />,
    products: <Warehouse />,
    ConvenienceStore: <ConvenienceStore />,
    PharmacyStore: <PharmacyStore />,
    User: <UserManagement />,
    "Return Management": <ReturnManagement />,
    Reports: <Reports />,
    Logs: <Logs />,
    "Store Settings": <StoreSettings />,
    
    // Individual Report Components
    "Stock In Report": <StockInReport />,
    "Stock Out Report": <StockOutReport />,
    "Sales Report": <SalesReport />,
    "Inventory Balance Report": <InventoryBalanceReport />,
    "Cashier Performance Report": <CashierPerformanceReport />,
    "Login Logs": <LoginLogsReport />,
    "Activity Logs": <ActivityLogsReport />,
  };

  // Debug: Log current active component
  
  

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      setShowLogoutConfirm(false);
      await logoutUser();
    } catch (error) {

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
    // Log initial page load only if authenticated
    if (isAuthenticated) {
      recordActivity({ 
        activityType: 'PAGE_VIEW', 
        description: 'Admin dashboard loaded' 
      });
    }
  }, [isAuthenticated]);

  const { theme } = useTheme();
  
  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderBottomColor: theme.colors.accent }}></div>
          <p style={{ color: theme.text.secondary }}>Verifying authentication...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <NotificationManager />
        <MobileHeaderWithNotifications 
          onMenuClick={() => setIsMobileSidebarOpen(true)}
          onNotificationClick={handleNotificationClick}
        />
        <Sidebar
          activeComponent={activeComponent}
          setActiveComponent={handleSelectFeature}
          onLogout={handleLogout}
          isMobileOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 md:hidden"
            style={{ backgroundColor: theme.isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)' }}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <main className="flex-1 overflow-y-auto responsive-padding pt-14 sm:pt-16 md:pt-6" style={{ backgroundColor: theme.bg.secondary }}>
          <div className="responsive-container">
            <div className="w-full min-w-0 overflow-x-auto md:overflow-visible">
              {componentMap[activeComponent] || <Dashboard />}
            </div>
          </div>
        </main>
        <ThemeToggle />
        {showLogoutConfirm && (
          <LogoutConfirm
            onConfirm={confirmLogout}
            onCancel={cancelLogout}
          />
        )}
        <NotificationPanel 
          isOpen={showNotificationPanel} 
          onClose={() => setShowNotificationPanel(false)} 
        />
      </div>
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