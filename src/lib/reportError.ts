/**
 * Optional production error reporting. When SENTRY_DSN is set, errors
 * logged via the logger (and any explicit reportError calls) are sent to Sentry.
 * No-op when SENTRY_DSN is not set.
 */

let initialized = false;

function initOnce() {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || typeof dsn !== 'string' || dsn.trim() === '') return;
  try {
    // Dynamic import so Sentry is optional (no hard dependency if DSN unset)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      enabled: true,
      tracesSampleRate: 0,
    });
    initialized = true;
  } catch {
    // @sentry/node not installed or init failed
  }
}

/**
 * Report an error to Sentry when SENTRY_DSN is set. Safe to call from logger or any API route.
 */
export function reportError(err: unknown): void {
  if (!process.env.SENTRY_DSN) return;
  try {
    initOnce();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/node');
    Sentry.captureException(err);
  } catch {
    // Ignore Sentry failures (e.g. SDK not installed)
  }
}
