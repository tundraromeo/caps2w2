/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize CSS loading to prevent preload warnings
  experimental: {
    optimizeCss: true,
  },
  // Optimize CSS loading and reduce preload warnings
  compress: true,
  // Allow HTTP API calls in development (XAMPP uses HTTP by default)
  // This prevents mixed content errors when frontend is on HTTPS
  reactStrictMode: true,
  // Simplified webpack config for better compatibility
  webpack: (config, { isServer }) => {
    // Handle printer module for Vercel builds
    if (isServer) {
      config.externals.push('printer');
    }
    
    // Ignore printer module during build to prevent Vercel build failures
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'printer': false,
    };
    
    return config;
  },
};

export default nextConfig;
