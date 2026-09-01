import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { organizations, users, clients, invoices, requests, practiceLocations, practicePractitioners, practitionerLocations, practiceRooms, practiceResources } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

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

  // 1. Create Organizations
  await db.insert(organizations).values([
    { id: 'org-a-1234', name: 'Organization A', slug: 'org-a', sector: 'IT', profileType: 'professional', isPublic: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'org-b-5678', name: 'Organization B', slug: 'org-b', sector: 'Consulting', profileType: 'professional', isPublic: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]).onConflictDoNothing();

  const createAuthUser = async (email: string, name: string, profileType: 'professional' | 'client', orgId: string) => {
    // Check if user exists
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
      // The trigger on_auth_user_created will have inserted the user into public.users.
      // We just need to update their organizationId.
      await db.update(users).set({ organizationId: orgId }).where(eq(users.id, existingUser.id));
      return existingUser.id;
    }
  };

  // 2. Create Users
  const proAId = await createAuthUser('pro_a@monservice.com', 'Professional A', 'professional', 'org-a-1234');
  const cliAId = await createAuthUser('client_a@monservice.com', 'Client A', 'client', 'org-a-1234');
  const proBId = await createAuthUser('pro_b@monservice.com', 'Professional B', 'professional', 'org-b-5678');
  const cliBId = await createAuthUser('client_b@monservice.com', 'Client B', 'client', 'org-b-5678');

  console.log('Users seeded successfully');
  
  // 3. Create Client Records
  const clientIdA = 'cli-rec-a-1234';
  const clientIdB = 'cli-rec-b-5678';

  await db.insert(clients).values([
    { id: clientIdA, organizationId: 'org-a-1234', userId: cliAId!, name: 'Client A Record', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: clientIdB, organizationId: 'org-b-5678', userId: cliBId!, name: 'Client B Record', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]).onConflictDoNothing();

  // 4. Create Invoices
  await db.insert(invoices).values([
    { id: randomUUID(), organizationId: 'org-a-1234', clientId: clientIdA, type: 'invoice', number: 'INV-A-001', date: new Date().toISOString(), status: 'sent', totalHT: 100, taxAmount: 20, totalTTC: 120, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: randomUUID(), organizationId: 'org-b-5678', clientId: clientIdB, type: 'invoice', number: 'INV-B-001', date: new Date().toISOString(), status: 'sent', totalHT: 200, taxAmount: 40, totalTTC: 240, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]).onConflictDoNothing();

  // 5. Create Marketplace Request
  await db.insert(requests).values([
    { id: randomUUID(), clientId: clientIdA, title: 'Need IT Consulting', description: 'Looking for a network upgrade.', category: 'IT', status: 'open', visibility: 'public', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]).onConflictDoNothing();

  console.log('Seed completed successfully!');

  // 6. Practice Structure
  const locationIdA = randomUUID();
  await db.insert(practiceLocations).values([
    { id: locationIdA, organizationId: 'org-a-1234', name: 'Cabinet Principal', city: 'Paris', timezone: 'Europe/Paris', isPrimary: true, isActive: true }
  ]).onConflictDoNothing();

  const pracIdA = randomUUID();
  await db.insert(practicePractitioners).values([
    { id: pracIdA, organizationId: 'org-a-1234', userId: proAId, displayName: 'Dr. Jane Doe', profession: 'physiotherapist', isActive: true }
  ]).onConflictDoNothing();

  await db.insert(practitionerLocations).values([
    { id: randomUUID(), organizationId: 'org-a-1234', practitionerId: pracIdA, locationId: locationIdA, isPrimary: true, isActive: true }
  ]).onConflictDoNothing();

  const roomId = randomUUID();
  await db.insert(practiceRooms).values([
    { id: roomId, organizationId: 'org-a-1234', locationId: locationIdA, name: 'Salle 1', isActive: true }
  ]).onConflictDoNothing();

  await db.insert(practiceResources).values([
    { id: randomUUID(), organizationId: 'org-a-1234', locationId: locationIdA, roomId, name: 'Table de massage', isActive: true }
  ]).onConflictDoNothing();

  console.log('Practice structure seeded successfully!');
  await sql.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
