import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },

  // ============================================
  // ADDED: Middleware optimizations to prevent flickering
  // ============================================
  
  // Skip middleware on static assets and API routes
  skipMiddlewareUrlNormalize: true,
  
  // Prevent trailing slash redirects that cause extra middleware runs
  skipTrailingSlashRedirect: true,
  
  // Optimize static asset handling
  poweredByHeader: false,
  
  // Compress responses
  compress: true,
  
  // Generate ETags for better caching
  generateEtags: true,
  
  // ============================================
  // OPTIONAL: Add if you have large pages that need ISR
  // ============================================
  // experimental: {
  //   // Enable if you need incremental static regeneration
  //   // isrMemoryCacheSize: 0,
  // },
};

export default nextConfig;