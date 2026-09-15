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
  const { data, error } = await admin.from('products').insert(parsed.data).select('*').single();
  if (error) return errResponse(error.message, 400);
  return Response.json({ product: data }, { status: 201 });
}
