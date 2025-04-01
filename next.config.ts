import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['firebasestorage.googleapis.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  }
};

export default nextConfig;
