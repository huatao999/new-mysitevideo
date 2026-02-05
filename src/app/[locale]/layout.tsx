// 删掉所有next-intl、i18n相关导入，只保留必要的布局组件
import Navigation from "@/components/layout/Navigation";
import SiteLogo from "@/components/layout/SiteLogo";

// 直接删掉多语言的校验函数、generateStaticParams（没用了）

// 简化组件参数，删掉多语言相关的Promise<{locale: string}>，直接传普通params
export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
  params?: { locale?: string }; // 留个可选参数，避免组件传参报错
}) {
  // 删掉所有多语言locale判断、setRequestLocale、getMessages、RTL这些逻辑
  // 直接固定文字方向ltr（中文默认），不用再判断locale
  const dir = "ltr";

  return (
    // 删掉NextIntlClientProvider包裹（多语言核心容器，现在没用了）
    <div className="min-h-dvh bg-neutral-950 text-neutral-50" dir={dir}>
      <header className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-6">
          <SiteLogo />
          <Navigation />
        </div>
        {/* 删掉LanguageSwitcher（多语言切换组件，依赖i18n，留着会报错） */}
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-10">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-neutral-400">
        © {new Date().getFullYear()} My Video Site
      </footer>
    </div>
  );
}
