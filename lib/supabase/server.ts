import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const liveFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' });

export function createClient() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: () => {}, // Server Components are read-only; middleware refreshes
      },
      global: { fetch: liveFetch },
    },
  );
}
