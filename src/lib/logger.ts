/**
 * Structured logger for Feyza API routes.
 *
 * Outputs JSON in production (for Vercel log ingestion / Datadog / etc.)
 * and human-readable format in development.
 *
 * Usage:
 *   import { logger, getErrorMessage } from '@/lib/logger';
 *   const log = logger('auto-pay');
 *   log.info('Processing payment', { loanId, amount });
 *   log.error('Transfer failed', { loanId }, err);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEntry = {
  ts: string;
  level: LogLevel;
  service: string;
  msg: string;
  [key: string]: unknown;
};

const isDev = process.env.NODE_ENV !== 'production';

function write(level: LogLevel, service: string, msg: string, meta?: unknown, err?: unknown) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    service,
    msg,
    // Safely spread meta only if it's a plain object
    ...(meta !== null && meta !== undefined && typeof meta === 'object' && !Array.isArray(meta) ? (meta as Record<string, unknown>) : meta !== undefined ? { data: meta } : {}),
  };

  if (err) {
    if (err instanceof Error) {
      entry.error = (err as Error).message;
      entry.stack = err.stack;
    } else {
      entry.error = String(err);
    }
    // Sentry: do not require reportError here — the logger is used by client code (e.g. guest form).
    // To report errors to Sentry, call reportError(err) from API route catch blocks (server-only).
  }

  if (isDev) {
    // Human-readable dev output
    const prefix = `[${entry.ts}] [${level.toUpperCase()}] [${service}]`;
    const metaStr = meta || err ? ` ${JSON.stringify({ ...(meta && typeof meta === 'object' ? meta : { data: meta }), ...(err ? { error: entry.error } : {}) })}` : '';
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`${prefix} ${msg}${metaStr}`);
  } else {
    // Structured JSON for production log aggregation
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(JSON.stringify(entry));
  }
}

export function logger(service: string) {
  return {
    debug: (msg: string, meta?: unknown) => write('debug', service, msg, meta),
    info: (msg: string, meta?: unknown) => write('info', service, msg, meta),
    warn: (msg: string, meta?: unknown) => write('warn', service, msg, meta),
    error: (msg: string, meta?: unknown, err?: unknown) => write('error', service, msg, meta, err),
  };
}

/** Singleton for one-off usage without a named service */
export const log = logger('api');

/**
 * Safely extract an error message from an unknown caught value.
 * Use this instead of `getErrorMessage(err)` in catch blocks.
 *
 * Usage:
 *   catch (err: unknown) {
 *     log.error('Something failed', {}, err);
 *     return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
 *   }
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return (err as Error).message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return 'Unknown error';
}
