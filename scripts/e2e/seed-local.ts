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
  practiceResources 
} from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

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

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL missing.');
    process.exit(1);
  }
  const dbHostname = new URL(dbUrl).hostname;
  if (dbHostname !== 'localhost' && dbHostname !== '127.0.0.1') {
    console.error('ERROR: DATABASE_URL must point to localhost or 127.0.0.1 for local seeding.');
    process.exit(1);
  }

  if (!supabaseUrl) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL missing.');
    process.exit(1);
  }
  const sbHostname = new URL(supabaseUrl).hostname;
  if (sbHostname !== 'localhost' && sbHostname !== '127.0.0.1') {
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

  // 1. Create Organizations (keeping generic sectors)
  await db.insert(organizations).values([
    { id: SEED_PRACTICE_IDS.orgA, name: 'Organization A', slug: 'org-a', sector: 'IT', profileType: 'professional', isPublic: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: SEED_PRACTICE_IDS.orgB, name: 'Organization B', slug: 'org-b', sector: 'Consulting', profileType: 'professional', isPublic: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]).onConflictDoNothing();

  const createAuthUser = async (email: string, name: string, profileType: 'professional' | 'client', orgId: string) => {
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
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
  const proAId = await createAuthUser('pro_a@monservice.com', 'Professional A', 'professional', SEED_PRACTICE_IDS.orgA);
  const cliAId = await createAuthUser('client_a@monservice.com', 'Client A', 'client', SEED_PRACTICE_IDS.orgA);
  const proBId = await createAuthUser('pro_b@monservice.com', 'Professional B', 'professional', SEED_PRACTICE_IDS.orgB);
  const cliBId = await createAuthUser('client_b@monservice.com', 'Client B', 'client', SEED_PRACTICE_IDS.orgB);

  console.log('Users seeded successfully');
  
  // 3. Create Client Records
  const clientIdA = 'cli-rec-a-1234';
  const clientIdB = 'cli-rec-b-5678';

  await db.insert(clients).values([
    { id: clientIdA, organizationId: SEED_PRACTICE_IDS.orgA, userId: cliAId!, name: 'Client A Record', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: clientIdB, organizationId: SEED_PRACTICE_IDS.orgB, userId: cliBId!, name: 'Client B Record', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]).onConflictDoNothing();

  // 4. Create Invoices
  await db.insert(invoices).values([
    { id: randomUUID(), organizationId: SEED_PRACTICE_IDS.orgA, clientId: clientIdA, type: 'invoice', number: 'INV-A-001', date: new Date().toISOString(), status: 'sent', totalHT: 100, taxAmount: 20, totalTTC: 120, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: randomUUID(), organizationId: SEED_PRACTICE_IDS.orgB, clientId: clientIdB, type: 'invoice', number: 'INV-B-001', date: new Date().toISOString(), status: 'sent', totalHT: 200, taxAmount: 40, totalTTC: 240, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]).onConflictDoNothing();

  // 5. Create Marketplace Request
  await db.insert(requests).values([
    { id: randomUUID(), clientId: clientIdA, title: 'Need IT Consulting', description: 'Looking for a network upgrade.', category: 'IT', status: 'open', visibility: 'public', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
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
  await sql.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

