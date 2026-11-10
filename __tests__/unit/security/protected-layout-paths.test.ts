import { describe, expect, it } from 'vitest';
import { isClientAreaPath } from '@/components/auth/ProtectedLayout';

describe('ProtectedLayout — espace client vs CRM', () => {
  it.each(['/client', '/client/dashboard', '/client/interventions/42'])('%s est l’espace client', (path) => {
    expect(isClientAreaPath(path)).toBe(true);
  });
  it.each(['/clients', '/clients/abc-123', '/clients/new', '/clientele', '/dashboard'])('%s n’est pas l’espace client', (path) => {
    expect(isClientAreaPath(path)).toBe(false);
  });
});
