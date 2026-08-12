import { describe, it, expect, vi } from 'vitest';
import { DeliveryService } from '@/lib/services/delivery.service';

describe('Delivery – Compliance Tests', () => {
  const deliveryService = new DeliveryService();

  it('should map BE B2B customers to Peppol', async () => {
    const result = (deliveryService as any).determineChannel({ customerCountry: 'BE', customerType: 'B2B' });
    expect(result).toBe('peppol');
  });

  it('should map FR B2B customers to PDP', async () => {
    const result = (deliveryService as any).determineChannel({ customerCountry: 'FR', customerType: 'B2B' });
    expect(result).toBe('pdp');
  });

  it('should map DE B2B customers to Email by default', async () => {
    const result = (deliveryService as any).determineChannel({ customerCountry: 'DE', customerType: 'B2B' });
    expect(result).toBe('email');
  });

  it('should map B2C customers to Email regardless of country', async () => {
    const resultFr = (deliveryService as any).determineChannel({ customerCountry: 'FR', customerType: 'B2C' });
    const resultBe = (deliveryService as any).determineChannel({ customerCountry: 'BE', customerType: 'B2C' });
    expect(resultFr).toBe('pdp');
    expect(resultBe).toBe('email');
  });
});
