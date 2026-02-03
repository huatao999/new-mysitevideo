// 项目根目录/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 保留你原来的所有配置（比如images、env等），只加下面这行
  transpilePackages: ['next-intl'], // 让Next16兼容next-intl，必加
  reactStrictMode: true, // 可选，加了更规范，不影响功能
};

export default nextConfig;
