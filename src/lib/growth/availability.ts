// Relances automatiques, avis clients et vitrine : hors secteur santé tant que
// les règles déontologiques et l'hébergement HDS ne sont pas tranchés (même
// règle qu'en base : organization_growth_allowed()).
export function isGrowthAvailable(sector: string | null | undefined): boolean {
  return sector !== 'health';
}
