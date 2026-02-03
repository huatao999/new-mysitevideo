// next-intl v3.x + Next16 App Router 官方标准middleware
import createMiddleware from 'next-intl/middleware';
import config from './next-intl.config.js'; // ES模块必须带.js后缀！

// 创建本地化中间件，关联核心配置
export default createMiddleware(config);

// 配置中间件生效范围：所有根路径+子路径，排除静态资源
export const config = {
  matcher: [
    '/',
    '/(zh|en)/:path*',
    '/_next/:path*',
    '/api/:path*'
  ]
};
