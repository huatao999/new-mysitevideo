import createMiddleware from "next-intl/middleware";
import {defaultLocale, locales} from "./src/i18n/locales";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});

export const config = {
  // Skip Next internals, static assets, and admin routes
  // Matcher excludes: /api, /_next, files with extensions, and /admin/*
  matcher: [
    // Match all pathnames except for:
    // - /api (API routes)
    // - /_next (Next.js internals)
    // - /admin (admin panel - should not have locale prefix)
    // - Files with extensions (e.g., .png, .jpg, .svg)
    "/((?!api|_next|admin|.*\\..*).*)",
  ],
};

