import { adminClient } from '@/lib/supabase/admin';
import { downloadDriveFileStream } from '@/lib/google-drive';
import { isSafeExternalUrl } from '@/lib/validation';
import { log } from '@/lib/logger';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * GET /api/files/[id]/download — PUBLIC download (portal mode).
 * No login, no cart, no payment. The id must resolve via DB to a file of
 * a PUBLISHED product; arbitrary Drive ids are never accepted.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!rateLimit(`pub:${clientIp(req.headers)}`, 30)) {
    return Response.json({ error: 'Terlalu banyak permintaan, coba lagi sebentar.' }, { status: 429 });
  }
  const id = params.id ?? '';
  if (!id || id.length > 100) {
    return Response.json({ error: 'File tidak ditemukan' }, { status: 404 });
  }

  const admin = adminClient();
  const first = await admin
    .from('product_files')
    .select('id,name,google_drive_file_id,google_drive_mime_type,downloads,external_url,products!inner(status)')
    .eq('id', id)
    .maybeSingle();
  // Pre-0005/0006 databases lack the new columns — retry without them.
  const file = first.data ?? (await admin
    .from('product_files')
    .select('id,name,google_drive_mime_type,file_size,products!inner(status)')
    .eq('id', id)
    .maybeSingle()).data;
  if (!file) return Response.json({ error: 'File tidak ditemukan' }, { status: 404 });
  const f = file as {
    id: string; name: string; google_drive_file_id?: string | null;
    google_drive_mime_type?: string | null; downloads?: number | null;
    external_url?: string | null;
    products: { status: string } | { status: string }[];
  };
  const status = Array.isArray(f.products) ? f.products[0]?.status : f.products?.status;
  if (status !== 'published') return Response.json({ error: 'File tidak ditemukan' }, { status: 404 });

  // External source: count the click, then hand off (never proxy).
  if (f.external_url && isSafeExternalUrl(f.external_url)) {
    await admin
      .from('product_files')
      .update({ downloads: (f.downloads ?? 0) + 1 })
      .eq('id', f.id)
      .then(
        () => {},
        () => log('download.counter_failed', {}),
      );
    return Response.redirect(f.external_url.trim(), 302);
  }

  if (!f.google_drive_file_id) {
    return Response.json({ error: 'File tidak ditemukan' }, { status: 404 });
  }

  let stream: ReadableStream<Uint8Array>;
  let filename = f.name;
  let mime = f.google_drive_mime_type ?? 'application/octet-stream';
  try {
    const dl = await downloadDriveFileStream(f.google_drive_file_id);
    stream = dl.stream;
    filename = dl.meta.name || filename;
    mime = dl.meta.mimeType || mime;
  } catch (e) {
    const statusCode = (e as { status?: number }).status ?? 502;
    log('download.drive_failed', {});
    return Response.json({ error: 'File sementara tidak tersedia' }, { status: statusCode });
  }

  // Best-effort counter (column added by 0005; older DBs just skip it).
  await admin
    .from('product_files')
    .update({ downloads: (f.downloads ?? 0) + 1 })
    .eq('id', f.id)
    .then(
      () => {},
      () => log('download.counter_failed', {}),
    );

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
