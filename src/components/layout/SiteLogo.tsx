"use client";

import Link from "next/link";
import {useLocale} from "next-intl";

export default function SiteLogo() {
  const locale = useLocale()?.toLowerCase() || "en";

  return (
    <Link 
      href={`/${locale}`} 
      className="text-sm font-semibold tracking-wide text-neutral-50 hover:text-white transition-colors duration-200 underline-offset-4 hover:underline touch-manipulation min-h-[44px] flex items-center"
      prefetch={true}
    >
      My Video Site
    </Link>
  );
}
