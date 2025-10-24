import React from 'react';

export const ResponsiveForm = ({ className = '', children, ...props }) => {
  return (
    <form 
      className={`space-y-4 sm:space-y-6 ${className}`}
      {...props}
    >
      {children}
    </form>
  );
};

export const ResponsiveFormGroup = ({ className = '', children, ...props }) => {
  return (
    <div 
      className={`space-y-2 sm:space-y-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const ResponsiveLabel = ({ className = '', children, ...props }) => {
  return (
    <label 
      className={`block text-sm sm:text-base font-medium text-gray-700 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
};

export const ResponsiveInput = ({ className = '', ...props }) => {
  return (
    <input 
      className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-colors min-h-[44px] ${className}`}
      {...props}
    />
  );
};

export const ResponsiveTextarea = ({ className = '', ...props }) => {
  return (
    <textarea 
      className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-colors min-h-[100px] resize-y ${className}`}
      {...props}
    />
  );
};

export const ResponsiveSelect = ({ className = '', children, ...props }) => {
  return (
    <select 
      className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-colors min-h-[44px] ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

export const ResponsiveButton = ({ 
  variant = 'primary', 
  size = 'md',
  className = '', 
  children, 
  ...props 
}) => {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base',
    lg: 'px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg'
  };

  return (
    <button 
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const ResponsiveButtonGroup = ({ className = '', children, ...props }) => {
  return (
    <div 
      className={`flex flex-col sm:flex-row gap-2 sm:gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const ResponsiveFieldset = ({ className = '', children, ...props }) => {
  return (
    <fieldset 
      className={`border border-gray-200 rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-6 ${className}`}
      {...props}
    >
      {children}
    </fieldset>
  );
};

export const ResponsiveLegend = ({ className = '', children, ...props }) => {
  return (
    <legend 
      className={`text-sm sm:text-base font-medium text-gray-900 px-2 ${className}`}
      {...props}
    >
      {children}
    </legend>
  );
};

// Grid layout for forms
export const ResponsiveFormGrid = ({ 
  cols = 1,
  className = '', 
  children, 
  ...props 
}) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div 
      className={`grid ${gridClasses[cols]} gap-4 sm:gap-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Responsive input group with addon
export const ResponsiveInputGroup = ({ 
  addon, 
  addonPosition = 'left',
  className = '',
  children,
  ...props 
}) => {
  return (
    <div className={`relative ${className}`} {...props}>
      {addon && addonPosition === 'left' && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 text-sm sm:text-base">{addon}</span>
        </div>
      )}
      {children}
      {addon && addonPosition === 'right' && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-gray-500 text-sm sm:text-base">{addon}</span>
        </div>
      )}
    </div>
  );
};

// Error message component
export const ResponsiveErrorMessage = ({ className = '', children, ...props }) => {
  return (
    <p 
      className={`text-sm text-red-600 mt-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

// Help text component
export const ResponsiveHelpText = ({ className = '', children, ...props }) => {
  return (
    <p 
      className={`text-sm text-gray-500 mt-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};
