// One explicit provider. Never fall back to a Supabase POSTGRES_URL silently.
export function neonDatabaseUrl(env = process.env) {
  const url = env.NEON_DATABASE_URL || env.NEON_POSTGRES_URL;
  if (!url || url === "[SENSITIVE]")
    throw new Error(
      "Neon database configuration is missing. Set NEON_DATABASE_URL in the server environment.",
    );
  return url;
}
export function pushConfiguration(env = process.env) {
  // Select a complete pair; never mix public/private keys from different names.
  const primary = env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY;
  return {
    publicKey: primary ? env.VAPID_PUBLIC_KEY : env.WEB_PUSH_PUBLIC_KEY,
    privateKey: primary ? env.VAPID_PRIVATE_KEY : env.WEB_PUSH_PRIVATE_KEY,
    subject: primary ? env.VAPID_SUBJECT : env.WEB_PUSH_SUBJECT,
    cronSecret: env.CRON_SECRET,
  };
}
export function isPushConfigured(config) {
  return !!(
    config.publicKey &&
    config.privateKey &&
    config.subject &&
    config.cronSecret
  );
}
