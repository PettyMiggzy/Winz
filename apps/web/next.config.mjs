/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Front end ships ahead of lint/type wiring; don't block deploys on them.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
