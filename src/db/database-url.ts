/** Transaction-mode Supabase pooler (port 6543) does not support prepared statements. */
export function isSupabasePoolerUrl(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    return (
      url.hostname.includes('.pooler.supabase.com') || url.port === '6543'
    );
  } catch {
    return false;
  }
}

export function poolOptionsForUrl(connectionString: string) {
  return {
    connectionString,
    ...(isSupabasePoolerUrl(connectionString) ? { prepare: false as const } : {}),
  };
}

/** Used by Drizzle Kit and migration scripts. Honors DRIZZLE_DATABASE_URL or DATABASE_TARGET. */
export function resolveDrizzleDatabaseUrl(): string {
  const explicit = process.env.DRIZZLE_DATABASE_URL?.trim();
  if (explicit) {
    return explicit;
  }

  if (process.env.DATABASE_TARGET === 'production') {
    const production = process.env.DATABASE_URL_PRODUCTION?.trim();
    if (!production) {
      throw new Error(
        'DATABASE_URL_PRODUCTION is required when DATABASE_TARGET=production',
      );
    }

    return production;
  }

  const local = process.env.DATABASE_URL?.trim();
  if (!local) {
    throw new Error(
      'DATABASE_URL is required. Copy .env.example to .env and set it.',
    );
  }

  return local;
}
