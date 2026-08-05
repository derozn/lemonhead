import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@lemonhead/schemas', '@lemonhead/entitlements'],
};

export default nextConfig;
