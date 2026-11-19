// Relances automatiques, avis clients et vitrine : ouverts à tous les
// professionnels, quel que soit le secteur (décision du 19 novembre 2026 ;
// même règle qu'en base : organization_growth_allowed(), migration 0021).
export function isGrowthAvailable(_sector: string | null | undefined): boolean {
  return true;
}
