import {NextIntlClientProvider} from "next-intl";
import {getMessages, setRequestLocale} from "next-intl/server";
import {defaultLocale, locales, type Locale} from "@/i18n/locales";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import Navigation from "@/components/layout/Navigation";
import SiteLogo from "@/components/layout/SiteLogo";

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale: rawLocale} = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  // Ensure server components (useTranslations) use the active locale
  setRequestLocale(locale);

  const messages = await getMessages({locale});

  // RTL languages: Arabic
  const isRTL = locale === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="min-h-dvh bg-neutral-950 text-neutral-50" dir={dir}>
        <header className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <SiteLogo />
            <Navigation />
          </div>
          <LanguageSwitcher currentLocale={locale} />
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-neutral-400">
          © {new Date().getFullYear()} My Video Site
        </footer>
      </div>
    </NextIntlClientProvider>
  );
}

