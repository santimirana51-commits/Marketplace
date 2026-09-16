import { requireAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { adminFileSchema, adminProductSchema, errResponse, isSafeExternalUrl, classifyAttachmentInput, MAX_BULK_FILES } from '@/lib/validation';
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
    const b = body as { action: string; fileId?: string; name?: string; google_drive_file_id?: string; external_url?: string; items?: { name?: string; google_drive_file_id?: string; external_url?: string }[] };
    // Bulk attach: many links at once, per-line results (cap enforced).
    if (b.action === 'addFiles' && Array.isArray(b.items)) {
      const raws = b.items.slice(0, MAX_BULK_FILES);
      if (!raws.length) return errResponse('Tidak ada link');
      const files: unknown[] = [];
      const errors: { line: number; error: string }[] = [];
      for (let idx = 0; idx < raws.length; idx++) {
        const r = raws[idx] ?? {};
        const { driveId, url } = classifyAttachmentInput(
          String(r.google_drive_file_id ?? ''), String(r.external_url ?? ''),
        );
        const parsed = adminFileSchema.safeParse({ name: r.name, google_drive_file_id: driveId, external_url: url });
        if (!parsed.success) {
          errors.push({ line: idx + 1, error: parsed.error.errors[0]?.message ?? 'Invalid input' });
          continue;
        }
        try {
          if (!driveId && url) {
            if (!isSafeExternalUrl(url)) throw new Error('URL luar tidak aman (hanya http/https publik)');
            const ins = await admin.from('product_files').insert({
              product_id: params.id, name: parsed.data.name || url,
              google_drive_file_id: '', external_url: url,
            }).select('*').single();
            if (ins.error) throw new Error(ins.error.message);
            files.push(ins.data);
          } else {
            const meta = await validateDriveFile(driveId);
            const ins = await admin.from('product_files').insert({
              product_id: params.id, name: parsed.data.name || meta.name,
              google_drive_file_id: driveId,
              google_drive_mime_type: meta.mimeType, file_size: meta.size ?? null,
              external_url: url || null,
            }).select('*').single();
            if (ins.error) throw new Error(ins.error.message);
            files.push(ins.data);
          }
        } catch (e) {
          if (!isDriveConfigured() && driveId) {
            errors.push({ line: idx + 1, error: 'Server Drive credentials missing' });
          } else {
            errors.push({ line: idx + 1, error: e instanceof Error ? e.message : 'Failed' });
          }
        }
      }
      return Response.json({ files, errors }, { status: files.length ? 201 : 400 });
    }
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
  const adminDb = adminClient();
  const attempt = await adminDb.from('products').update(parsed.data).eq('id', params.id).select('*').single();
  if (!attempt.error) return Response.json({ product: attempt.data });
  // Pre-0007 databases lack install_steps/notice — save the rest instead.
  if (/install_steps|notice|category/.test(attempt.error.message ?? '')) {
    const { install_steps: _a, notice: _b, category: _c, ...legacy } = parsed.data as Record<string, unknown>;
    const retry = await adminDb.from('products').update(legacy).eq('id', params.id).select('*').single();
    if (!retry.error) {
      return Response.json({ product: retry.data, warning: 'Kolom install/notice belum ada — jalankan migrasi 0007' });
    }
  }
  return errResponse(attempt.error.message, 400);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch (e) {
    return errResponse('Forbidden', (e as { status?: number }).status ?? 403);
  }
  const hard = new URL(req.url).searchParams.get('hard') === '1';
  const admin = adminClient();
  if (hard) {
    // Permanent: product_files rows follow via ON DELETE CASCADE.
    const { error } = await admin.from('products').delete().eq('id', params.id);
    if (error) return errResponse(error.message, 400);
    return Response.json({ ok: true, deleted: true });
  }
  // Default: soft-archive (reversible via edit page).
  await admin.from('products').update({ status: 'archived' }).eq('id', params.id);
  return Response.json({ ok: true });
}
