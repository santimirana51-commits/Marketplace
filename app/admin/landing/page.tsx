import { redirect } from 'next/navigation';
import { getSessionUser, isAdminEmail } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { LandingEditor } from '@/components/LandingEditor';

export default async function AdminLanding() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) redirect('/login');
  const { data } = await adminClient().from('site_content').select('key,value').limit(200);
  const initial: Record<string, string> = {};
  for (const r of (data ?? []) as { key: string; value: string }[]) initial[r.key] = r.value ?? '';
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold">Landing page</h1>
      <p className="mt-1 text-sm text-zinc-600">Ubah teks homepage. Kosongkan field untuk kembali ke bawaan. Perubahan tampil setelah refresh (tanpa deploy).</p>
      <LandingEditor initial={initial} />
    </div>
  );
}
