"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "./Dashboard";
import InventoryTransfer from "./InventoryTransfer";
import Warehouse from "./Warehouse";
import ConvenienceStore from "./ConvenienceStore";
import PharmacyInventory from "./PharmacyInventory";
import CreatePurchaseOrder from "./CreatePurchaseOrder";
import StockAdjustment from "./StockAdjustment";
import Reports from "./Reports";
import ReturnManagement from "./ReturnManagement";
import MovementHistory from "./MovementHistory";
import Archive from "./Archive";
import Settings from "./Settings";
import StoreSettings from "./StoreSettings";
import Sidebar from "./sidebar";
import LogoutConfirm from "./LogoutConfirm";
import { ThemeProvider } from "./ThemeContext";
import { NotificationProvider } from "./NotificationContext";
import { AlertManagerProvider } from "./AlertManager";
import { SettingsProvider } from "./SettingsContext";
import ThemeToggle from "./ThemeToggle";
import { getApiUrl } from "../lib/apiConfig";

export default function InventoryPage() {
  const [activeComponent, setActiveComponent] = useState("Dashboard");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if user is logged in
  useEffect(() => {
    const userData = sessionStorage.getItem('user_data');
    if (!userData) {
      router.push('/');
      return;
    }

    const user = JSON.parse(userData);
    // Check if user has inventory-related role
    const role = user.role?.toLowerCase() || '';
    if (!role.includes('inventory') && !role.includes('pharmacist') && !role.includes('admin')) {
      router.push('/');
      return;
    }

    setIsAuthenticated(true);
    setIsLoading(false);

    // Add automatic logout on tab close
    const handleBeforeUnload = async (event) => {
      // Perform logout API call
      try {
        const logoutUrl = getApiUrl('login.php');
        const response = await fetch(logoutUrl, {
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
  }, [router]);

  const componentMap = {
    Dashboard: <Dashboard />,
    InventoryTransfer: <InventoryTransfer />,
    Warehouse: <Warehouse />,
    ConvenienceStore: <ConvenienceStore />,
    PharmacyInventory: <PharmacyInventory />,
    CreatePurchaseOrder: <CreatePurchaseOrder />,
    StockAdjustment: <StockAdjustment />,
    Reports: <Reports />,
    ReturnManagement: <ReturnManagement />,
    MovementHistory: <MovementHistory />,
    Archive: <Archive />,
    Settings: <Settings />,
    StoreSettings: <StoreSettings />
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      // Get user data from sessionStorage
      const userData = sessionStorage.getItem('user_data');
      let empId = null;
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          empId = user.user_id || user.emp_id || null;
          console.log('Inventory Logout - Parsed user data:', user);
          console.log('Inventory Logout - Found emp_id:', empId);
        } catch (e) {
          console.error('Failed to parse user data:', e);
        }
      }
      
      // Fallback: Try to get emp_id from localStorage
      if (!empId) {
        const localEmpId = localStorage.getItem('pos-emp-id');
        if (localEmpId) {
          empId = parseInt(localEmpId);
          console.log('Inventory Logout - Using emp_id from localStorage:', empId);
        }
      }
      
      console.log('Inventory Logout attempt - Final Emp ID:', empId);
      
      // Call logout API if we have an empId
      if (empId) {
        try {
          // Call logout API using configured API URL with credentials
          const logoutUrl = getApiUrl('login.php');
          
          const response = await fetch(logoutUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Include session cookies
            body: JSON.stringify({ 
              action: 'logout',
              emp_id: empId 
            })
          });
          
          // Check if response is JSON
          const contentType = response.headers.get('Content-Type');
          
          if (contentType && contentType.includes('application/json')) {
            const result = await response.json();
            console.log('Inventory Logout API response:', result);
            
            if (result.success) {
              console.log('✅ Inventory logout successful - Server confirmed logout');
            } else {
              console.warn('⚠️ Inventory logout warning:', result.message);
            }
          } else {
            // Response is not JSON (probably HTML error page)
            const text = await response.text();
            console.error('Logout API returned non-JSON response:', text.substring(0, 200));
            console.warn('⚠️ Logout API returned HTML instead of JSON. Proceeding with local logout.');
          }
        } catch (apiError) {
          console.warn('⚠️ Inventory logout API error:', apiError);
          console.log('📍 Proceeding with local cleanup even though API call failed');
          // Continue with local cleanup even if API fails
        }
      } else {
        console.warn('⚠️ No employee ID found in session or local storage');
        console.log('📍 Clearing local session data and redirecting to login');
      }
    } catch (error) {
      console.error('❌ Inventory logout error:', error);
      console.log('📍 Proceeding with local logout despite errors');
    } finally {
      // Always clear session and redirect
      console.log('🧹 Cleaning up: Clearing all session and local storage');
      sessionStorage.clear(); // Clear all session data
      localStorage.removeItem('pos-terminal');
      localStorage.removeItem('pos-cashier');
      localStorage.removeItem('pos-emp-id');
      console.log('✅ Cleanup complete, redirecting to login page');
      router.push('/');
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--inventory-bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <SettingsProvider>
        <NotificationProvider>
          <AlertManagerProvider>
            <div className="flex h-screen" style={{ backgroundColor: 'var(--inventory-bg-primary)' }}>
              {/* Sidebar */}
              <div className="flex-shrink-0">
                <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 md:hidden" style={{ backgroundColor: 'var(--inventory-bg-secondary)', borderBottom: '1px solid var(--inventory-border)' }}>
                  <button
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="p-2 rounded"
                    aria-label="Open menu"
                    style={{ color: 'var(--inventory-text-primary)' }}
                  >
                    <span className="block w-6 h-0.5 mb-1" style={{ backgroundColor: 'var(--inventory-text-primary)' }}></span>
                    <span className="block w-6 h-0.5 mb-1" style={{ backgroundColor: 'var(--inventory-text-primary)' }}></span>
                    <span className="block w-6 h-0.5" style={{ backgroundColor: 'var(--inventory-text-primary)' }}></span>
                  </button>
                  <div className="font-semibold" style={{ color: 'var(--inventory-text-primary)' }}>Inventory</div>
                  <div className="w-8" />
                </div>
                <Sidebar 
                  activeComponent={activeComponent} 
                  setActiveComponent={setActiveComponent}
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
                    style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
                  />
                )}
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <main className="flex-1 overflow-y-auto responsive-padding pt-14 sm:pt-16 md:pt-6" style={{ backgroundColor: 'var(--inventory-bg-secondary)' }}>
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
              </div>
            </div>
          </AlertManagerProvider>
        </NotificationProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

