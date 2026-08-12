import '@testing-library/jest-dom';
import { vi } from 'vitest';

process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';

vi.mock('server-only', () => ({}));
