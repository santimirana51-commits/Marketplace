import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { errResponse } from '@/lib/validation';

/** GET /api/orders/[id] — ownership verified server-side via customers.user_id. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const admin = adminClient();
    const { data: customer } = await admin.from('customers').select('id').eq('user_id', user.id).maybeSingle();
    if (!customer) return errResponse('Not found', 404);
    const cid = (customer as { id: string }).id;
    const { data: order } = await admin.from('orders').select('*').eq('id', params.id).eq('customer_id', cid).maybeSingle();
    if (!order) return errResponse('Not found', 404);
    const { data: items } = await admin.from('order_items').select('*').eq('order_id', params.id);
    const { data: tokens } = await admin
      .from('download_tokens')
      .select('id,order_item_id,product_file_id,expires_at,download_count,max_downloads,last_downloaded_at,product_files(name,google_drive_mime_type,file_size)')
      .eq('order_id', params.id)
      .eq('customer_id', cid);
    return Response.json({ order, items: items ?? [], downloads: tokens ?? [] });
  } catch (e) {
    return errResponse('Unauthorized', (e as { status?: number }).status ?? 401);
  }
}
