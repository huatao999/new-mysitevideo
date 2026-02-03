// 新版Next16 + next-intl 强制要求：显式导入+注册配置
import createNextIntlConfig from 'next-intl/config';
// 手动导入根目录的next-intl配置文件（关键！让Next.js能找到）
import intlConfig from './next-intl.config.js';

// 用next-intl的方法创建配置
const withNextIntl = createNextIntlConfig(intlConfig);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["next-intl"], // 编译next-intl
  reactStrictMode: true,
  output: "standalone" // 适配Netlify运行时
};

// 显式导出：将next-intl配置和Next.js配置合并（核心！）
export default withNextIntl(nextConfig);
