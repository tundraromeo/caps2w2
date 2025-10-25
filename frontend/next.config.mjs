/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable experimental features that might cause webpack issues
  experimental: {
    // optimizeCss: true, // Disabled to prevent webpack chunk issues
  },
  // Optimize CSS loading and reduce preload warnings
  compress: true,
  // Allow HTTP API calls in development (XAMPP uses HTTP by default)
  // This prevents mixed content errors when frontend is on HTTPS
  reactStrictMode: true,
  // Disable static optimization to prevent webpack chunk issues
  output: 'standalone',
  // Simplified webpack config for better compatibility
  webpack: (config, { isServer, dev }) => {
    // Handle printer module for Vercel builds
    if (isServer) {
      config.externals.push('printer');
    }
    
    // Ignore printer module during build to prevent Vercel build failures
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'printer': false,
    };
    
    // Fix for webpack runtime errors
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      };
    }
    
    // Disable chunk splitting to prevent missing chunk errors
    config.optimization = {
      ...config.optimization,
      splitChunks: false,
    };
    
    // Add module resolution fixes
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    return config;
  },
};

export default nextConfig;
