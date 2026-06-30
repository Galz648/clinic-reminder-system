import 'dotenv/config';

export function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable ${key}. Copy .env.example to .env and set it.`,
    );
  }

  return value;
}

export const env = {
  get port(): number {
    const value = Number(requireEnv('PORT'));
    if (Number.isNaN(value)) {
      throw new Error('PORT must be a number');
    }

    return value;
  },

  get apiPublicUrl(): string {
    return requireEnv('API_PUBLIC_URL');
  },

  get databaseUrl(): string {
    return requireEnv('DATABASE_URL');
  },

  get databaseUrlProduction(): string | undefined {
    return process.env.DATABASE_URL_PRODUCTION?.trim() || undefined;
  },

  get temporalAddress(): string {
    return requireEnv('TEMPORAL_ADDRESS');
  },

  get temporalNamespace(): string {
    return requireEnv('TEMPORAL_NAMESPACE');
  },

  get temporalTaskQueue(): string {
    return requireEnv('TEMPORAL_TASK_QUEUE');
  },
};
