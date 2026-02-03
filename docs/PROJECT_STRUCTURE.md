# 项目文件结构（规划稿）

> 目标：Next.js 前端（H5 适配）+ 后端 API（管理/签名）+ Cloudflare R2 存储 + Cloudflare CDN 全球分发 + 预留 VAST 广告接口。

## 目录总览

- `src/app/`
  - `api/`：后端 API（Next.js Route Handlers）
    - `health/route.ts`：健康检查
    - `videos/`：视频元数据/播放 URL（后续添加）
    - `admin/`：后台管理接口（后续添加：鉴权、上传签名、下架等）
  - `[locale]/`：多语言页面入口（zh/en/es）
    - `layout.tsx`：多语言 Provider + 顶部导航 + Footer
    - `page.tsx`：首页（播放器 Demo）
- `src/components/`
  - `i18n/LanguageSwitcher.tsx`：语言切换
  - `video/VideoPlayer.tsx`：Video.js 播放器（预留 VAST）
- `src/i18n/`
  - `locales.ts`：语言列表与默认语言
  - `request.ts`：next-intl 的消息加载配置
- `src/lib/`
  - `env.ts`：环境变量校验（zod）
  - `r2/client.ts`：Cloudflare R2（S3 兼容）客户端
- `messages/`
  - `zh.json` / `en.json` / `es.json`：多语言文案
- `next.config.ts`：Next.js 配置（后续加缓存/安全头/图片域名等）

## 后续会新增（已预留设计位）

- `src/lib/ads/`：广告层封装（ExoClick/Adsterra 的 VAST Tag、开关、频控）
- `src/lib/videos/`：视频元数据、播放列表、标签、SEO
- `src/app/(admin)/`：后台管理界面（可选：独立路由组）
- 数据库（可选）：如果需要全站检索/分类/推荐，可接入 Postgres + Prisma

