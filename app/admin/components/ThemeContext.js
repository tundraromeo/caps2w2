"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false); // Default to light mode for admin

  useEffect(() => {
    // Check if user has a saved theme preference
    const savedTheme = localStorage.getItem('enguio-admin-theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      // Apply default theme
      applyAdminTheme(false);
    }
  }, []);

  const applyAdminTheme = (darkMode) => {
    const root = document.documentElement;
    
    if (darkMode) {
      // Dark theme for admin
      root.style.setProperty('--admin-bg-primary', '#0f172a');
      root.style.setProperty('--admin-bg-secondary', '#1e293b');
      root.style.setProperty('--admin-bg-card', '#334155');
      root.style.setProperty('--admin-bg-hover', '#475569');
      root.style.setProperty('--admin-text-primary', '#f8fafc');
      root.style.setProperty('--admin-text-secondary', '#cbd5e1');
      root.style.setProperty('--admin-text-muted', '#94a3b8');
      root.style.setProperty('--admin-border', '#475569');
      root.style.setProperty('--admin-border-light', '#64748b');
      root.style.setProperty('--admin-shadow', 'rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--admin-accent', '#3b82f6');
      root.style.setProperty('--admin-accent-hover', '#2563eb');
      root.style.setProperty('--admin-success', '#10b981');
      root.style.setProperty('--admin-warning', '#f59e0b');
      root.style.setProperty('--admin-danger', '#ef4444');
      root.style.setProperty('--admin-info', '#06b6d4');
      
      document.body.classList.add('admin-dark-theme');
      document.body.classList.remove('admin-light-theme');
    } else {
      // Light theme for admin
      root.style.setProperty('--admin-bg-primary', '#ffffff');
      root.style.setProperty('--admin-bg-secondary', '#f8fafc');
      root.style.setProperty('--admin-bg-card', '#ffffff');
      root.style.setProperty('--admin-bg-hover', '#f1f5f9');
      root.style.setProperty('--admin-text-primary', '#0f172a');
      root.style.setProperty('--admin-text-secondary', '#475569');
      root.style.setProperty('--admin-text-muted', '#64748b');
      root.style.setProperty('--admin-border', '#e2e8f0');
      root.style.setProperty('--admin-border-light', '#f1f5f9');
      root.style.setProperty('--admin-shadow', 'rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--admin-accent', '#3b82f6');
      root.style.setProperty('--admin-accent-hover', '#2563eb');
      root.style.setProperty('--admin-success', '#10b981');
      root.style.setProperty('--admin-warning', '#f59e0b');
      root.style.setProperty('--admin-danger', '#ef4444');
      root.style.setProperty('--admin-info', '#06b6d4');
      
      document.body.classList.remove('admin-dark-theme');
      document.body.classList.add('admin-light-theme');
    }
  };

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    applyAdminTheme(newDarkMode);
    localStorage.setItem('enguio-admin-theme', newDarkMode ? 'dark' : 'light');
  };

  const setTheme = (darkMode) => {
    setIsDarkMode(darkMode);
    applyAdminTheme(darkMode);
    localStorage.setItem('enguio-admin-theme', darkMode ? 'dark' : 'light');
  };

  useEffect(() => {
    applyAdminTheme(isDarkMode);
  }, [isDarkMode]);

  const value = {
    isDarkMode,
    toggleTheme,
    setTheme,
    theme: {
      bg: {
        primary: 'var(--admin-bg-primary)',
        secondary: 'var(--admin-bg-secondary)',
        card: 'var(--admin-bg-card)',
        hover: 'var(--admin-bg-hover)',
        input: 'var(--admin-bg-card)',
        modal: 'var(--admin-bg-card)',
      },
      text: {
        primary: 'var(--admin-text-primary)',
        secondary: 'var(--admin-text-secondary)',
        muted: 'var(--admin-text-muted)',
      },
      border: {
        default: 'var(--admin-border)',
        light: 'var(--admin-border-light)',
        input: 'var(--admin-border)',
      },
      shadow: {
        lg: 'var(--admin-shadow)',
      },
      colors: {
        accent: 'var(--admin-accent)',
        accentHover: 'var(--admin-accent-hover)',
        success: 'var(--admin-success)',
        successBg: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
        warning: 'var(--admin-warning)',
        warningBg: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
        danger: 'var(--admin-danger)',
        info: 'var(--admin-info)',
      }
    }
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
