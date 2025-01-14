/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    // Enable modern features
    serverActions: true,
    typedRoutes: true,
  },
};

module.exports = nextConfig;