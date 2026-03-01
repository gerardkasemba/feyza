import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Reduce bundle size: tree-shake lucide-react, date-fns, react-icons
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
    ],
  },

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
  // Proxy optimizations (prevent flickering, avoid extra proxy runs)
  // ============================================
  
  skipProxyUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  
  // Optimize static asset handling
  poweredByHeader: false,
  
  // Compress responses
  compress: true,
  
  // Generate ETags for better caching
  generateEtags: true,

  // Keep Sentry and its deps out of the server bundle so Node built-ins (async_hooks, module, worker_threads) resolve at runtime
  serverExternalPackages: [
    '@sentry/node',
    '@opentelemetry/context-async-hooks',
    'import-in-the-middle',
  ],
  
  // ============================================
  // OPTIONAL: Add if you have large pages that need ISR
  // ============================================
  // experimental: {
  //   // Enable if you need incremental static regeneration
  //   // isrMemoryCacheSize: 0,
  // },
};

export default nextConfig;