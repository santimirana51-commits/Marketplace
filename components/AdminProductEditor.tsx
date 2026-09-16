'use client';
import { useState } from 'react';
import { formatBytes } from '@/lib/format';
import { parseBulkLines, MAX_BULK_FILES } from '@/lib/validation';
import { CATEGORIES } from '@/lib/categories';

type FileRow = { id: string; name: string; google_drive_file_id: string; google_drive_mime_type?: string | null; file_size?: number | null; external_url?: string | null };

type Product = { id: string; title: string; short_description?: string | null; description?: string | null; price: number | string; currency: string; thumbnail_url?: string | null; status: string; featured?: boolean | null; install_steps?: string | null; notice?: string | null; category?: string | null };

export function AdminProductEditor({ product, files: initial }: { product: Product; files: FileRow[] }) {
  const [files, setFiles] = useState<FileRow[]>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [driveName, setDriveName] = useState('');
  const [driveId, setDriveId] = useState('');
  const [bulk, setBulk] = useState('');
  const [busy, setBusy] = useState(false);

  async function patch(payload: object) {
    const res = await fetch(`/api/admin/products/${product.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed');
    return data;
  }

  async function saveBasics(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    try {
      const fd = new FormData(e.currentTarget);
      const data = await patch({
        title: String(fd.get('title')), description: String(fd.get('description') ?? ''),
        short_description: String(fd.get('short_description') ?? ''),
        install_steps: String(fd.get('install_steps') ?? ''),
        notice: String(fd.get('notice') ?? ''),
        category: String(fd.get('category') ?? 'Lainnya'),
        thumbnail_url: String(fd.get('thumbnail_url') ?? '') || null,
        status: String(fd.get('status')), featured: fd.get('featured') === 'on',
      });
      setMsg(data.warning ? `Saved. ${data.warning}` : 'Saved.');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed'); }
  }

  async function addFile() {
    setMsg(null);
    try {
      const data = await patch({ action: 'addFile', name: driveName, google_drive_file_id: driveId });
      setFiles((f) => [...f, data.file]);
      const wasUrl = !driveId.match(/^[A-Za-z0-9_-]{5,300}$/) && driveId.includes('http');
      setDriveName(''); setDriveId('');
      setMsg(wasUrl ? 'External link attached.' : 'File validated against Drive and attached.');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed'); }
  }

  async function addBulk() {
    const lines = parseBulkLines(bulk);
    if (!lines.length || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'addFiles', items: lines.map((l) => ({ name: '', google_drive_file_id: l })) }),
      });
      const data = await res.json();
      if (!res.ok && !(data.files?.length)) throw new Error(data.errors?.[0]?.error ?? data.error ?? 'Failed');
      setFiles((f) => [...f, ...(data.files ?? [])]);
      setBulk('');
      const fails = (data.errors ?? []).map((e: { line: number; error: string }) => `baris ${e.line}: ${e.error}`).join('; ');
      setMsg(`${(data.files ?? []).length} file ditambah.${fails ? ` Gagal: ${fails}` : ''}`);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  async function removeFile(id: string) {
    await patch({ action: 'removeFile', fileId: id });
    setFiles((f) => f.filter((x) => x.id !== id));
  }

  async function archive() {
    if (!confirm('Archive this product?')) return;
    await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
    window.location.href = '/admin/products';
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={saveBasics} className="card space-y-3">
        <div><label className="label">Title</label><input name="title" defaultValue={product.title} className="input" /></div>
        <div><label className="label">Short description</label><input name="short_description" defaultValue={product.short_description ?? ''} className="input" /></div>
        <div><label className="label">Description</label><textarea name="description" defaultValue={product.description ?? ''} rows={5} className="input" /></div>
        <div><label className="label">Thumbnail URL</label><input name="thumbnail_url" defaultValue={product.thumbnail_url ?? ''} className="input" /></div>
        <div><label className="label">Langkah install (satu per baris, kosongkan = default)</label><textarea name="install_steps" defaultValue={product.install_steps ?? ''} rows={4} className="input" placeholder={'Klik tombol unduh…\nPeriksa ukuran file…'} /></div>
        <div><label className="label">Catatan penting (kosongkan = default)</label><textarea name="notice" defaultValue={product.notice ?? ''} rows={3} className="input" placeholder={'Pastikan ukuran file sesuai…'} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Status</label><select name="status" defaultValue={product.status} className="input"><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select></div>
          <div><label className="label">Kategori</label><select name="category" defaultValue={product.category ?? 'Lainnya'} className="input">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <div className="flex items-end gap-2 pb-2"><input type="checkbox" name="featured" defaultChecked={product.featured ?? false} id="feat" /><label htmlFor="feat" className="text-sm">Featured</label></div>
        <button className="btn-primary">Save</button>
      </form>

      <div className="card">
        <p className="font-semibold">Google Drive files ({files.length})</p>
        <p className="text-xs text-zinc-500">Tempel link/ID Drive atau URL luar — server memilah otomatis dan memvalidasi sebelum menyimpan.</p>
        <ul className="mt-3 space-y-2 text-sm">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3">
              <span>{f.external_url ? '↗ ' : ''}{f.name} <span className="text-zinc-400">· {f.external_url ? 'link luar' : `${f.google_drive_mime_type ?? ''} · ${formatBytes(f.file_size)}`}</span></span>
              <button className="text-xs text-red-600 underline" onClick={() => removeFile(f.id)}>Remove</button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-500">Satu kolom untuk semua: link/ID Drive atau URL luar (https://…).</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input className="input" placeholder="Display name (opsional)" value={driveName} onChange={(e) => setDriveName(e.target.value)} />
          <input className="input" placeholder="Link Drive / ID / URL luar" value={driveId} onChange={(e) => setDriveId(e.target.value)} />
          <button type="button" className="btn-secondary" onClick={addFile}>Attach</button>
        </div>
        <div className="mt-3 border-t pt-3">
          <p className="text-xs font-semibold">Bulk: banyak link sekaligus (satu per baris, maks {MAX_BULK_FILES})</p>
          <textarea className="input mt-2" rows={4} placeholder={'https://drive.google.com/file/d/…\nhttps://www.mediafire.com/file/…'} value={bulk} onChange={(e) => setBulk(e.target.value)} />
          <button type="button" className="btn-download mt-2" disabled={busy || !parseBulkLines(bulk).length} onClick={addBulk}>
            {busy ? 'Menambah…' : `Attach ${parseBulkLines(bulk).length} link`}
          </button>
        </div>
      </div>

      <div className="flex justify-between">
        <span className="text-sm text-zinc-500">{msg}</span>
        <button onClick={archive} className="text-sm text-red-600 underline">Archive product</button>
      </div>
    </div>
  );
}
