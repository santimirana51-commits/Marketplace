'use client';
import { useState, useRef, useCallback } from 'react';
import { formatBytes } from '@/lib/format';
import { parseBulkLines, MAX_BULK_FILES } from '@/lib/validation';
import { CATEGORIES } from '@/lib/categories';

type FileRow = { id: string; name: string; google_drive_file_id: string; google_drive_mime_type?: string | null; file_size?: number | null; external_url?: string | null };

type Product = { id: string; title: string; short_description?: string | null; description?: string | null; price: number | string; currency: string; thumbnail_url?: string | null; status: string; featured?: boolean | null; install_steps?: string | null; notice?: string | null; category?: string | null };

type AIProductData = {
  title?: string;
  short_description?: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  install_steps?: string;
  notice?: string;
  suggested_thumbnail_url?: string;
  tags?: string[];
};

export function AdminProductEditor({ product, files: initial }: { product: Product; files: FileRow[] }) {
  const [files, setFiles] = useState<FileRow[]>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [driveName, setDriveName] = useState('');
  const [driveId, setDriveId] = useState('');
  const [bulk, setBulk] = useState('');
  const [busy, setBusy] = useState(false);
  
  // AI Assistant state
  const [aiText, setAiText] = useState('');
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<AIProductData | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function processAI() {
    if ((!aiText.trim() && !aiImage) || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    setAiResult(null);
    
    try {
      const formData = new FormData();
      if (aiText.trim()) formData.append('text', aiText.trim());
      if (aiImage) formData.append('image', aiImage);
      
      const res = await fetch('/api/admin/ai', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI processing failed');
      
      setAiResult(data.product);
      setMsg('AI analysis complete. Review and apply changes below.');
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to process');
    } finally {
      setAiBusy(false);
    }
  }

  function applyAIResult() {
    if (!aiResult) return;
    // The form uses defaultValue, so we need to update the form fields directly
    // We'll dispatch a custom event that the form can listen to, or use a different approach
    // For now, we'll update the product state by triggering a re-render with new defaultValues
    // Since we can't easily update defaultValue, we'll show the AI result for manual copy
    setMsg('AI suggestions ready. Copy values to form fields above.');
  }

  function handleImagePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            setAiImage(base64);
            setAiImagePreview(base64);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }

  function handleImageDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setAiImage(base64);
        setAiImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function clearImage() {
    setAiImage(null);
    setAiImagePreview(null);
    fileInputRef.current && (fileInputRef.current.value = '');
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
          <div><label className="label">Kategori (pilih atau ketik baru)</label><input name="category" defaultValue={product.category ?? 'Lainnya'} list="cat-list" maxLength={50} className="input" /><datalist id="cat-list">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist></div>
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

      <div className="card border-brand-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🤖</span>
          <h3 className="font-semibold text-brand-700">AI Assistant (Free - Groq Llama 3)</h3>
        </div>
        <p className="text-xs text-zinc-500 mb-3">Tempel teks deskripsi produk atau upload gambar — AI akan mengekstrak info & mengisi otomatis field di atas.</p>
        
        <div className="space-y-3">
          <div>
            <label className="label">Teks Produk (deskripsi, spesifikasi, dll)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Contoh: Jual Laptop Gaming ASUS ROG Strix G15, Ryzen 7, RTX 3060, 16GB RAM, 512GB SSD, Harga 15.000.000..."
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              onPaste={handleImagePaste}
            />
          </div>

          <div className="relative">
            <label className="label">Gambar Produk (drag & drop atau klik)</label>
            <div
              className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center hover:border-brand-400 transition-colors"
              onDrop={handleImageDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const base64 = reader.result as string;
                      setAiImage(base64);
                      setAiImagePreview(base64);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {aiImagePreview ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={aiImagePreview} alt="Preview" className="max-h-40 rounded" />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                    onClick={(e) => { e.stopPropagation(); clearImage(); }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-lg">📷</span>
                  <p className="text-zinc-500">Klik atau tarik gambar ke sini</p>
                  <p className="text-xs text-zinc-400">Paste (Ctrl+V) juga bisa di area teks di atas</p>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="btn-primary w-full"
            onClick={processAI}
            disabled={aiBusy || (!aiText.trim() && !aiImage)}
          >
            {aiBusy ? 'Menganalisis...' : 'Analisis & Ekstrak Info'}
          </button>

          {aiError && <p className="text-sm text-red-600">Error: {aiError}</p>}

          {aiResult && (
            <div className="border-t pt-3 space-y-2">
              <p className="font-semibold text-green-700">✅ Hasil AI — Salin ke form di atas:</p>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                {aiResult.title && <div className="p-2 bg-zinc-50 rounded"><strong>Title:</strong> {aiResult.title}</div>}
                {aiResult.short_description && <div className="p-2 bg-zinc-50 rounded"><strong>Short Desc:</strong> {aiResult.short_description}</div>}
                {aiResult.description && <div className="p-2 bg-zinc-50 rounded"><strong>Description:</strong> {aiResult.description}</div>}
                {aiResult.price && <div className="p-2 bg-zinc-50 rounded"><strong>Price:</strong> {aiResult.price.toLocaleString('id-ID')} {aiResult.currency ?? 'IDR'}</div>}
                {aiResult.category && <div className="p-2 bg-zinc-50 rounded"><strong>Category:</strong> {aiResult.category}</div>}
                {aiResult.install_steps && <div className="p-2 bg-zinc-50 rounded"><strong>Install Steps:</strong> {aiResult.install_steps}</div>}
                {aiResult.notice && <div className="p-2 bg-zinc-50 rounded"><strong>Notice:</strong> {aiResult.notice}</div>}
                {aiResult.suggested_thumbnail_url && <div className="p-2 bg-zinc-50 rounded"><strong>Thumbnail:</strong> {aiResult.suggested_thumbnail_url}</div>}
                {aiResult.tags?.length && <div className="p-2 bg-zinc-50 rounded"><strong>Tags:</strong> {aiResult.tags.join(', ')}</div>}
              </div>
              <button type="button" className="btn-secondary text-sm" onClick={applyAIResult}>
                Sudah Disalin Manual
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <span className="text-sm text-zinc-500">{msg}</span>
        <button onClick={archive} className="text-sm text-red-600 underline">Archive product</button>
      </div>
    </div>
  );
}
