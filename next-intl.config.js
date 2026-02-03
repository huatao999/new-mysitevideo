// 适配Netlify+Next16，保留中英多语言
export default {
  locales: ["zh", "en"], // 保留多语言，中文+英文
  defaultLocale: "zh",   // 默认优先渲染中文/zh
  localePrefix: "as-needed", // 访问/自动跳/zh，不显示多余语言路径
  runtime: "nodejs"      // 适配Netlify的Node构建环境，避免预渲染报错
};
