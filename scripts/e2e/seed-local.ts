import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { 
  organizations, 
  users, 
  clients, 
  invoices, 
  requests, 
  practiceLocations, 
  practicePractitioners, 
  practitionerLocations, 
  practiceRooms, 
  practiceResources,
  patientProfiles,
  patientRepresentatives,
  patientRepresentativeLinks,
  appointmentTypes,
  practitionerAvailabilityRules,
  practitionerAvailabilityExceptions,
  appointments,
  appointmentWaitlistEntries,
  careEpisodes,
  clinicalEncounters,
  clinicalNotes,
  clinicalDocuments,
  clinicalFormTemplates,
  clinicalFormResponses,
  clinicalMeasurements,
  patientPortalAccess,
  patientBillingLinks,
  patientQuestionnaireAssignments,
  deals,
  fieldServiceSites
} from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const SEED_GENERIC_IDS = {
  orgA: 'org-generic-a-1234',
  orgB: 'org-generic-b-5678',
  clientA: 'cli-generic-a-1234',
  clientB: 'cli-generic-b-5678',
};

export const SEED_FIELD_SERVICE_IDS = {
  orgA: 'org-fs-a-1234',
  orgB: 'org-fs-b-5678',
  clientA: 'cli-fs-a-1234',
  clientB: 'cli-fs-b-5678',
  siteA: 'site-fs-a-1234',
  dealA: 'deal-fs-a-1234',
};

export const SEED_PRACTICE_IDS = {
  orgA: 'org-a-1234',
  orgB: 'org-b-5678',
  locationA: '10000000-0000-4000-8000-000000000001',
  locationB: '20000000-0000-4000-8000-000000000001',
  practitionerA: '10000000-0000-4000-8000-000000000002',
  practitionerB: '20000000-0000-4000-8000-000000000002',
  assignmentA: '10000000-0000-4000-8000-000000000003',
  assignmentB: '20000000-0000-4000-8000-000000000003',
  roomA: '10000000-0000-4000-8000-000000000004',
  roomB: '20000000-0000-4000-8000-000000000004',
  resourceA: '10000000-0000-4000-8000-000000000005',
  resourceB: '20000000-0000-4000-8000-000000000005',
};

export const SEED_PATIENT_IDS = {
  patientA: '30000000-0000-4000-8000-000000000001',
  representativeA: '30000000-0000-4000-8000-000000000002',
  linkA: '30000000-0000-4000-8000-000000000003',
  patientB: '40000000-0000-4000-8000-000000000001',
  representativeB: '40000000-0000-4000-8000-000000000002',
  linkB: '40000000-0000-4000-8000-000000000003',
};

export const SEED_SCHEDULING_IDS = {
  appointmentTypeA: '50000000-0000-4000-8000-000000000001',
  availabilityRuleA: '50000000-0000-4000-8000-000000000002',
  availabilityExceptionA: '50000000-0000-4000-8000-000000000003',
  appointmentA: '50000000-0000-4000-8000-000000000004',
  waitlistEntryA: '50000000-0000-4000-8000-000000000005',
  appointmentTypeB: '60000000-0000-4000-8000-000000000001',
  availabilityRuleB: '60000000-0000-4000-8000-000000000002',
  availabilityExceptionB: '60000000-0000-4000-8000-000000000003',
  appointmentB: '60000000-0000-4000-8000-000000000004',
  waitlistEntryB: '60000000-0000-4000-8000-000000000005',
};

export const SEED_CLINICAL_IDS = {
  careEpisodeA: '70000000-0000-4000-8000-000000000001',
  clinicalEncounterA: '70000000-0000-4000-8000-000000000002',
  clinicalNoteA: '70000000-0000-4000-8000-000000000003',
  careEpisodeB: '80000000-0000-4000-8000-000000000001',
  clinicalEncounterB: '80000000-0000-4000-8000-000000000002',
  clinicalNoteB: '80000000-0000-4000-8000-000000000003',
};

export const SEED_CLINICAL_EXPANSION_IDS = {
  clinicalDocumentA: '90000000-0000-4000-8000-000000000001',
  clinicalFormTemplateA: '90000000-0000-4000-8000-000000000002',
  clinicalFormResponseA: '90000000-0000-4000-8000-000000000003',
  clinicalMeasurementA: '90000000-0000-4000-8000-000000000004',
  clinicalDocumentB: 'a0000000-0000-4000-8000-000000000001',
  clinicalFormTemplateB: 'a0000000-0000-4000-8000-000000000002',
  clinicalFormResponseB: 'a0000000-0000-4000-8000-000000000003',
  clinicalMeasurementB: 'a0000000-0000-4000-8000-000000000004',
};

