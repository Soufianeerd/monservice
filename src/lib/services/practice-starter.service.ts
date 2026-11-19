import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { appointmentTypes, organizations, practiceLocations, practicePractitioners } from '@/lib/db/schema';
import { getParamedicalProfessionPack } from '@/lib/workspaces/paramedical/profession-packs/registry';
import { practiceLocationCreateSchema } from '@/lib/practice-structure/validation';
import { practiceStructureService } from './practice-structure.service';
import { schedulingService } from './scheduling.service';
import { provisionFirstPractitioner } from '@/lib/clinical/auth';

/** Horaires de départ, modifiables ensuite dans « Horaires et absences ». */
const STARTER_HOURS = [
  { startTime: '09:00', endTime: '12:00' },
  { startTime: '14:00', endTime: '18:00' },
] as const;
const WORKDAYS = [1, 2, 3, 4, 5] as const;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Agenda prêt dès l'inscription, pour la santé et le bien-être.
 *
 * Un cabinet qui n'a encore ni lieu ni type de séance reçoit une configuration
 * de départ : le professionnel comme praticien, un lieu à l'adresse de
 * l'activité, les séances types de son métier et des horaires du lundi au
 * vendredi (9 h – 12 h, 14 h – 18 h). Tout reste modifiable. Un cabinet déjà
 * configuré, même partiellement, n'est jamais touché.
 */
export async function ensureStarterPractice(organizationId: string, userId: string): Promise<void> {
  const [org] = await db.select({
    name: organizations.name, sector: organizations.sector, profession: organizations.profession,
    address: organizations.address, city: organizations.city, postalCode: organizations.postalCode, country: organizations.country,
  }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  const pack = getParamedicalProfessionPack(org?.profession);
  if (!org || org.sector !== 'health' || !pack) return;

  const [location] = await db.select({ id: practiceLocations.id }).from(practiceLocations)
    .where(eq(practiceLocations.organizationId, organizationId)).limit(1);
  const [type] = await db.select({ id: appointmentTypes.id }).from(appointmentTypes)
    .where(eq(appointmentTypes.organizationId, organizationId)).limit(1);
  if (location || type) return;

  const practitionerId = await provisionFirstPractitioner(organizationId, userId, org.profession);
  if (!practitionerId) return;
  const [ownPractitioner] = await db.select({ id: practicePractitioners.id }).from(practicePractitioners)
    .where(and(eq(practicePractitioners.organizationId, organizationId), eq(practicePractitioners.id, practitionerId))).limit(1);
  if (!ownPractitioner) return;

  const created = await practiceStructureService.createLocation(organizationId, practiceLocationCreateSchema.parse({
    name: (org.name || 'Lieu principal').slice(0, 100),
    address: org.address || undefined,
    city: org.city || undefined,
    postalCode: org.postalCode || undefined,
    country: org.country || undefined,
  }));
  await practiceStructureService.setPractitionerLocations(organizationId, practitionerId, [{ locationId: created.id, isPrimary: true }]);

  for (const preset of pack.appointmentTypePresets) {
    await schedulingService.createAppointmentType(organizationId, {
      name: preset.name,
      description: preset.description,
      durationMinutes: preset.durationMinutes,
      bufferBeforeMinutes: preset.bufferBeforeMinutes,
      bufferAfterMinutes: preset.bufferAfterMinutes,
      slotStepMinutes: preset.slotStepMinutes,
    });
  }

  for (const weekday of WORKDAYS) {
    for (const hours of STARTER_HOURS) {
      await schedulingService.createAvailabilityRule(organizationId, {
        practitionerId, locationId: created.id, weekday, ...hours, validFrom: today(), validUntil: null,
      });
    }
  }
}

/** Version tolérante pour les pages : un échec ne bloque jamais l'agenda. */
export async function prepareStarterPractice(organizationId: string, userId: string): Promise<void> {
  try {
    await ensureStarterPractice(organizationId, userId);
  } catch (error) {
    console.error('Configuration de départ du cabinet impossible', error);
  }
}
