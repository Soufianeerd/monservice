import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import '@testing-library/jest-dom';
import { vi } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:54322/postgres';

vi.mock('server-only', () => ({}));

// Outside Next, each call represents a fresh request. Integration identities
// are selected by their fixture scope, never retained across actors.
vi.mock('next/headers', () => ({ cookies: async () => ({}) }));

// Unit tests do not establish HTTP sessions. Integration tests override this
// with identities obtained through a real managed Auth login.
vi.mock('@/lib/auth/server', () => ({ auth: { getSession: vi.fn().mockResolvedValue({ data: null, error: null }) } }));
