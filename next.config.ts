
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            async_hooks: false,
        };
    }
    //
    // It is not possible to use `dot-prompt` with webpack.
    //
    config.externals.push({'dot-prompt': 'commonjs dot-prompt'});
    config.externals.push({'@opentelemetry/exporter-jaeger': 'commonjs @opentelemetry/exporter-jaeger'});
    return config;
  },
};

export default nextConfig;
