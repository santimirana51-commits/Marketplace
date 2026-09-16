import { requireAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { adminProductSchema, errResponse } from '@/lib/validation';

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return errResponse('Forbidden', (e as { status?: number }).status ?? 403);
  }
  const admin = adminClient();
  const { data } = await admin.from('products').select('*').order('created_at', { ascending: false }).limit(100);
  return Response.json({ products: data ?? [] });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    return errResponse('Forbidden', (e as { status?: number }).status ?? 403);
  }
  const parsed = adminProductSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errResponse(parsed.error.errors[0]?.message ?? 'Invalid input');
  const admin = adminClient();
  const attempt = await admin.from('products').insert(parsed.data).select('*').single();
  if (!attempt.error) return Response.json({ product: attempt.data }, { status: 201 });
  // Pre-0007 databases lack install_steps/notice — create without them.
  if (/install_steps|notice|category/.test(attempt.error.message ?? '')) {
    const { install_steps: _a, notice: _b, category: _c, ...legacy } = parsed.data as Record<string, unknown>;
    const retry = await admin.from('products').insert(legacy).select('*').single();
    if (!retry.error) {
      return Response.json({ product: retry.data, warning: 'Kolom install/notice belum ada — jalankan migrasi 0007' }, { status: 201 });
    }
  }
  return errResponse(attempt.error.message, 400);
}
