import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import '@testing-library/jest-dom';
import { vi } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:54322/postgres';

vi.mock('server-only', () => ({}));
