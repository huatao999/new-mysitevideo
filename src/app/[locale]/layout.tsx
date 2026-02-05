// 仅保留必要组件导入，无任何多语言相关依赖
import Navigation from "@/components/layout/Navigation";
import SiteLogo from "@/components/layout/SiteLogo";

// Next.js 14+ 路由组layout标准写法，仅接收children和params，无多余类型
export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // 中文固定文字方向，无需判断，直接写死ltr
  const dir = "ltr";

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-50" dir={dir}>
      {/* 头部：Logo + 导航，已删掉多语言切换组件（避免报错） */}
      <header className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-6">
          <SiteLogo />
          <Navigation />
        </div>
      </header>
      {/* 主内容区：承载所有页面（首页、视频列表、视频详情） */}
      <main className="mx-auto max-w-5xl px-4 pb-10">{children}</main>
      {/* 页脚：固定版权信息 */}
      <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-neutral-400">
        © {new Date().getFullYear()} My Video Site
      </footer>
    </div>
  );
}
