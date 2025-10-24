import React from 'react';

export const ResponsiveModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '',
  size = 'md',
  ...props 
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md sm:max-w-lg lg:max-w-xl',
    lg: 'max-w-lg sm:max-w-xl lg:max-w-2xl',
    xl: 'max-w-xl sm:max-w-2xl lg:max-w-4xl',
    full: 'max-w-full mx-4 sm:mx-6 lg:mx-8'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 lg:p-8">
        <div 
          className={`relative w-full ${sizeClasses[size]} bg-white rounded-lg sm:rounded-xl shadow-xl transform transition-all ${className}`}
          {...props}
        >
          {/* Header */}
          {title && (
            <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {/* Content */}
          <div className="px-4 sm:px-6 py-4 sm:py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ResponsiveModalHeader = ({ className = '', children, ...props }) => {
  return (
    <div 
      className={`px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const ResponsiveModalContent = ({ className = '', children, ...props }) => {
  return (
    <div 
      className={`px-4 sm:px-6 py-4 sm:py-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const ResponsiveModalFooter = ({ className = '', children, ...props }) => {
  return (
    <div 
      className={`px-4 sm:px-6 py-4 sm:py-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Mobile-optimized modal for small screens
export const MobileModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '',
  ...props 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal - Full screen on mobile */}
      <div className="fixed inset-0 bg-white">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// Responsive drawer/sidebar modal
export const ResponsiveDrawer = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  position = 'right',
  className = '',
  ...props 
}) => {
  if (!isOpen) return null;

  const positionClasses = {
    left: 'left-0',
    right: 'right-0',
    top: 'top-0',
    bottom: 'bottom-0'
  };

  const sizeClasses = {
    left: 'w-full sm:w-80 lg:w-96',
    right: 'w-full sm:w-80 lg:w-96',
    top: 'h-full sm:h-80 lg:h-96',
    bottom: 'h-full sm:h-80 lg:h-96'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed ${positionClasses[position]} ${sizeClasses[position]} bg-white shadow-xl transform transition-transform ${className}`}
        {...props}
      >
        {/* Header */}
        {title && (
          <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                aria-label="Close drawer"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
