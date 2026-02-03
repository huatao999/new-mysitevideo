/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["next-intl"], // 让Next16正确编译next-intl
  reactStrictMode: true, // 规范配置，不影响功能
  output: "standalone"   // 适配Netlify的Next.js运行时，避免部署兼容问题
};
export default nextConfig;
