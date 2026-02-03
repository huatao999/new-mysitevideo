// Next16 + next-intl 官方极简写法：无外部导入，彻底规避解析冲突
import createNextIntlConfig from 'next-intl/config';

// 直接在这里写国际化配置（和之前的next-intl.config.js内容完全一致，保留多语言）
const withNextIntl = createNextIntlConfig({
  locales: ["zh", "en"], // 保留中英多语言
  defaultLocale: "zh",   // 默认中文/zh
  localePrefix: "as-needed",
  runtime: "nodejs"      // 适配Netlify构建环境
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["next-intl"],
  reactStrictMode: true,
  output: "standalone" // 适配Netlify Next.js运行时
};

// 合并配置导出（核心逻辑不变）
export default withNextIntl(nextConfig);
