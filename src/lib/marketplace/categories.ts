export type MarketplaceCategory = 'field_services' | 'health' | 'freelance' | 'other';

export interface MarketplaceCategoryOption {
  value: MarketplaceCategory;
  label: string;
}

export const MARKETPLACE_CATEGORIES: MarketplaceCategoryOption[] = [
  { value: 'field_services', label: 'Artisanat, BTP & Services de terrain' },
  { value: 'health', label: 'Santé & Soins Paramédicaux' },
  { value: 'freelance', label: 'Conseil & Informatique' },
  { value: 'other', label: 'Autre' },
];

/**
 * Normalise toute catégorie marketplace (nouvelle ou legacy) vers la clé canonique.
 * Assure la rétrocompatibilité totale avec les anciens libellés ou slugs (ex: 'artisan', 'IT').
 */
export function normalizeMarketplaceCategory(category: string | null | undefined): MarketplaceCategory {
  if (!category) return 'other';
  const c = category.toLowerCase().trim();
  if (
    c === 'field_services' ||
    c === 'artisan' ||
    c === 'artisanat' ||
    c === 'btp' ||
    c === 'plomberie' ||
    c === 'plumbing' ||
    c === 'electricite' ||
    c === 'electricity' ||
    c === 'construction'
  ) {
    return 'field_services';
  }
  if (
    c === 'health' ||
    c === 'sante' ||
    c === 'santé' ||
    c === 'paramedical' ||
    c === 'medical'
  ) {
    return 'health';
  }
  if (
    c === 'freelance' ||
    c === 'it' ||
    c === 'consulting' ||
    c === 'informatique' ||
    c === 'conseil'
  ) {
    return 'freelance';
  }
  return 'other';
}

export function getMarketplaceCategoryLabel(category: string | null | undefined): string {
  const norm = normalizeMarketplaceCategory(category);
  const found = MARKETPLACE_CATEGORIES.find((opt) => opt.value === norm);
  return found?.label || 'Autre';
}
