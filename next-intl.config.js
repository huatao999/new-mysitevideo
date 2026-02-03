// next-intl v3.x + Next16 App Router + ES模块 官方标准配置
export default {
  // 多语言配置（和你原有需求一致）
  locales: ["zh", "en"],
  defaultLocale: "zh",
  // App Router + 预渲染必配：指定运行时，避免Netlify预渲染读取失败
  runtime: "nodejs",
  // 保留next-intl的消息文件解析（若你有messages文件夹，无需额外配置）
  messages: {
    en: () => import("./messages/en.json").then((m) => m.default),
    zh: () => import("./messages/zh.json").then((m) => m.default)
  }
};
