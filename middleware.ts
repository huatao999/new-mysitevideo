// next-intl v3.x + Next16 App Router 官方标准 middleware（无变量重名）
import createMiddleware from 'next-intl/middleware';
// 导入 next-intl 核心配置（变量名 config 保留）
import config from './next-intl.config.js'; // ES模块必须带.js后缀！

// 创建本地化中间件，关联配置
export default createMiddleware(config);

// 关键：修改变量名为 middlewareConfig，避免重复定义
export const middlewareConfig = {
  matcher: [
    '/',
    '/(zh|en)/:path*',
    '/_next/:path*',
    '/api/:path*'
  ]
};
