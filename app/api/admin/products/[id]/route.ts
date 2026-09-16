import { requireAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { adminFileSchema, adminProductSchema, errResponse, isSafeExternalUrl, classifyAttachmentInput } from '@/lib/validation';
import { validateDriveFile, isDriveConfigured } from '@/lib/google-drive';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch (e) {
    return errResponse('Forbidden', (e as { status?: number }).status ?? 403);
  }
  const body = await req.json().catch(() => null);
  // File attach/remove actions
  if (body && typeof body === 'object' && 'action' in (body as object)) {
    const admin = adminClient();
    const b = body as { action: string; fileId?: string; name?: string; google_drive_file_id?: string; external_url?: string };
    if (b.action === 'addFile') {
      const { driveId, url } = classifyAttachmentInput(
        String(b.google_drive_file_id ?? ''), String(b.external_url ?? ''),
      );
      const parsed = adminFileSchema.safeParse({ name: b.name, google_drive_file_id: driveId, external_url: url });
      if (!parsed.success) return errResponse(parsed.error.errors[0]?.message ?? 'Invalid file input');
      // External source: no Drive involved at all.
      if (!driveId && url) {
        if (!isSafeExternalUrl(url)) return errResponse('URL luar tidak aman (hanya http/https publik)', 400);
        const { data, error } = await admin.from('product_files').insert({
          product_id: params.id, name: parsed.data.name || url,
          google_drive_file_id: '', google_drive_mime_type: null, file_size: null,
          external_url: url,
        }).select('*').single();
        if (error) return errResponse(error.message, 400);
        return Response.json({ file: data }, { status: 201 });
      }
      try {
        const meta = await validateDriveFile(parsed.data.google_drive_file_id);
        const { data, error } = await admin.from('product_files').insert({
          product_id: params.id, name: parsed.data.name || meta.name,
          google_drive_file_id: parsed.data.google_drive_file_id,
          google_drive_mime_type: meta.mimeType, file_size: meta.size ?? null,
          external_url: url || null,
        }).select('*').single();
        if (error) return errResponse(error.message, 400);
        return Response.json({ file: data }, { status: 201 });
      } catch {
        // Distinguish missing server credentials (500, admin-only) from a
        // genuinely unreadable file (404) so this is diagnosable.
        if (!isDriveConfigured()) {
          return errResponse('Server Drive credentials missing — set service-account envs', 500);
        }
        return errResponse('Drive file not found or inaccessible', 404);
      }
    }
    if (b.action === 'removeFile' && b.fileId) {
      await adminClient().from('product_files').delete().eq('id', b.fileId).eq('product_id', params.id);
      return Response.json({ ok: true });
    }
    return errResponse('Unknown action');
  }
  const parsed = adminProductSchema.partial().safeParse(body);
  if (!parsed.success) return errResponse('Invalid input');
  const { data, error } = await adminClient().from('products').update(parsed.data).eq('id', params.id).select('*').single();
  if (error) return errResponse(error.message, 400);
  return Response.json({ product: data });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch (e) {
    return errResponse('Forbidden', (e as { status?: number }).status ?? 403);
  }
  // Soft-archive instead of hard delete to preserve order history.
  await adminClient().from('products').update({ status: 'archived' }).eq('id', params.id);
  return Response.json({ ok: true });
}
