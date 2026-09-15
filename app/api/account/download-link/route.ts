import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { generateRawToken, hashToken, tokenExpiry, maxDownloads } from '@/lib/tokens';
import { errResponse } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const schema = z.object({ orderId: z.string().uuid(), productFileId: z.string().uuid() });

/**
 * POST /api/account/download-link — mints a fresh single raw token for a file
 * the caller owns via a PAID order. Raw token returned once, hash stored.
 */
export async function POST(req: Request) {
  if (!rateLimit(`link:${clientIp(req.headers)}`, 30)) return errResponse('Too many requests', 429);
  let user;
  try {
    user = await requireUser();
  } catch {
    return errResponse('Unauthorized', 401);
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errResponse('Invalid input');

  const admin = adminClient();
  const { data: customer } = await admin.from('customers').select('id').eq('user_id', user.id).maybeSingle();
  if (!customer) return errResponse('Not found', 404);
  const cid = (customer as { id: string }).id;

  // Ownership: paid order containing the product that owns this file.
  const { data: file } = await admin.from('product_files').select('id,product_id').eq('id', parsed.data.productFileId).maybeSingle();
  if (!file) return errResponse('Not found', 404);
  const pid = (file as { product_id: string }).product_id;
  const { data: order } = await admin.from('orders').select('id').eq('id', parsed.data.orderId).eq('customer_id', cid).eq('status', 'paid').maybeSingle();
  if (!order) return errResponse('Not found', 403);
  const { data: item } = await admin.from('order_items').select('id').eq('order_id', parsed.data.orderId).eq('product_id', pid).maybeSingle();
  if (!item) return errResponse('Not purchased', 403);

  const raw = generateRawToken();
  const { error } = await admin.from('download_tokens').insert({
    order_id: parsed.data.orderId,
    order_item_id: (item as { id: string }).id,
    product_file_id: parsed.data.productFileId,
    customer_id: cid,
    token_hash: hashToken(raw),
    expires_at: tokenExpiry().toISOString(),
    max_downloads: maxDownloads(),
  });
  if (error) return errResponse('Could not create link', 500);
  return Response.json({ token: raw });
}

/** GET /api/account/download-link?orderId=… — list owned files for the order. */
export async function GET(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return errResponse('Unauthorized', 401);
  }
  const orderId = new URL(req.url).searchParams.get('orderId');
  if (!orderId) return errResponse('Missing orderId');
  const admin = adminClient();
  const { data: customer } = await admin.from('customers').select('id').eq('user_id', user.id).maybeSingle();
  if (!customer) return errResponse('Not found', 404);
  const cid = (customer as { id: string }).id;
  const { data: order } = await admin.from('orders').select('id').eq('id', orderId).eq('customer_id', cid).eq('status', 'paid').maybeSingle();
  if (!order) return errResponse('Not found', 404);
  const { data: items } = await admin.from('order_items').select('product_id').eq('order_id', orderId);
  const pids = (items ?? []).map((i) => (i as { product_id: string }).product_id);
  if (!pids.length) return Response.json({ links: [] });
  const { data: files } = await admin.from('product_files').select('id,name,google_drive_mime_type,file_size').in('product_id', pids);
  return Response.json({
    links: (files ?? []).map((f) => {
      const ff = f as { id: string; name: string; google_drive_mime_type?: string | null; file_size?: number | null };
      return { product_file_id: ff.id, name: ff.name, mime: ff.google_drive_mime_type, size: ff.file_size };
    }),
  });
}
