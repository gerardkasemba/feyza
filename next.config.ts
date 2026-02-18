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
      {
        protocol: 'https',
        hostname: 'www.feyza.app',  // <-- Add your domain
      },
      {
        protocol: 'https',
        hostname: 'feyza.app',       // <-- Add non-www version too
      },
      // Optional: Add if you're using any other image domains
      {
        protocol: 'https',
        hostname: '**.vercel.app',    // If using Vercel deployment previews
      },
    ],
    // Optional: Configure device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Optional: Configure image sizes for layout="fixed" or fill
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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