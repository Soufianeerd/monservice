import { getRequestConfig } from 'next-intl/server';

export const locales = ['fr'];
export const defaultLocale = 'fr';

export default getRequestConfig(async () => {
  // Une seule langue source, y compris pour les anciens cookies de langue.
  const locale = defaultLocale;

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
