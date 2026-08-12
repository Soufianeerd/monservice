import { VatValidationResult } from '../services/tax.types';
import { viesCache } from '../cache/vies-cache';

// Basic regex for EU VAT numbers
const vatRegex: Record<string, RegExp> = {
  AT: /^ATU[0-9]{8}$/,
  BE: /^BE[0-1][0-9]{9}$/,
  BG: /^BG[0-9]{9,10}$/,
  CY: /^CY[0-9]{8}[A-Z]$/,
  CZ: /^CZ[0-9]{8,10}$/,
  DE: /^DE[0-9]{9}$/,
  DK: /^DK[0-9]{8}$/,
  EE: /^EE[0-9]{9}$/,
  EL: /^EL[0-9]{9}$/,
  ES: /^ES[A-Z0-9][0-9]{7}[A-Z0-9]$/,
  FI: /^FI[0-9]{8}$/,
  FR: /^FR[A-Z0-9]{2}[0-9]{9}$/,
  HR: /^HR[0-9]{11}$/,
  HU: /^HU[0-9]{8}$/,
  IE: /^IE[0-9][A-Z0-9+*][0-9]{5}[A-Z]$/,
  IT: /^IT[0-9]{11}$/,
  LT: /^LT([0-9]{9}|[0-9]{12})$/,
  LU: /^LU[0-9]{8}$/,
  LV: /^LV[0-9]{11}$/,
  MT: /^MT[0-9]{8}$/,
  NL: /^NL[0-9]{9}B[0-9]{2}$/,
  PL: /^PL[0-9]{10}$/,
  PT: /^PT[0-9]{9}$/,
  RO: /^RO[0-9]{2,10}$/,
  SE: /^SE[0-9]{12}$/,
  SI: /^SI[0-9]{8}$/,
  SK: /^SK[0-9]{10}$/,
};

export function checkVatFormat(vatNumber: string, countryCode: string): boolean {
  // Clean up VAT number (remove spaces, dashes)
  const cleanVat = vatNumber.replace(/[\s-]/g, '').toUpperCase();
  
  // If the VAT number doesn't start with the country code, prefix it for checking
  const fullVat = cleanVat.startsWith(countryCode.toUpperCase()) 
    ? cleanVat 
    : `${countryCode.toUpperCase()}${cleanVat}`;

  const regex = vatRegex[countryCode.toUpperCase()];
  if (!regex) return false; // Country not supported by EU VIES

  return regex.test(fullVat);
}

export async function validateVatNumber(vatNumber: string, countryCode: string): Promise<VatValidationResult> {
  const isValidFormat = checkVatFormat(vatNumber, countryCode);
  if (!isValidFormat) {
    return { valid: false, validationDate: new Date() };
  }

  const cleanVat = vatNumber.replace(/[\s-]/g, '').toUpperCase();
  // VIES expects the number without the country prefix in the 'vatNumber' field if 'countryCode' is provided separately
  const numberWithoutPrefix = cleanVat.startsWith(countryCode.toUpperCase()) 
    ? cleanVat.substring(2) 
    : cleanVat;

  const cacheKey = `${countryCode}_${numberWithoutPrefix}`;
  const cached = viesCache.get(cacheKey);
  if (cached) return cached;

  // In development, mock the VIES API to avoid rate limits
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    const mockResult = {
      valid: true, // We assume valid for format-valid numbers in dev
      name: 'MOCK COMPANY INC',
      address: '123 Mock Street',
      validationDate: new Date(),
      requestId: `mock-${Date.now()}`
    };
    viesCache.set(cacheKey, mockResult);
    return mockResult;
  }

  try {
    const response = await fetch(`https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        countryCode: countryCode.toUpperCase(),
        vatNumber: numberWithoutPrefix
      }),
    });
    
    if (!response.ok) {
        throw new Error('VIES API Error');
    }
    
    const data = await response.json();
    const result: VatValidationResult = {
      valid: data.valid,
      name: data.name,
      address: data.address,
      validationDate: new Date(),
      requestId: data.requestIdentifier,
    };
    
    if (result.valid) {
      viesCache.set(cacheKey, result);
    }
    return result;
  } catch (error) {
    console.error('VIES API validation failed:', error);
    // Fallback: consider invalid or unavailable. For strict compliance, we return invalid.
    return { valid: false, validationDate: new Date() };
  }
}
