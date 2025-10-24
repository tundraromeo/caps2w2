import React from 'react';

export const ResponsiveTable = ({ className = '', children, ...props }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table 
        className={`w-full min-w-full border-collapse ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

export const ResponsiveTableHeader = ({ className = '', children, ...props }) => {
  return (
    <thead 
      className={`bg-gray-50 ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
};

export const ResponsiveTableBody = ({ className = '', children, ...props }) => {
  return (
    <tbody 
      className={`bg-white divide-y divide-gray-200 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  );
};

export const ResponsiveTableRow = ({ className = '', children, ...props }) => {
  return (
    <tr 
      className={`hover:bg-gray-50 transition-colors ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
};

export const ResponsiveTableCell = ({ className = '', children, ...props }) => {
  return (
    <td 
      className={`px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-sm sm:text-base text-gray-900 whitespace-nowrap ${className}`}
      {...props}
    >
      {children}
    </td>
  );
};

export const ResponsiveTableHeaderCell = ({ className = '', children, ...props }) => {
  return (
    <th 
      className={`px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider ${className}`}
      {...props}
    >
      {children}
    </th>
  );
};

// Mobile-friendly table wrapper
export const MobileTableWrapper = ({ className = '', children, ...props }) => {
  return (
    <div className={`w-full ${className}`} {...props}>
      {/* Desktop table */}
      <div className="hidden sm:block">
        {children}
      </div>
      
      {/* Mobile cards view */}
      <div className="sm:hidden space-y-4">
        {/* This will be populated by individual table rows converted to cards */}
        {children}
      </div>
    </div>
  );
};

// Card view for mobile table rows
export const TableRowCard = ({ className = '', children, ...props }) => {
  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 p-4 space-y-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Card field for mobile table rows
export const TableCardField = ({ label, value, className = '', ...props }) => {
  return (
    <div className={`flex justify-between items-center ${className}`} {...props}>
      <span className="text-sm font-medium text-gray-500">{label}:</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
};
