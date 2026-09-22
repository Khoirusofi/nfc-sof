/** @type {import('next').NextConfig} */
const nextConfig = {
  // Intentionally NOT ignoring TS/ESLint errors during build.
  // If Vercel build fails on type/lint errors, fix them — don't silence them
  // with `typescript.ignoreBuildErrors` / `eslint.ignoreDuringBuilds`.
  reactStrictMode: true,
};

export default nextConfig;
