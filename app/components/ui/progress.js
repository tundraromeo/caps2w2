import React from 'react';

export const Progress = ({ 
  value = 0, 
  max = 100, 
  className = '', 
  showValue = false,
  size = 'default',
  color = 'blue',
  ...props 
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    small: 'h-2',
    default: 'h-3',
    large: 'h-4'
  };
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500'
  };
  
  return (
    <div className={`w-full ${className}`} {...props}>
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div 
          className={`h-full transition-all duration-300 ease-in-out ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <div className="text-sm text-gray-600 mt-1">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
};
