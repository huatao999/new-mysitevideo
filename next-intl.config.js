// next-intl v3.x + Next16 + Turbopack 合规配置（ES模块默认导出）
export default {
  // 核心必填项：仅保留next-intl运行时必需的配置，移除冗余的messages动态导入
  locales: ["zh", "en"],
  defaultLocale: "zh",
  // 关键：添加localeDetection（Next16强制要求），避免预渲染时检测逻辑报错
  localeDetection: false,
  // 适配Turbopack运行时：禁用动态导入优化
  experimental: {
    disableDynamicLocaleResolution: true
  }
};
