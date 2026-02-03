// Next16 App Router + next-intl 官方极简集成（无任何冲突）
import withNextIntl from 'next-intl/plugin';

// 仅关联next-intl配置文件，无其他封装（ES模块适配）
export default withNextIntl('./next-intl.config.js')({
  // 保留Netlify适配+next-intl编译，无其他无效配置
  transpilePackages: ['next-intl'],
  output: 'standalone',
  reactStrictMode: true
});
