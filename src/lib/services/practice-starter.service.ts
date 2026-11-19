import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import {
  appointmentTypes,
  organizations,
  practiceLocations,
  practicePractitioners,
  practitionerAvailabilityRules,
  practitionerLocations,
  users,
} from '@/lib/db/schema';
import { getParamedicalProfessionPack } from '@/lib/workspaces/paramedical/profession-packs/registry';
import { isParamedicalProfessionCode } from '@/lib/workspaces/paramedical/professions';

/** Horaires de départ, modifiables ensuite dans « Horaires et absences ». */
const STARTER_HOURS = [
  { startTime: '09:00', endTime: '12:00' },
  { startTime: '14:00', endTime: '18:00' },
] as const;
const WORKDAYS = [1, 2, 3, 4, 5] as const;

/**
 * Agenda prêt dès l'inscription, pour la santé et le bien-être.
 *
 * Un cabinet qui n'a encore ni lieu ni type de séance reçoit une configuration
 * de départ : le professionnel comme praticien, un lieu à l'adresse de
 * l'activité, les séances types de son métier et des horaires du lundi au
 * vendredi (9 h – 12 h, 14 h – 18 h). Tout reste modifiable. Un cabinet déjà
 * configuré, même partiellement, n'est jamais touché.
 *
 * Une seule transaction, verrouillée par organisation : une dizaine de
 * requêtes au lieu d'une centaine, et jamais de configuration en double si
 * deux pages s'ouvrent en même temps.
 */
export async function ensureStarterPractice(organizationId: string, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'starter-practice:' + organizationId}))`);

    const [org] = await tx.select({
      name: organizations.name, sector: organizations.sector, profession: organizations.profession,
      address: organizations.address, city: organizations.city, postalCode: organizations.postalCode, country: organizations.country,
    }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    const pack = getParamedicalProfessionPack(org?.profession);
    if (!org || org.sector !== 'health' || !pack || !isParamedicalProfessionCode(org.profession)) return;

    const [location] = await tx.select({ id: practiceLocations.id }).from(practiceLocations)
      .where(eq(practiceLocations.organizationId, organizationId)).limit(1);
    const [type] = await tx.select({ id: appointmentTypes.id }).from(appointmentTypes)
      .where(eq(appointmentTypes.organizationId, organizationId)).limit(1);
    if (location || type) return;

    // Le professionnel devient le praticien du cabinet s'il n'y en a aucun.
    let [practitioner] = await tx.select({ id: practicePractitioners.id }).from(practicePractitioners)
      .where(and(eq(practicePractitioners.organizationId, organizationId), eq(practicePractitioners.userId, userId), eq(practicePractitioners.isActive, true))).limit(1);
    if (!practitioner) {
      const [anyPractitioner] = await tx.select({ id: practicePractitioners.id }).from(practicePractitioners)
        .where(eq(practicePractitioners.organizationId, organizationId)).limit(1);
      if (anyPractitioner) return;
      const [user] = await tx.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
      [practitioner] = await tx.insert(practicePractitioners).values({
        id: randomUUID(), organizationId, userId,
        displayName: user?.name?.trim() || user?.email || 'Praticien',
        profession: org.profession, email: user?.email ?? null, isActive: true,
      }).returning({ id: practicePractitioners.id });
    }

    const locationId = randomUUID();
    await tx.insert(practiceLocations).values({
      id: locationId, organizationId,
      name: (org.name || 'Lieu principal').slice(0, 100),
      address: org.address || null, city: org.city || null, postalCode: org.postalCode || null, country: org.country || null,
      timezone: 'Europe/Paris', isPrimary: true, isActive: true,
    });
    await tx.insert(practitionerLocations).values({
      id: randomUUID(), organizationId, practitionerId: practitioner.id, locationId, isPrimary: true, isActive: true,
    });
    await tx.insert(appointmentTypes).values(pack.appointmentTypePresets.map((preset) => ({
      id: randomUUID(), organizationId,
      name: preset.name, description: preset.description ?? null,
      durationMinutes: preset.durationMinutes, bufferBeforeMinutes: preset.bufferBeforeMinutes,
      bufferAfterMinutes: preset.bufferAfterMinutes, slotStepMinutes: preset.slotStepMinutes, isActive: true,
    })));
    const validFrom = new Date().toISOString().slice(0, 10);
    await tx.insert(practitionerAvailabilityRules).values(WORKDAYS.flatMap((weekday) => STARTER_HOURS.map((hours) => ({
      id: randomUUID(), organizationId, practitionerId: practitioner.id, locationId, weekday, ...hours, validFrom, validUntil: null, isActive: true,
    }))));
  });
}

/**
 * Version tolérante pour les pages : un échec ou une lenteur ne bloque jamais
 * l'affichage (au-delà de 8 s, la page s'affiche et la configuration se
 * termine en arrière-plan).
 */
export async function prepareStarterPractice(organizationId: string, userId: string): Promise<void> {
  const setup = ensureStarterPractice(organizationId, userId).catch((error) => {
    console.error('Configuration de départ du cabinet impossible', error);
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([setup, new Promise<void>((resolve) => { timer = setTimeout(resolve, 8_000); })]);
  if (timer) clearTimeout(timer);
}
