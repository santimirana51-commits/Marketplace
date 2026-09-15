import { requireAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { adminFileSchema, adminProductSchema, errResponse } from '@/lib/validation';
import { validateDriveFile } from '@/lib/google-drive';

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
    const b = body as { action: string; fileId?: string; name?: string; google_drive_file_id?: string };
    if (b.action === 'addFile') {
      const parsed = adminFileSchema.safeParse({ name: b.name, google_drive_file_id: b.google_drive_file_id });
      if (!parsed.success) return errResponse('Invalid file input');
      try {
        const meta = await validateDriveFile(parsed.data.google_drive_file_id);
        const { data, error } = await admin.from('product_files').insert({
          product_id: params.id, name: parsed.data.name || meta.name,
          google_drive_file_id: parsed.data.google_drive_file_id,
          google_drive_mime_type: meta.mimeType, file_size: meta.size ?? null,
        }).select('*').single();
        if (error) return errResponse(error.message, 400);
        return Response.json({ file: data }, { status: 201 });
      } catch {
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
