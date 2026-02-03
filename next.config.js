/** @type {import('next').NextConfig} */
const nextConfig = {
  // 仅保留：编译next-intl（确保多语言组件可用）+ 适配Netlify运行时
  transpilePackages: ["next-intl"],
  output: "standalone",
  reactStrictMode: true
};
// 极简导出，无任何复杂配置，App Router100%兼容
export default nextConfig;