export const SEED_PATIENT_PORTAL_IDS = {
  portalAccessA: 'b0000000-0000-4000-8000-000000000001',
  billingLinkA: 'b0000000-0000-4000-8000-000000000002',
  questionnaireA: 'b0000000-0000-4000-8000-000000000003',
};

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL missing.');
    process.exit(1);
  }
  const dbHostname = new URL(dbUrl).hostname;
  if (process.env.ALLOW_REMOTE_SEED !== 'true' && dbHostname !== 'localhost' && dbHostname !== '127.0.0.1') {
    console.error('ERROR: DATABASE_URL must point to localhost or 127.0.0.1 for local seeding.');
    process.exit(1);
  }

  if (!supabaseUrl) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL missing.');
    process.exit(1);
  }
  const sbHostname = new URL(supabaseUrl).hostname;
  if (process.env.ALLOW_REMOTE_SEED !== 'true' && sbHostname !== 'localhost' && sbHostname !== '127.0.0.1') {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL must point to localhost or 127.0.0.1 for local seeding.');
    process.exit(1);
  }

  const sql = postgres(dbUrl);
  const db = drizzle(sql, { schema: { organizations, users, clients, invoices, requests, practiceLocations, practicePractitioners, practitionerLocations, practiceRooms, practiceResources } });

  // Load SERVICE_ROLE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required to seed users.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });

  console.log('Seeding local database...');

  // 1. Create Organizations (distinct, deterministic per vertical)
  await db.insert(organizations).values([
    // Generic
    { id: SEED_GENERIC_IDS.orgA, name: 'Entreprise Générique A', slug: 'org-generic-a', sector: 'IT', profession: null, profileType: 'professional', isPublic: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: SEED_GENERIC_IDS.orgB, name: 'Entreprise Générique B', slug: 'org-generic-b', sector: 'Consulting', profession: null, profileType: 'professional', isPublic: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // Paramedical
    { id: SEED_PRACTICE_IDS.orgA, name: 'Cabinet Paramédical Santé A', slug: 'org-health-a', sector: 'health', profession: 'physiotherapist', profileType: 'professional', isPublic: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: SEED_PRACTICE_IDS.orgB, name: 'Cabinet Ostéopathie B', slug: 'org-health-b', sector: 'health', profession: 'osteopath', profileType: 'professional', isPublic: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // Field Service
    { id: SEED_FIELD_SERVICE_IDS.orgA, name: 'Plomberie Chauffage Service', slug: 'org-fs-a', sector: 'field_services', profession: 'plumber', profileType: 'professional', isPublic: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: SEED_FIELD_SERVICE_IDS.orgB, name: 'Électricité Générale B', slug: 'org-fs-b', sector: 'field_services', profession: 'electrician', profileType: 'professional', isPublic: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]).onConflictDoNothing();

  const createAuthUser = async (email: string, name: string, profileType: 'professional' | 'client', orgId: string) => {
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }
    let existingUser = usersData.users.find(u => u.email === email);

    if (!existingUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { name, profileType }
      });
      if (error) {
        console.error(`Error creating user ${email}:`, error);
        throw error;
      }
      existingUser = data.user;
    }

    if (existingUser) {
      await db.update(users).set({ organizationId: orgId }).where(eq(users.id, existingUser.id));
      return existingUser.id;
    }
  };

  // 2. Create Users
  // Generic
  const proGenericAId = await createAuthUser('pro_generic_a@monservice.com', 'Professional Generic A', 'professional', SEED_GENERIC_IDS.orgA);
  const cliGenericAId = await createAuthUser('client_generic_a@monservice.com', 'Client Generic A', 'client', SEED_GENERIC_IDS.orgA);
  await createAuthUser('pro_generic_b@monservice.com', 'Professional Generic B', 'professional', SEED_GENERIC_IDS.orgB);
  await createAuthUser('client_generic_b@monservice.com', 'Client Generic B', 'client', SEED_GENERIC_IDS.orgB);

  // Paramedical
  await createAuthUser('pro_health_a@monservice.com', 'Dr. Jane Doe', 'professional', SEED_PRACTICE_IDS.orgA);
  const patientHealthAId = await createAuthUser('patient_health_a@monservice.com', 'Alice Dupont', 'client', SEED_PRACTICE_IDS.orgA);
  const proAId = await createAuthUser('pro_a@monservice.com', 'Professional A', 'professional', SEED_PRACTICE_IDS.orgA);
  const cliAId = await createAuthUser('client_a@monservice.com', 'Client A', 'client', SEED_PRACTICE_IDS.orgA);
  await createAuthUser('staff_a@monservice.com', 'Staff A', 'professional', SEED_PRACTICE_IDS.orgA);
  const proBId = await createAuthUser('pro_b@monservice.com', 'Professional B', 'professional', SEED_PRACTICE_IDS.orgB);
  const cliBId = await createAuthUser('client_b@monservice.com', 'Client B', 'client', SEED_PRACTICE_IDS.orgB);

  // Field Service
  await createAuthUser('pro_fs_a@monservice.com', 'Artisan Plombier A', 'professional', SEED_FIELD_SERVICE_IDS.orgA);
  const cliFsAId = await createAuthUser('client_fs_a@monservice.com', 'Client Field Service A', 'client', SEED_FIELD_SERVICE_IDS.orgA);
  await createAuthUser('pro_fs_b@monservice.com', 'Artisan Électricien B', 'professional', SEED_FIELD_SERVICE_IDS.orgB);

  console.log('Users seeded successfully');
  
  // 3. Create Client Records
  const clientIdA = 'cli-rec-a-1234';
  const clientIdB = 'cli-rec-b-5678';

  await db.insert(clients).values([
    // Generic
    { id: SEED_GENERIC_IDS.clientA, organizationId: SEED_GENERIC_IDS.orgA, userId: cliGenericAId!, name: 'Client Generic A Record', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: SEED_GENERIC_IDS.clientB, organizationId: SEED_GENERIC_IDS.orgB, name: 'Client Generic B Record', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // Paramedical
    { id: clientIdA, organizationId: SEED_PRACTICE_IDS.orgA, userId: cliAId!, name: 'Client A Record', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: clientIdB, organizationId: SEED_PRACTICE_IDS.orgB, userId: cliBId!, name: 'Client B Record', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // Field Service
    { id: SEED_FIELD_SERVICE_IDS.clientA, organizationId: SEED_FIELD_SERVICE_IDS.orgA, userId: cliFsAId!, name: 'Client Field Service A', email: 'client_fs_a@monservice.com', address: '15 Avenue des Artisans', city: 'Lyon', zipCode: '69001', country: 'France', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: SEED_FIELD_SERVICE_IDS.clientB, organizationId: SEED_FIELD_SERVICE_IDS.orgB, name: 'Client Field Service B', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]).onConflictDoNothing();

  // 4. Create Invoices
  await db.insert(invoices).values([
    { id: randomUUID(), organizationId: SEED_GENERIC_IDS.orgA, clientId: SEED_GENERIC_IDS.clientA, type: 'invoice', number: 'INV-GEN-A-001', date: new Date().toISOString(), status: 'sent', totalHT: 100, taxAmount: 20, totalTTC: 120, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: randomUUID(), organizationId: SEED_GENERIC_IDS.orgB, clientId: SEED_GENERIC_IDS.clientB, type: 'invoice', number: 'INV-GEN-B-001', date: new Date().toISOString(), status: 'sent', totalHT: 200, taxAmount: 40, totalTTC: 240, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: randomUUID(), organizationId: SEED_PRACTICE_IDS.orgA, clientId: clientIdA, type: 'invoice', number: 'INV-A-001', date: new Date().toISOString(), status: 'sent', totalHT: 100, taxAmount: 20, totalTTC: 120, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: randomUUID(), organizationId: SEED_PRACTICE_IDS.orgB, clientId: clientIdB, type: 'invoice', number: 'INV-B-001', date: new Date().toISOString(), status: 'sent', totalHT: 200, taxAmount: 40, totalTTC: 240, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]).onConflictDoNothing();

  // 5. Create Field Service Site & Deal
  await db.insert(fieldServiceSites).values([
    {
      id: SEED_FIELD_SERVICE_IDS.siteA,
      organizationId: SEED_FIELD_SERVICE_IDS.orgA,
      clientId: SEED_FIELD_SERVICE_IDS.clientA,
      label: 'Chantier Résidence Bellecour',
      addressLine1: '12 Rue de la République',
      city: 'Lyon',
      postalCode: '69002',
      country: 'FR',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ]).onConflictDoNothing();

  await db.insert(deals).values([
    {
      id: SEED_FIELD_SERVICE_IDS.dealA,
      organizationId: SEED_FIELD_SERVICE_IDS.orgA,
      clientId: SEED_FIELD_SERVICE_IDS.clientA,
      name: 'Rénovation Plomberie & Chauffage',
      value: 3500,
      status: 'proposal',
      expectedCloseDate: '2026-12-31',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ]).onConflictDoNothing();

  // 6. Create Marketplace Requests
  await db.insert(requests).values([
    { id: randomUUID(), clientId: SEED_GENERIC_IDS.clientA, title: 'Need IT Consulting', description: 'Looking for a network upgrade.', category: 'freelance', location: 'Paris', budget: '2500', status: 'open', visibility: 'public', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: randomUUID(), clientId: SEED_FIELD_SERVICE_IDS.clientA, title: 'Besoin de plomberie urgente', description: 'Fuite importante sous évier cuisine.', category: 'field_services', location: 'Lyon', budget: '450', status: 'open', visibility: 'public', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]).onConflictDoNothing();

  console.log('Base Seed completed successfully!');

  // 6. Practice Structure Org A (Deterministic IDs)
  await db.insert(practiceLocations).values([
    { 
      id: SEED_PRACTICE_IDS.locationA, 
      organizationId: SEED_PRACTICE_IDS.orgA, 
      name: 'Cabinet Principal Paris', 
      address: '10 Rue de la Paix',
      city: 'Paris', 
      postalCode: '75001',
      country: 'France',
      timezone: 'Europe/Paris', 
      phone: '0102030405',
      isPrimary: true, 
      isActive: true 
    }
  ]).onConflictDoNothing();

  await db.insert(practicePractitioners).values([
    { 
      id: SEED_PRACTICE_IDS.practitionerA, 
      organizationId: SEED_PRACTICE_IDS.orgA, 
      userId: proAId, 
      displayName: 'Dr. Jane Doe', 
      profession: 'physiotherapist', 
      email: 'jane.doe@cabinet-a.fr',
      phone: '0601020304',
      isActive: true 
    }
  ]).onConflictDoNothing();

  await db.insert(practitionerLocations).values([
    { 
      id: SEED_PRACTICE_IDS.assignmentA, 
      organizationId: SEED_PRACTICE_IDS.orgA, 
      practitionerId: SEED_PRACTICE_IDS.practitionerA, 
      locationId: SEED_PRACTICE_IDS.locationA, 
      isPrimary: true, 
      isActive: true 
    }
  ]).onConflictDoNothing();

  await db.insert(practiceRooms).values([
    { 
      id: SEED_PRACTICE_IDS.roomA, 
      organizationId: SEED_PRACTICE_IDS.orgA, 
      locationId: SEED_PRACTICE_IDS.locationA, 
      name: 'Salle 1 - Rééducation', 
      description: 'Plateau technique',
      isActive: true 
    }
  ]).onConflictDoNothing();

  await db.insert(practiceResources).values([
    { 
      id: SEED_PRACTICE_IDS.resourceA, 
      organizationId: SEED_PRACTICE_IDS.orgA, 
      locationId: SEED_PRACTICE_IDS.locationA, 
      roomId: SEED_PRACTICE_IDS.roomA, 
      name: 'Table de rééducation électrique', 
      description: 'Modèle 3 plans',
      isActive: true 
    }
  ]).onConflictDoNothing();

  // 7. Practice Structure Org B (Deterministic IDs)
  await db.insert(practiceLocations).values([
    { 
      id: SEED_PRACTICE_IDS.locationB, 
      organizationId: SEED_PRACTICE_IDS.orgB, 
      name: 'Cabinet Lyon Centre', 
      address: '5 Place Bellecour',
      city: 'Lyon', 
      postalCode: '69002',
      country: 'France',
      timezone: 'Europe/Paris', 
      phone: '0405060708',
      isPrimary: true, 
      isActive: true 
    }
  ]).onConflictDoNothing();

  await db.insert(practicePractitioners).values([
    { 
      id: SEED_PRACTICE_IDS.practitionerB, 
      organizationId: SEED_PRACTICE_IDS.orgB, 
      userId: proBId, 
      displayName: 'Dr. John Smith', 
      profession: 'osteopath', 
      email: 'john.smith@cabinet-b.fr',
      phone: '0605060708',
      isActive: true 
    }
  ]).onConflictDoNothing();

  await db.insert(practitionerLocations).values([
    { 
      id: SEED_PRACTICE_IDS.assignmentB, 
      organizationId: SEED_PRACTICE_IDS.orgB, 
      practitionerId: SEED_PRACTICE_IDS.practitionerB, 
      locationId: SEED_PRACTICE_IDS.locationB, 
      isPrimary: true, 
      isActive: true 
    }
  ]).onConflictDoNothing();

  await db.insert(practiceRooms).values([
    { 
      id: SEED_PRACTICE_IDS.roomB, 
      organizationId: SEED_PRACTICE_IDS.orgB, 
      locationId: SEED_PRACTICE_IDS.locationB, 
      name: 'Cabinet Ostéopathie 1', 
      description: 'Consultation',
      isActive: true 
    }
  ]).onConflictDoNothing();

  await db.insert(practiceResources).values([
    { 
      id: SEED_PRACTICE_IDS.resourceB, 
      organizationId: SEED_PRACTICE_IDS.orgB, 
      locationId: SEED_PRACTICE_IDS.locationB, 
      roomId: SEED_PRACTICE_IDS.roomB, 
      name: 'Table Ostéopathique Manuelle', 
      description: 'Spécifique manipulation',
      isActive: true 
    }
  ]).onConflictDoNothing();

  console.log('Practice structure Org A & Org B seeded successfully!');

  // Seed Patient Registry for Org A
  await db.insert(patientProfiles).values([
    {
      id: SEED_PATIENT_IDS.patientA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      birthName: 'DUPONT',
      firstBirthName: 'Alice',
      birthFirstNames: 'Alice Marie',
      usedName: 'MARTIN',
      usedFirstName: 'Alice',
      birthDate: '1990-05-15',
      sex: 'female',
      birthPlace: 'Paris',
      birthPlaceCode: '75056',
      birthCountry: 'France',
      email: 'alice.dupont@example.com',
      phone: '0612345678',
      address: '10 rue de la Paix',
      city: 'Paris',
      postalCode: '75002',
      country: 'France',
      isActive: true,
    }
  ]).onConflictDoNothing();

  await db.insert(patientRepresentatives).values([
    {
      id: SEED_PATIENT_IDS.representativeA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      firstName: 'Pierre',
      lastName: 'DUPONT',
      email: 'pierre.dupont@example.com',
      phone: '0687654321',
      address: '10 rue de la Paix',
      city: 'Paris',
      postalCode: '75002',
      country: 'France',
      isActive: true,
    }
  ]).onConflictDoNothing();

  await db.insert(patientRepresentativeLinks).values([
    {
      id: SEED_PATIENT_IDS.linkA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      patientId: SEED_PATIENT_IDS.patientA,
      representativeId: SEED_PATIENT_IDS.representativeA,
      relationship: 'parent',
      isLegalRepresentative: true,
      isPrimaryContact: true,
      isEmergencyContact: true,
      isBillingContact: true,
      isActive: true,
    }
  ]).onConflictDoNothing();

  // Seed Patient Registry for Org B
  await db.insert(patientProfiles).values([
    {
      id: SEED_PATIENT_IDS.patientB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      birthName: 'DURAND',
      firstBirthName: 'Bob',
      birthFirstNames: 'Bob Thomas',
      usedName: null,
      usedFirstName: null,
      birthDate: '1985-11-20',
      sex: 'male',
      birthPlace: 'Lyon',
      birthPlaceCode: '69123',
      birthCountry: 'France',
      email: 'bob.durand@example.com',
      phone: '0622334455',
      address: '5 cours Lafayette',
      city: 'Lyon',
      postalCode: '69003',
      country: 'France',
      isActive: true,
    }
  ]).onConflictDoNothing();

  await db.insert(patientRepresentatives).values([
    {
      id: SEED_PATIENT_IDS.representativeB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      firstName: 'Claire',
      lastName: 'DURAND',
      email: 'claire.durand@example.com',
      phone: '0699887766',
      address: '5 cours Lafayette',
      city: 'Lyon',
      postalCode: '69003',
      country: 'France',
      isActive: true,
    }
  ]).onConflictDoNothing();

  await db.insert(patientRepresentativeLinks).values([
    {
      id: SEED_PATIENT_IDS.linkB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      patientId: SEED_PATIENT_IDS.patientB,
      representativeId: SEED_PATIENT_IDS.representativeB,
      relationship: 'spouse_partner',
      isLegalRepresentative: false,
      isPrimaryContact: true,
      isEmergencyContact: true,
      isBillingContact: false,
      isActive: true,
    }
  ]).onConflictDoNothing();

  console.log('Patient registry Org A & Org B seeded successfully!');

  // 8. Seed Scheduling for Org A
  await db.insert(appointmentTypes).values([
    {
      id: SEED_SCHEDULING_IDS.appointmentTypeA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      name: 'Consultation Kiné',
      description: 'Séance de rééducation standard',
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      slotStepMinutes: 15,
      isActive: true,
    }
  ]).onConflictDoNothing();

  await db.insert(practitionerAvailabilityRules).values([
    {
      id: SEED_SCHEDULING_IDS.availabilityRuleA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      practitionerId: SEED_PRACTICE_IDS.practitionerA,
      locationId: SEED_PRACTICE_IDS.locationA,
      weekday: 1, // Lundi
      startTime: '09:00:00',
      endTime: '18:00:00',
      validFrom: '2026-01-01',
      validUntil: '2030-12-31',
      isActive: true,
    }
  ]).onConflictDoNothing();

  await db.insert(practitionerAvailabilityExceptions).values([
    {
      id: SEED_SCHEDULING_IDS.availabilityExceptionA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      practitionerId: SEED_PRACTICE_IDS.practitionerA,
      locationId: SEED_PRACTICE_IDS.locationA,
      localDate: '2026-12-25',
      kind: 'closed',
      startTime: null,
      endTime: null,
      isActive: true,
    }
  ]).onConflictDoNothing();

  await db.insert(appointments).values([
    {
      id: SEED_SCHEDULING_IDS.appointmentA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      patientId: SEED_PATIENT_IDS.patientA,
      practitionerId: SEED_PRACTICE_IDS.practitionerA,
      appointmentTypeId: SEED_SCHEDULING_IDS.appointmentTypeA,
      locationId: SEED_PRACTICE_IDS.locationA,
      roomId: SEED_PRACTICE_IDS.roomA,
      createdByUserId: proAId!,
      startsAt: new Date('2026-10-05T09:00:00.000Z'),
      endsAt: new Date('2026-10-05T09:30:00.000Z'),
      occupancyStartsAt: new Date('2026-10-05T09:00:00.000Z'),
      occupancyEndsAt: new Date('2026-10-05T09:30:00.000Z'),
      timezone: 'Europe/Paris',
      status: 'scheduled',
    }
  ]).onConflictDoNothing();

  // 9. Seed Scheduling for Org B
  await db.insert(appointmentTypes).values([
    {
      id: SEED_SCHEDULING_IDS.appointmentTypeB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      name: 'Consultation Ostéo',
      description: 'Bilan ostéopathique complet',
      durationMinutes: 45,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 10,
      slotStepMinutes: 15,
      isActive: true,
    }
  ]).onConflictDoNothing();

  await db.insert(practitionerAvailabilityRules).values([
    {
      id: SEED_SCHEDULING_IDS.availabilityRuleB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      practitionerId: SEED_PRACTICE_IDS.practitionerB,
      locationId: SEED_PRACTICE_IDS.locationB,
      weekday: 2, // Mardi
      startTime: '08:30:00',
      endTime: '17:30:00',
      validFrom: '2026-01-01',
      validUntil: '2030-12-31',
      isActive: true,
    }
  ]).onConflictDoNothing();

  await db.insert(practitionerAvailabilityExceptions).values([
    {
      id: SEED_SCHEDULING_IDS.availabilityExceptionB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      practitionerId: SEED_PRACTICE_IDS.practitionerB,
      locationId: SEED_PRACTICE_IDS.locationB,
      localDate: '2026-12-25',
      kind: 'closed',
      startTime: null,
      endTime: null,
      isActive: true,
    }
  ]).onConflictDoNothing();

  await db.insert(appointments).values([
    {
      id: SEED_SCHEDULING_IDS.appointmentB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      patientId: SEED_PATIENT_IDS.patientB,
      practitionerId: SEED_PRACTICE_IDS.practitionerB,
      appointmentTypeId: SEED_SCHEDULING_IDS.appointmentTypeB,
      locationId: SEED_PRACTICE_IDS.locationB,
      roomId: SEED_PRACTICE_IDS.roomB,
      createdByUserId: proBId!,
      startsAt: new Date('2026-10-06T09:00:00.000Z'),
      endsAt: new Date('2026-10-06T09:45:00.000Z'),
      occupancyStartsAt: new Date('2026-10-06T08:55:00.000Z'),
      occupancyEndsAt: new Date('2026-10-06T09:55:00.000Z'),
      timezone: 'Europe/Paris',
      status: 'scheduled',
    }
  ]).onConflictDoNothing();

  await db.insert(appointmentWaitlistEntries).values([
    {
      id: SEED_SCHEDULING_IDS.waitlistEntryA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      patientId: SEED_PATIENT_IDS.patientA,
      locationId: SEED_PRACTICE_IDS.locationA,
      practitionerId: SEED_PRACTICE_IDS.practitionerA,
      appointmentTypeId: SEED_SCHEDULING_IDS.appointmentTypeA,
      preferredDateFrom: '2026-10-01',
      preferredDateUntil: '2026-10-31',
      preferredStartTime: '09:00:00',
      preferredEndTime: '12:00:00',
      timezone: 'Europe/Paris',
      status: 'waiting',
      createdByUserId: proAId!,
    }
  ]).onConflictDoNothing();

  await db.insert(appointmentWaitlistEntries).values([
    {
      id: SEED_SCHEDULING_IDS.waitlistEntryB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      patientId: SEED_PATIENT_IDS.patientB,
      locationId: SEED_PRACTICE_IDS.locationB,
      practitionerId: SEED_PRACTICE_IDS.practitionerB,
      appointmentTypeId: SEED_SCHEDULING_IDS.appointmentTypeB,
      preferredDateFrom: '2026-10-01',
      preferredDateUntil: '2026-10-31',
      preferredStartTime: '14:00:00',
      preferredEndTime: '18:00:00',
      timezone: 'Europe/Paris',
      status: 'waiting',
      createdByUserId: proBId!,
    }
  ]).onConflictDoNothing();

  // 10. Clinical Records Org A
  await db.insert(careEpisodes).values([
    {
      id: SEED_CLINICAL_IDS.careEpisodeA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      patientId: SEED_PATIENT_IDS.patientA,
      practitionerId: SEED_PRACTICE_IDS.practitionerA,
      title: 'Épisode de soins kinésithérapie initiale',
      status: 'active',
      startedAt: new Date('2026-08-01T08:00:00.000Z'),
    }
  ]).onConflictDoNothing();

  await db.insert(clinicalEncounters).values([
    {
      id: SEED_CLINICAL_IDS.clinicalEncounterA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      careEpisodeId: SEED_CLINICAL_IDS.careEpisodeA,
      patientId: SEED_PATIENT_IDS.patientA,
      practitionerId: SEED_PRACTICE_IDS.practitionerA,
      appointmentId: null,
      occurredAt: new Date('2026-08-01T09:00:00.000Z'),
    }
  ]).onConflictDoNothing();

  await db.insert(clinicalNotes).values([
    {
      id: SEED_CLINICAL_IDS.clinicalNoteA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      encounterId: SEED_CLINICAL_IDS.clinicalEncounterA,
      patientId: SEED_PATIENT_IDS.patientA,
      authorPractitionerId: SEED_PRACTICE_IDS.practitionerA,
      content: 'Note clinique de test A.',
      status: 'draft',
    }
  ]).onConflictDoNothing();

  await db.update(clinicalNotes)
    .set({ status: 'finalized' })
    .where(eq(clinicalNotes.id, SEED_CLINICAL_IDS.clinicalNoteA));

  // 11. Clinical Records Org B
  await db.insert(careEpisodes).values([
    {
      id: SEED_CLINICAL_IDS.careEpisodeB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      patientId: SEED_PATIENT_IDS.patientB,
      practitionerId: SEED_PRACTICE_IDS.practitionerB,
      title: 'Épisode de soins ostéopathie initiale',
      status: 'active',
      startedAt: new Date('2026-08-01T08:00:00.000Z'),
    }
  ]).onConflictDoNothing();

  await db.insert(clinicalEncounters).values([
    {
      id: SEED_CLINICAL_IDS.clinicalEncounterB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      careEpisodeId: SEED_CLINICAL_IDS.careEpisodeB,
      patientId: SEED_PATIENT_IDS.patientB,
      practitionerId: SEED_PRACTICE_IDS.practitionerB,
      appointmentId: null,
      occurredAt: new Date('2026-08-01T09:00:00.000Z'),
    }
  ]).onConflictDoNothing();

  await db.insert(clinicalNotes).values([
    {
      id: SEED_CLINICAL_IDS.clinicalNoteB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      encounterId: SEED_CLINICAL_IDS.clinicalEncounterB,
      patientId: SEED_PATIENT_IDS.patientB,
      authorPractitionerId: SEED_PRACTICE_IDS.practitionerB,
      content: 'Note clinique de test B.',
      status: 'draft',
    }
  ]).onConflictDoNothing();

  await db.update(clinicalNotes)
    .set({ status: 'finalized' })
    .where(eq(clinicalNotes.id, SEED_CLINICAL_IDS.clinicalNoteB));

  // 12. Clinical Documents Org A & Org B
  await db.insert(clinicalDocuments).values([
    {
      id: SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      patientId: SEED_PATIENT_IDS.patientA,
      practitionerId: SEED_PRACTICE_IDS.practitionerA,
      careEpisodeId: SEED_CLINICAL_IDS.careEpisodeA,
      encounterId: SEED_CLINICAL_IDS.clinicalEncounterA,
      title: 'Ordonnance kinésithérapie initiale',
      category: 'prescription',
      fileName: 'ordonnance_initiale.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 102400,
      storagePath: `${SEED_PRACTICE_IDS.orgA}/${SEED_PRACTICE_IDS.practitionerA}/${SEED_PATIENT_IDS.patientA}/${SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentA}/ordonnance_initiale.pdf`,
      isArchived: false,
    },
    {
      id: SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      patientId: SEED_PATIENT_IDS.patientB,
      practitionerId: SEED_PRACTICE_IDS.practitionerB,
      careEpisodeId: SEED_CLINICAL_IDS.careEpisodeB,
      encounterId: SEED_CLINICAL_IDS.clinicalEncounterB,
      title: 'Compte-rendu ostéopathique',
      category: 'correspondence',
      fileName: 'compte_rendu.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 204800,
      storagePath: `${SEED_PRACTICE_IDS.orgB}/${SEED_PRACTICE_IDS.practitionerB}/${SEED_PATIENT_IDS.patientB}/${SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentB}/compte_rendu.pdf`,
      isArchived: false,
    },
  ]).onConflictDoNothing();

  // 13. Clinical Form Templates Org A & Org B
  await db.insert(clinicalFormTemplates).values([
    {
      id: SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      practitionerId: SEED_PRACTICE_IDS.practitionerA,
      name: 'Bilan initial kinésithérapie',
      kind: 'assessment',
      description: 'Évaluation posturale et amplitude',
      schemaJson: {
        fields: [
          { id: 'douleur_eva', label: 'Score douleur EVA', type: 'scale', min: 0, max: 10, required: true },
          { id: 'remarques', label: 'Remarques cliniques', type: 'textarea', required: false },
        ],
      },
      isActive: true,
    },
    {
      id: SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      practitionerId: SEED_PRACTICE_IDS.practitionerB,
      name: 'Questionnaire d’accueil ostéopathie',
      kind: 'intake',
      description: 'Anamnèse et antécédents',
      schemaJson: {
        fields: [
          { id: 'antecedents', label: 'Antécédents notables', type: 'text', required: true },
          { id: 'fumeur', label: 'Tabagisme actif', type: 'boolean', required: false },
        ],
      },
      isActive: true,
    },
  ]).onConflictDoNothing();

  // 14. Clinical Form Responses Org A & Org B
  await db.insert(clinicalFormResponses).values([
    {
      id: SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      templateId: SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateA,
      patientId: SEED_PATIENT_IDS.patientA,
      practitionerId: SEED_PRACTICE_IDS.practitionerA,
      careEpisodeId: SEED_CLINICAL_IDS.careEpisodeA,
      encounterId: SEED_CLINICAL_IDS.clinicalEncounterA,
      answersJson: { douleur_eva: 6, remarques: 'Lombalgie persistante' },
      status: 'draft',
    },
    {
      id: SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      templateId: SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateB,
      patientId: SEED_PATIENT_IDS.patientB,
      practitionerId: SEED_PRACTICE_IDS.practitionerB,
      careEpisodeId: SEED_CLINICAL_IDS.careEpisodeB,
      encounterId: SEED_CLINICAL_IDS.clinicalEncounterB,
      answersJson: { antecedents: 'Entorse cheville 2024', fumeur: false },
      status: 'draft',
    },
  ]).onConflictDoNothing();

  // Finalize Form Response A
  await db.update(clinicalFormResponses)
    .set({ status: 'finalized', finalizedAt: new Date() })
    .where(eq(clinicalFormResponses.id, SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseA));

  // 15. Clinical Measurements Org A & Org B
  await db.insert(clinicalMeasurements).values([
    {
      id: SEED_CLINICAL_EXPANSION_IDS.clinicalMeasurementA,
      organizationId: SEED_PRACTICE_IDS.orgA,
      patientId: SEED_PATIENT_IDS.patientA,
      practitionerId: SEED_PRACTICE_IDS.practitionerA,
      careEpisodeId: SEED_CLINICAL_IDS.careEpisodeA,
      encounterId: SEED_CLINICAL_IDS.clinicalEncounterA,
      code: 'pain_score',
      label: 'Échelle de douleur EVA',
      valueNumeric: '6',
      valueText: null,
      unit: '/10',
      observedAt: new Date('2026-08-01T09:15:00.000Z'),
    },
    {
      id: SEED_CLINICAL_EXPANSION_IDS.clinicalMeasurementB,
      organizationId: SEED_PRACTICE_IDS.orgB,
      patientId: SEED_PATIENT_IDS.patientB,
      practitionerId: SEED_PRACTICE_IDS.practitionerB,
      careEpisodeId: SEED_CLINICAL_IDS.careEpisodeB,
      encounterId: SEED_CLINICAL_IDS.clinicalEncounterB,
      code: 'posture_observation',
      label: 'Observation posturale',
      valueNumeric: null,
      valueText: 'Bascule du bassin à droite',
      unit: null,
      observedAt: new Date('2026-08-01T09:15:00.000Z'),
    },
  ]).onConflictDoNothing();

  // 16. Patient Portal Access, Billing Links & Questionnaires (Session 14)
  const portalAccessAId = 'b0000000-0000-4000-8000-000000000001';
  await db.insert(patientPortalAccess).values([
    {
      id: portalAccessAId,
      organizationId: SEED_PRACTICE_IDS.orgA,
      patientId: SEED_PATIENT_IDS.patientA,
      userId: cliAId!,
      accessType: 'patient',
      isActive: true,
      createdByUserId: proAId!,
    },
    {
      id: 'b0000000-0000-4000-8000-000000000099',
      organizationId: SEED_PRACTICE_IDS.orgA,
      patientId: SEED_PATIENT_IDS.patientA,
      userId: patientHealthAId!,
      accessType: 'patient',
      isActive: true,
      createdByUserId: proAId!,
    },
  ]).onConflictDoNothing();

  const billingLinkAId = 'b0000000-0000-4000-8000-000000000002';
  await db.insert(patientBillingLinks).values([
    {
      id: billingLinkAId,
      organizationId: SEED_PRACTICE_IDS.orgA,
      patientId: SEED_PATIENT_IDS.patientA,
      clientId: clientIdA,
    },
  ]).onConflictDoNothing();

  const questionnaireA1Id = SEED_PATIENT_PORTAL_IDS.questionnaireA;
  await db.insert(patientQuestionnaireAssignments).values([
    {
      id: questionnaireA1Id,
      organizationId: SEED_PRACTICE_IDS.orgA,
      patientId: SEED_PATIENT_IDS.patientA,
      practitionerId: SEED_PRACTICE_IDS.practitionerA,
      templateId: SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateA,
      status: 'assigned',
      answersJson: { q1: 'val1' },
    },
  ]).onConflictDoNothing();

  console.log('Scheduling foundation, Waitlist, Clinical Expansion & Patient Portal Records Org A & Org B seeded successfully!');
  await sql.end();
}

// Only execute seed if run directly as a script, not when imported in tests
if (process.argv[1] && (process.argv[1].includes('seed-local') || process.argv[1].endsWith('seed-local.ts'))) {
  seed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}


