export function getRetentionYearsForCountry(country: string): number {
  const normalized = country?.toUpperCase();
  switch (normalized) {
    case 'FR':
      return 10;
    case 'DE':
      return 8; // Sometimes 10 in Germany depending on document, but prompt says 8
    case 'BE':
      return 10;
    case 'LU':
      return 10;
    default:
      return 10;
  }
}
