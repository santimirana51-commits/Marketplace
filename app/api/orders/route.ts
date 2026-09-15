import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { errResponse } from '@/lib/validation';

/** GET /api/orders — own orders only (server-verified user). */
export async function GET() {
  try {
    const user = await requireUser();
    const admin = adminClient();
    const { data: customer } = await admin.from('customers').select('id').eq('user_id', user.id).maybeSingle();
    if (!customer) return Response.json({ orders: [] });
    const { data: orders } = await admin
      .from('orders')
      .select('id,status,total,currency,created_at')
      .eq('customer_id', (customer as { id: string }).id)
      .order('created_at', { ascending: false });
    return Response.json({ orders: orders ?? [] });
  } catch (e) {
    return errResponse('Unauthorized', (e as { status?: number }).status ?? 401);
  }
}
