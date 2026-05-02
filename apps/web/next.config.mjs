import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(dirname(appRoot));

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aoe4/analyzer-core'],
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
