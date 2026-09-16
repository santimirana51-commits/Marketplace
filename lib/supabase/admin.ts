import { createClient } from '@supabase/supabase-js';

/**
 * fetch without Next.js Data Cache: product/file reads must reflect admin
 * edits immediately, not a stale snapshot.
 */
const liveFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' });

/** Service-role client. SERVER ONLY — never import into client components. */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server env not configured');
  return createClient(url, key, { auth: { persistSession: false }, global: { fetch: liveFetch } });
}
