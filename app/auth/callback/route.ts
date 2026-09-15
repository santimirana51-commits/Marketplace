import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (code) {
    const store = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => store.getAll(), setAll: (c: { name: string; value: string; options?: object }[]) => c.forEach((x) => (store as { set: (n: string, v: string, o?: object) => void }).set(x.name, x.value, x.options)) } },
    );
    await supabase.auth.exchangeCodeForSession(code);
  }
  redirect('/account');
}
