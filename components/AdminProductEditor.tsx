'use client';
import { useState } from 'react';
import { formatBytes } from '@/lib/format';

type FileRow = { id: string; name: string; google_drive_file_id: string; google_drive_mime_type?: string | null; file_size?: number | null };

type Product = { id: string; title: string; short_description?: string | null; description?: string | null; price: number | string; currency: string; thumbnail_url?: string | null; status: string; featured?: boolean | null };

export function AdminProductEditor({ product, files: initial }: { product: Product; files: FileRow[] }) {
  const [files, setFiles] = useState<FileRow[]>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [driveName, setDriveName] = useState('');
  const [driveId, setDriveId] = useState('');

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
      await patch({
        title: String(fd.get('title')), description: String(fd.get('description') ?? ''),
        short_description: String(fd.get('short_description') ?? ''), price: Number(fd.get('price')),
        currency: String(fd.get('currency')), thumbnail_url: String(fd.get('thumbnail_url') ?? '') || null,
        status: String(fd.get('status')), featured: fd.get('featured') === 'on',
      });
      setMsg('Saved.');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed'); }
  }

  async function addFile() {
    setMsg(null);
    try {
      const data = await patch({ action: 'addFile', name: driveName, google_drive_file_id: driveId });
      setFiles((f) => [...f, data.file]);
      setDriveName(''); setDriveId('');
      setMsg('File validated against Drive and attached.');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed'); }
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
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Price</label><input name="price" type="number" step="0.01" defaultValue={product.price} className="input" /></div>
          <div><label className="label">Currency</label><input name="currency" defaultValue={product.currency} className="input" /></div>
        </div>
        <div><label className="label">Thumbnail URL</label><input name="thumbnail_url" defaultValue={product.thumbnail_url ?? ''} className="input" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Status</label><select name="status" defaultValue={product.status} className="input"><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select></div>
          <div className="flex items-end gap-2 pb-2"><input type="checkbox" name="featured" defaultChecked={product.featured ?? false} id="feat" /><label htmlFor="feat" className="text-sm">Featured</label></div>
        </div>
        <button className="btn-primary">Save</button>
      </form>

      <div className="card">
        <p className="font-semibold">Google Drive files ({files.length})</p>
        <p className="text-xs text-zinc-500">Paste a Drive share link or file ID — the server extracts the ID and validates existence before saving. Credentials never leave the server.</p>
        <ul className="mt-3 space-y-2 text-sm">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3">
              <span>{f.name} <span className="text-zinc-400">· {f.google_drive_mime_type ?? ''} · {formatBytes(f.file_size)}</span></span>
              <button className="text-xs text-red-600 underline" onClick={() => removeFile(f.id)}>Remove</button>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input className="input" placeholder="Display name" value={driveName} onChange={(e) => setDriveName(e.target.value)} />
          <input className="input" placeholder="Drive file ID" value={driveId} onChange={(e) => setDriveId(e.target.value)} />
          <button type="button" className="btn-secondary" onClick={addFile}>Attach</button>
        </div>
      </div>

      <div className="flex justify-between">
        <span className="text-sm text-zinc-500">{msg}</span>
        <button onClick={archive} className="text-sm text-red-600 underline">Archive product</button>
      </div>
    </div>
  );
}
