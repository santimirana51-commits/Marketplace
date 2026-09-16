import { requireAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { CONTENT_DEFAULTS, CONTENT_KEYS } from '@/lib/content';
import { errResponse } from '@/lib/validation';
import { z } from 'zod';

const saveSchema = z.object({ values: z.record(z.string().max(5000)) });

/** GET /api/admin/content — current overrides (admin only). */
export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return errResponse('Forbidden', (e as { status?: number }).status ?? 403);
  }
  const admin = adminClient();
  const { data } = await admin.from('site_content').select('key,value').limit(200);
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as { key: string; value: string }[]) map[r.key] = r.value ?? '';
  return Response.json({ values: map, defaults: CONTENT_DEFAULTS });
}

/** POST /api/admin/content — upsert allow-listed keys only. */
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    return errResponse('Forbidden', (e as { status?: number }).status ?? 403);
  }
  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errResponse('Invalid input');
  const clean: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(parsed.data.values)) {
    if (CONTENT_KEYS.includes(k) && v.trim()) clean.push({ key: k, value: v.slice(0, 5000) });
  }
  if (!clean.length) return errResponse('Tidak ada perubahan');
  const admin = adminClient();
  const { error } = await admin.from('site_content').upsert(clean, { onConflict: 'key' });
  if (error) {
    if (/site_content|relation.*does not exist|schema cache/i.test(error.message)) {
      return errResponse('Tabel site_content belum ada — jalankan migrasi 0009', 400);
    }
    return errResponse(error.message, 400);
  }
  return Response.json({ ok: true, saved: clean.length });
}
