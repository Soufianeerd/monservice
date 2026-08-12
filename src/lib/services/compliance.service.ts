import { db } from '../db/server';
import { countryComplianceProfiles } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { CountryComplianceProfile } from '../data/interfaces';

export const complianceService = {
  async getComplianceProfile(country: string): Promise<CountryComplianceProfile> {
    const result = await db.select()
      .from(countryComplianceProfiles)
      .where(eq(countryComplianceProfiles.country, country.toUpperCase()))
      .orderBy(desc(countryComplianceProfiles.effectiveFrom))
      .limit(1);

    if (result.length === 0) {
      throw new Error(`No compliance profile found for country: ${country}`);
    }

    return result[0] as unknown as CountryComplianceProfile;
  }
};

export const getComplianceProfile = complianceService.getComplianceProfile;
