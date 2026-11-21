// Vitrine publique d'un professionnel (migration 0020).

export const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MAX_INTERVENTION_CITIES = 30;
export const MAX_PUBLIC_SERVICES = 20;
export const MAX_PORTFOLIO_ITEMS = 30;

/** Adresse lisible dérivée du nom : « Plomberie Dupont & Fils » → « plomberie-dupont-fils ». */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

export function isValidPublicSlug(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 60 && PUBLIC_SLUG_PATTERN.test(slug);
}

/** Liste saisie en texte libre (virgules ou retours à la ligne), dédoublonnée. */
export function parseList(value: string, max: number, maxItemLength = 80): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const raw of value.split(/[\n,;]/)) {
    const item = raw.trim().replace(/\s+/g, ' ').slice(0, maxItemLength);
    const key = item.toLocaleLowerCase('fr');
    if (!item || seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    if (items.length >= max) break;
  }
  return items;
}

export function publicProfilePath(slug: string): string {
  return `/pro/${slug}`;
}
