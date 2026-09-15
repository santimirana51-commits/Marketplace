const SECRET_KEYS = [
  'password',
  'token',
  'secret',
  'refresh_token',
  'access_token',
  'authorization',
  'stripe',
  'google',
];

/** Structured server log that redacts anything resembling a secret. */
export function log(event: string, fields: Record<string, unknown> = {}) {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    const low = k.toLowerCase();
    safe[k] = SECRET_KEYS.some((s) => low.includes(s)) ? '[redacted]' : v;
  }
  console.log(JSON.stringify({ event, at: new Date().toISOString(), ...safe }));
}
