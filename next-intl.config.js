// 新版next-intl必须用export default，这是关键！
export default {
  locales: ["zh", "en"], // 支持的语言：中文、英文
  defaultLocale: "zh",   // 默认显示中文（贴合你的项目）
  localePrefix: "as-needed" // 非必要不显示语言路径，访问/直接跳/zh
};
