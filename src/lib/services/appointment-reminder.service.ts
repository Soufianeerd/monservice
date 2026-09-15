import { db } from '@/lib/db/server';
import {
  appointments,
  appointmentTypes,
  practiceLocations,
  practiceRooms,
  practicePractitioners,
  patientProfiles,
  patientRepresentatives,
  patientRepresentativeLinks,
  organizations,
  appointmentReminderDeliveries,
} from '@/lib/db/schema';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { createHash, randomUUID } from 'crypto';
import { sendEmail, isEmailConfigured } from '@/lib/email';
import { REMINDER_OFFSETS_MINUTES } from '@/lib/reminders/types';

export interface ProcessRemindersResult {
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
}

export class AppointmentReminderService {
  /**
   * Scanne et envoie les rappels par email pour les rendez-vous à venir (24h et 2h).
   * Protégé contre les doublons via la contrainte unique sur appointmentReminderDeliveries.
   */
  async processAppointmentReminders(options?: {
    organizationId?: string;
    now?: Date;
  }): Promise<ProcessRemindersResult> {
    const now = options?.now || new Date();
    const result: ProcessRemindersResult = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
    };

    for (const offsetMinutes of REMINDER_OFFSETS_MINUTES) {
      // Calcul de la fenêtre temporelle autour de l'offset (ex: 24h +/- 30min, 2h +/- 15min)
      const windowMarginMinutes = offsetMinutes >= 1440 ? 45 : 20;
      const windowStart = new Date(now.getTime() + (offsetMinutes - windowMarginMinutes) * 60 * 1000);
      const windowEnd = new Date(now.getTime() + (offsetMinutes + windowMarginMinutes) * 60 * 1000);

      const conditions = [
        eq(appointments.status, 'scheduled'),
        gte(appointments.startsAt, windowStart),
        lte(appointments.startsAt, windowEnd),
      ];

      if (options?.organizationId) {
        conditions.push(eq(appointments.organizationId, options.organizationId));
      }

      const matchingAppointments = await db
        .select({
          appointment: appointments,
          patient: patientProfiles,
          type: appointmentTypes,
          location: practiceLocations,
          room: practiceRooms,
          practitioner: practicePractitioners,
          org: organizations,
        })
        .from(appointments)
        .innerJoin(
          patientProfiles,
          and(
            eq(patientProfiles.id, appointments.patientId),
            eq(patientProfiles.organizationId, appointments.organizationId),
          ),
        )
        .innerJoin(
          appointmentTypes,
          and(
            eq(appointmentTypes.id, appointments.appointmentTypeId),
            eq(appointmentTypes.organizationId, appointments.organizationId),
          ),
        )
        .innerJoin(
          practiceLocations,
          and(
            eq(practiceLocations.id, appointments.locationId),
            eq(practiceLocations.organizationId, appointments.organizationId),
          ),
        )
        .leftJoin(
          practiceRooms,
          and(
            eq(practiceRooms.id, appointments.roomId),
            eq(practiceRooms.organizationId, appointments.organizationId),
          ),
        )
        .innerJoin(
          practicePractitioners,
          and(
            eq(practicePractitioners.id, appointments.practitionerId),
            eq(practicePractitioners.organizationId, appointments.organizationId),
          ),
        )
        .innerJoin(organizations, eq(organizations.id, appointments.organizationId))
        .where(and(...conditions));

      for (const row of matchingAppointments) {
        result.processed++;

        // 1. Determine recipient email (patient or representative)
        let recipientEmail = row.patient.email;
        let recipientName = `${row.patient.usedFirstName || row.patient.firstBirthName} ${row.patient.usedName || row.patient.birthName}`.trim();

        if (!recipientEmail) {
          // Check for active representative with billing or legal contact
          const repLinks = await db
            .select({
              rep: patientRepresentatives,
            })
            .from(patientRepresentativeLinks)
            .innerJoin(
              patientRepresentatives,
              and(
                eq(patientRepresentatives.id, patientRepresentativeLinks.representativeId),
                eq(patientRepresentatives.organizationId, row.appointment.organizationId),
              ),
            )
            .where(
              and(
                eq(patientRepresentativeLinks.patientId, row.patient.id),
                eq(patientRepresentativeLinks.organizationId, row.appointment.organizationId),
                eq(patientRepresentativeLinks.isActive, true),
                eq(patientRepresentatives.isActive, true),
              ),
            );

          const validRep = repLinks.find((r) => r.rep.email);
          if (validRep) {
            recipientEmail = validRep.rep.email;
            recipientName = `${validRep.rep.firstName} ${validRep.rep.lastName}`.trim();
          }
        }

        if (!recipientEmail) {
          result.skipped++;
          continue;
        }

        // 2. Compute pseudonymized email hash
        const emailHash = createHash('sha256').update(recipientEmail.trim().toLowerCase()).digest('hex');

        // 3. Atomic claim-before-send: reserve delivery slot as 'pending'
        const deliveryId = randomUUID();
        const [claimed] = await db
          .insert(appointmentReminderDeliveries)
          .values({
            id: deliveryId,
            organizationId: row.appointment.organizationId,
            appointmentId: row.appointment.id,
            channel: 'email',
            offsetMinutes,
            recipientEmailHash: emailHash,
            sentAt: null,
            status: 'pending',
            providerMessageId: null,
          })
          .onConflictDoNothing({
            target: [
              appointmentReminderDeliveries.appointmentId,
              appointmentReminderDeliveries.channel,
              appointmentReminderDeliveries.offsetMinutes,
            ],
          })
          .returning({ id: appointmentReminderDeliveries.id });

        if (!claimed) {
          result.skipped++;
          continue;
        }

        if (!isEmailConfigured()) {
          await db
            .update(appointmentReminderDeliveries)
            .set({
              status: 'failed',
              sentAt: null,
              providerMessageId: 'email-not-configured',
            })
            .where(eq(appointmentReminderDeliveries.id, deliveryId));
          result.skipped++;
          continue;
        }

        // 4. Format appointment info
        const dateStr = new Intl.DateTimeFormat('fr-FR', {
          dateStyle: 'full',
          timeStyle: 'short',
          timeZone: row.appointment.timezone || 'Europe/Paris',
        }).format(new Date(row.appointment.startsAt));

        const reminderLabel = offsetMinutes >= 1440 ? 'demain' : 'dans 2 heures';
        const subject = `Rappel : votre rendez-vous ${reminderLabel} - ${row.org.name}`;
        const locationDetails = [row.location.name, row.location.address, row.location.city, row.room?.name]
          .filter(Boolean)
          .join(', ');

        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f766e;">Rappel de votre rendez-vous</h2>
            <p>Bonjour ${recipientName},</p>
            <p>Nous vous rappelons votre rendez-vous médical / de soin prévu ${reminderLabel} :</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #0f766e; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0 0 8px 0;"><strong>Date & Heure :</strong> ${dateStr}</p>
              <p style="margin: 0 0 8px 0;"><strong>Type de soin :</strong> ${row.type.name}</p>
              <p style="margin: 0 0 8px 0;"><strong>Praticien :</strong> ${row.practitioner.displayName}</p>
              <p style="margin: 0;"><strong>Lieu :</strong> ${locationDetails}</p>
            </div>
            <p style="color: #64748b; font-size: 14px;">En cas d'empêchement, merci de prévenir votre praticien au plus vite.</p>
            <p style="margin-top: 24px; color: #334155;">Bien cordialement,<br /><strong>${row.org.name}</strong></p>
          </div>
        `;

        const text = `Bonjour ${recipientName},\n\nNous vous rappelons votre rendez-vous prévu ${reminderLabel} le ${dateStr}.\nSoin : ${row.type.name}\nPraticien : ${row.practitioner.displayName}\nLieu : ${locationDetails}\n\nCordialement,\n${row.org.name}`;

        try {
          const sendResult = await sendEmail({
            to: recipientEmail,
            subject,
            html,
            text,
          });

          await db
            .update(appointmentReminderDeliveries)
            .set({
              status: 'sent',
              sentAt: new Date(),
              providerMessageId: sendResult.id || null,
            })
            .where(eq(appointmentReminderDeliveries.id, deliveryId));

          result.sent++;
        } catch (err) {
          result.errors++;
          console.error('[AppointmentReminderService] Error sending reminder for appointment ID:', row.appointment.id);

          try {
            await db
              .update(appointmentReminderDeliveries)
              .set({
                status: 'failed',
                sentAt: null,
              })
              .where(eq(appointmentReminderDeliveries.id, deliveryId));
          } catch {
            // Ignore insertion failure on failed attempts
          }
        }
      }
    }

    return result;
  }
}

export const appointmentReminderService = new AppointmentReminderService();
