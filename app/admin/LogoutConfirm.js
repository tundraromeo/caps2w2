"use client";
import React from "react";
import { FaSignOutAlt, FaTimes } from "react-icons/fa";
import { useTheme } from './components/ThemeContext';

const LogoutConfirm = ({ onConfirm, onCancel }) => {
  const { theme } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
        style={{ 
          backgroundColor: theme.bg.modal,
          border: `1px solid ${theme.border.default}`,
          boxShadow: `0 25px 50px ${theme.shadow}`
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.colors.danger + '20' }}
            >
              <FaSignOutAlt style={{ color: theme.colors.danger }} />
            </div>
            <h3 
              className="text-lg font-semibold"
              style={{ color: theme.text.primary }}
            >
              Confirm Logout
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded hover:bg-gray-100"
            style={{ color: theme.text.muted }}
          >
            <FaTimes />
          </button>
        </div>
        
        <p 
          className="mb-6"
          style={{ color: theme.text.secondary }}
        >
          Are you sure you want to logout? Any unsaved changes will be lost.
        </p>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded border transition-all duration-200"
            style={{
              backgroundColor: theme.bg.hover,
              color: theme.text.primary,
              borderColor: theme.border.default
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded text-white transition-all duration-200"
            style={{ backgroundColor: theme.colors.danger }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirm;
