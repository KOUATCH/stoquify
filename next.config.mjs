import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'argon2',
    'better-auth',
    '@better-auth/core',
    '@better-auth/prisma-adapter',
    '@better-auth/kysely-adapter',
  ],
  experimental: {
    // Reduce memory usage and improve caching
    optimizePackageImports: ['@/components', '@/lib'],
    // Disable worker threads to fix Jest worker issues
    workerThreads: false,
    webpackBuildWorker: false,
  },
  // Keep production output self-contained for deployment.
  output: 'standalone',
  poweredByHeader: false,
  devIndicators: false,
  webpack: (config, { isServer, dev, webpack }) => {
    // Exclude server-only password hashing from client-side bundling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'argon2': false,
        'crypto': false,
        'fs': false,
        'path': false,
        'util': false,
      };
    } else {
      config.externals.push('argon2');
    }

    // Handle HTML files and other problematic file types
    config.module.rules.push({
      test: /\.html$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/[hash][ext][query]',
      },
    });

    // Ignore problematic packages
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(@mapbox\/node-pre-gyp|canvas|sharp)$/,
      })
    );

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn-icons-png.flaticon.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '14j7oh8kso.ufs.sh',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'utfs.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    const headers = [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '0'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin'
          },
          {
            key: 'Origin-Agent-Cluster',
            value: '?1'
          }
        ]
      }
    ];

    // Add HSTS header only in production
    if (process.env.NODE_ENV === 'production') {
      headers.push({
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ]
      });
    }

    return headers;
  },
  async rewrites() {
    return [
      {
        source: '/security.txt',
        destination: '/api/security-txt'
      },
      {
        source: '/.well-known/security.txt',
        destination: '/api/security-txt'
      }
    ];
  }
};

export default withNextIntl(nextConfig);
