/**
 * Client-side debug logger.
 * Logs are suppressed in production to prevent leaking internal state.
 *
 * Usage:
 *   import { clientLogger } from '@/lib/client-logger';
 *   const log = clientLogger('DashboardClient');
 *   log.debug('Loan updated', { loanId });
 *   log.error('Failed to fetch', err);
 */

const isDev = process.env.NODE_ENV !== 'production';

export function clientLogger(label: string) {
  const prefix = `[${label}]`;
  return {
    /** Only visible in development */
    debug: (msg: string, ...args: unknown[]) => {
      if (isDev) console.log(prefix, msg, ...args);
    },
    /** Always visible (errors matter in production too) */
    error: (msg: string, ...args: unknown[]) => {
      console.error(prefix, msg, ...args);
    },
    warn: (msg: string, ...args: unknown[]) => {
      if (isDev) console.warn(prefix, msg, ...args);
    },
  };
}
