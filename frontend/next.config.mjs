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
  webpack: (config, { isServer }) => {
    // Only on server-side
    if (isServer) {
      config.externals.push('printer');
    }
    return config;
  },
};

export default nextConfig;
