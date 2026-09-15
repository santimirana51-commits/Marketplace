import { adminClient } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/tokens';
import { downloadDriveFileStream } from '@/lib/google-drive';
import { log } from '@/lib/logger';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * GET /api/download/[token] — streams the purchased file.
 * The URL param is the RAW token; only its hash is looked up.
 * Never accepts a file id from the client.
 */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const raw = params.token ?? '';
  if (!rateLimit(`dl:${clientIp(req.headers)}`, 30)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }
  if (!raw || raw.length < 20 || raw.length > 200) {
    return Response.json({ error: 'Invalid download link' }, { status: 404 });
  }

  const admin = adminClient();
  const { data: rec } = await admin
    .from('download_tokens')
    .select('id,order_id,product_file_id,expires_at,download_count,max_downloads,orders!inner(status)')
    .eq('token_hash', hashToken(raw))
    .maybeSingle();

  if (!rec) return Response.json({ error: 'Invalid download link' }, { status: 404 });
  const row = rec as unknown as {
    id: string; order_id: string; product_file_id: string;
    expires_at: string; download_count: number; max_downloads: number;
    orders: { status: string } | { status: string }[];
  };
  const orderStatus = Array.isArray(row.orders) ? row.orders[0]?.status : row.orders?.status;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return Response.json({ error: 'Download link expired' }, { status: 410 });
  }
  if (orderStatus !== 'paid') {
    log('download.unpaid', {});
    return Response.json({ error: 'Order not paid' }, { status: 403 });
  }
  if (row.download_count >= row.max_downloads) {
    return Response.json({ error: 'Download limit reached' }, { status: 429 });
  }

  const { data: file } = await admin
    .from('product_files')
    .select('google_drive_file_id,name,google_drive_mime_type')
    .eq('id', row.product_file_id)
    .maybeSingle();
  if (!file) return Response.json({ error: 'File unavailable' }, { status: 410 });
  const f = file as { google_drive_file_id: string; name: string; google_drive_mime_type?: string | null };

  let stream: ReadableStream<Uint8Array>;
  let filename = f.name;
  let mime = f.google_drive_mime_type ?? 'application/octet-stream';
  try {
    const dl = await downloadDriveFileStream(f.google_drive_file_id);
    stream = dl.stream;
    filename = dl.meta.name || filename;
    mime = dl.meta.mimeType || mime;
  } catch (e) {
    const status = (e as { status?: number }).status ?? 502;
    log('download.drive_failed', {});
    return Response.json({ error: 'File temporarily unavailable' }, { status });
  }

  await admin.from('download_tokens').update({
    download_count: row.download_count + 1,
    last_downloaded_at: new Date().toISOString(),
  }).eq('id', row.id);

  const safe = filename.replace(/["\r\n]/g, '').slice(0, 200) || 'download';
  return new Response(stream, {
    headers: {
      'content-type': mime,
      'content-disposition': `attachment; filename="${safe}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
