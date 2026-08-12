import { VatValidationResult } from '../services/tax.types';

interface CacheEntry {
  result: VatValidationResult;
  timestamp: number;
}

const TTL = 24 * 60 * 60 * 1000; // 24h

export class ViesCache {
  private cache: Map<string, CacheEntry> = new Map();

  get(key: string): VatValidationResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > TTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.result;
  }

  set(key: string, result: VatValidationResult): void {
    this.cache.set(key, { result, timestamp: Date.now() });
  }
}

export const viesCache = new ViesCache();
