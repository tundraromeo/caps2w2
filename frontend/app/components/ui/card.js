import React from 'react';

export const Card = ({ className = '', children, ...props }) => {
  return (
    <div 
      className={`w-full min-w-0 bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ className = '', children, ...props }) => {
  return (
    <div 
      className={`px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle = ({ className = '', children, ...props }) => {
  return (
    <h3 
      className={`text-base sm:text-lg font-semibold text-gray-900 ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardContent = ({ className = '', children, ...props }) => {
  return (
    <div 
      className={`px-3 sm:px-4 lg:px-6 py-3 sm:py-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardFooter = ({ className = '', children, ...props }) => {
  return (
    <div 
      className={`px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-t border-gray-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
