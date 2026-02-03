/** @type {import('next').NextConfig} */
const nextConfig = {
  // 仅保留Netlify Next.js运行时必需配置，无任何无效项
  output: "standalone",
  reactStrictMode: true
};
export default nextConfig;
