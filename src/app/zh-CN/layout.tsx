// 仅保留必要组件导入，无任何多语言相关依赖（原代码未动）
import Navigation from "@/components/layout/Navigation";
import SiteLogo from "@/components/layout/SiteLogo";

// 解决动态路由类型约束的核心：声明generateStaticParams（原代码已加，保留）
export async function generateStaticParams() {
  return [{ locale: "zh-CN" }];
}

// 关键修复：给React.ReactNode加显式类型声明，消除Next.js严格类型校验的隐性报错
export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const dir = "ltr"; // 中文固定方向（原代码未动）

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-50" dir={dir}>
      {/* 头部：Logo+导航，原有版面/组件全保留，无任何修改 */}
      <header className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-6">
          <SiteLogo />
          <Navigation />
        </div>
      </header>
      {/* 主内容区：承载你的视频列表/播放/广告，原有逻辑全保留 */}
      <main className="mx-auto max-w-5xl px-4 pb-10">{children}</main>
      {/* 页脚：原有版权样式全保留 */}
      <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-neutral-400">
        © {new Date().getFullYear()} My Video Site
      </footer>
    </div>
  );
}
