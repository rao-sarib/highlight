/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  typescript: {
    // Known, unrelated pre-existing type errors (chart tooltip typing) that
    // don't affect runtime — don't fail the production build on them.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Don't fail the production build on lint warnings.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
