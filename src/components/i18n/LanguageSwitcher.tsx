"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {locales, type Locale} from "@/i18n/locales";

function replaceLocaleInPath(pathname: string, nextLocale: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return `/${nextLocale}`;

  // If current path starts with a locale, replace it; otherwise prefix it.
  if ((locales as readonly string[]).includes(segments[0])) {
    segments[0] = nextLocale;
    return `/${segments.join("/")}`;
  }
  return `/${nextLocale}/${segments.join("/")}`;
}

export default function LanguageSwitcher({currentLocale}: {currentLocale: Locale}) {
  const pathname = usePathname() || "/";

  return (
    <nav className="flex items-center gap-1.5 sm:gap-2 text-xs">
      {(locales as readonly Locale[]).map((loc) => {
        const href = replaceLocaleInPath(pathname, loc);
        const active = loc === currentLocale;
        return (
          <Link
            key={loc}
            href={href}
            className={[
              "rounded-md px-2.5 py-2 transition touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center",
              active ? "bg-white text-black" : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:bg-neutral-600",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            {loc.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}

