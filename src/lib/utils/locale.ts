/**
 * Get current locale
 * In browser: reads from <html lang="..">
 * In server: defaults to 'fr' unless explicitly passed
 */
export function getLocale(): string {
  if (typeof window !== 'undefined') {
    return document.documentElement.lang || 'fr';
  }
  return 'fr';
}

export function formatDate(date: Date | string, locale?: string): string {
  const loc = locale || getLocale();
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  return new Intl.DateTimeFormat(loc, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function formatCurrency(amount: number, currency: string = 'EUR', locale?: string): string {
  const loc = locale || getLocale();
  
  if (isNaN(amount)) return '';
  
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(number: number, locale?: string): string {
  const loc = locale || getLocale();
  
  if (isNaN(number)) return '';
  
  return new Intl.NumberFormat(loc).format(number);
}
