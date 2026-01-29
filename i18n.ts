import {getRequestConfig} from "next-intl/server";
import {defaultLocale, locales, type Locale} from "./src/i18n/locales";

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale;
  const locale: Locale = requested && isLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
