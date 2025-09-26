"use client";
import React from 'react';
import { FaExclamationTriangle, FaBell } from 'react-icons/fa';

const NotificationIndicator = ({ 
  hasNotifications, 
  count = 0, 
  type = 'default', // 'default', 'exclamation', 'bell'
  size = 'normal', // 'small', 'normal', 'large'
  className = ''
}) => {
  if (!hasNotifications) return null;

  const sizeClasses = {
    small: 'h-3 w-3 text-xs',
    normal: 'h-4 w-4 text-sm',
    large: 'h-5 w-5 text-base'
  };

  const countSizeClasses = {
    small: 'text-xs px-1 py-0.5 min-w-[12px]',
    normal: 'text-xs px-1.5 py-0.5 min-w-[16px]',
    large: 'text-sm px-2 py-1 min-w-[20px]'
  };

  const getIcon = () => {
    switch (type) {
      case 'exclamation':
        return <FaExclamationTriangle className={`${sizeClasses[size]} text-red-500 animate-pulse`} />;
      case 'bell':
        return <FaBell className={`${sizeClasses[size]} text-blue-500 animate-pulse`} />;
      default:
        return <FaExclamationTriangle className={`${sizeClasses[size]} text-red-500 animate-pulse`} />;
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      {count > 0 ? (
        <span className={`font-bold text-white bg-red-500 rounded-full text-center ${countSizeClasses[size]}`}>
          {count > 99 ? '99+' : count}
        </span>
      ) : (
        getIcon()
      )}
    </div>
  );
};

export default NotificationIndicator;
