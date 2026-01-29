"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useTranslations, useLocale} from "next-intl";

export default function Navigation() {
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const locale = useLocale()?.toLowerCase() || "en";

  // Build locale-prefixed URLs (ensure lowercase)
  const navItems = [
    {href: `/${locale}`, label: t("home")},
    {href: `/${locale}/videos`, label: t("videos")},
  ];

  return (
    <nav className="flex gap-4 sm:gap-6">
      {navItems.map((item) => {
        // Check if current pathname matches the locale-prefixed href
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium transition-all duration-200 underline-offset-4 hover:underline touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center ${
              isActive 
                ? "text-neutral-50 hover:text-white" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
