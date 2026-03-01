import { vi } from 'vitest';

// Global test setup — runs before every test file

// Provide environment variables that modules read at import time
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.SMTP_HOST = 'smtp.example.com';
process.env.SMTP_PORT = '587';
// Leave SMTP_USER/PASS unset so sendEmail short-circuits in dev mode

// Silence logger output during tests
vi.mock('@/lib/logger', () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));
