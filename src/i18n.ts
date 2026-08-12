import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['fr', 'de', 'nl', 'en'];
export const defaultLocale = 'fr';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || defaultLocale;

  return {
    locale,
    messages: {
      common: (await import(`../public/locales/${locale}/common.json`)).default,
      dashboard: (await import(`../public/locales/${locale}/dashboard.json`)).default,
      client: (await import(`../public/locales/${locale}/client.json`)).default,
      invoice: (await import(`../public/locales/${locale}/invoice.json`)).default,
      email: (await import(`../public/locales/${locale}/email.json`)).default,
      legal: (await import(`../public/locales/${locale}/legal.json`)).default,
      landing: (await import(`../public/locales/${locale}/landing.json`)).default,
    }
  };
});
