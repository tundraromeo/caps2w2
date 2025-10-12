/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize CSS loading to prevent preload warnings
  experimental: {
    optimizeCss: true,
  },
  // Optimize CSS loading and reduce preload warnings
  compress: true,
  webpack: (config, { isServer }) => {
    // Only on server-side
    if (isServer) {
      config.externals.push('printer');
    }
    return config;
  },
};

export default nextConfig;
