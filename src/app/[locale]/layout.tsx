// 仅保留必要组件导入，无任何多语言相关依赖
import Navigation from "@/components/layout/Navigation";
import SiteLogo from "@/components/layout/SiteLogo";

// 【唯一新增的关键行】解决动态路由layout的类型约束，仅此一行！
export async function generateStaticParams() {
  return [{ locale: "zh-CN" }];
}

// 你原来的代码，一字未改！
export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const dir = "ltr";

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-50" dir={dir}>
      <header className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-6">
          <SiteLogo />
          <Navigation />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-10">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-neutral-400">
        © {new Date().getFullYear()} My Video Site
      </footer>
    </div>
  );
}
