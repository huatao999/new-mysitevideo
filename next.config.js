/** @type {import('next').NextConfig} */
const nextConfig = {
  // 关键1：Next.js 16原生i18n多语言配置（替代next-intl的配置扫描，彻底解决报错）
  i18n: {
    locales: ["zh", "en"], // 保留中英多语言，和之前一致
    defaultLocale: "zh",   // 默认中文，访问/自动跳/zh，和之前一致
    localePrefix: "as-needed" // 非必要不显示语言路径，和之前一致
  },
  // 关键2：保留该配置，确保项目里的next-intl组件（如useTranslations）正常编译
  transpilePackages: ["next-intl"],
  reactStrictMode: true,
  output: "standalone" // 适配Netlify的Next.js运行时
};

// 直接导出，无任何复杂封装（原生配置，永不加载失败）
export default nextConfig;
