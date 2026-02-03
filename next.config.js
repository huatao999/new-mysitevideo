/** @type {import('next').NextConfig} */
const nextConfig = {
  // 仅保留Netlify Next.js运行时适配，无任何第三方配置
  output: "standalone",
  reactStrictMode: true,
  // 禁用Turbopack的严格校验，避免预渲染异常
  experimental: {
    turbopack: {
      disableStrictDependencyChecks: true
    }
  }
};
export default nextConfig;
