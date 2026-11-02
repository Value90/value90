const nextConfig = {
  reactStrictMode: true,
  // Allows isolated production builds without overwriting the developer's active .next cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
