'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewProductPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get('title')),
      slug: String(fd.get('slug')),
      description: String(fd.get('description') ?? ''),
      short_description: String(fd.get('short_description') ?? ''),
      thumbnail_url: String(fd.get('thumbnail_url') ?? '') || undefined,
      install_steps: String(fd.get('install_steps') ?? ''),
      notice: String(fd.get('notice') ?? ''),
      status: String(fd.get('status') ?? 'draft'),
      featured: fd.get('featured') === 'on',
    };
    const res = await fetch('/api/admin/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed');
      setLoading(false);
      return;
    }
    router.push(`/admin/products/${data.product.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">New product</h1>
      <form onSubmit={submit} className="card mt-6 space-y-3">
        <div><label className="label">Title</label><input name="title" required className="input" /></div>
        <div><label className="label">Slug</label><input name="slug" required pattern="[a-z0-9-]+" className="input" placeholder="my-template" /></div>
        <div><label className="label">Short description</label><input name="short_description" className="input" /></div>
        <div><label className="label">Description</label><textarea name="description" rows={5} className="input" /></div>
        <div><label className="label">Thumbnail URL</label><input name="thumbnail_url" className="input" placeholder="https://…" /></div>
        <div><label className="label">Langkah install (satu per baris, opsional)</label><textarea name="install_steps" rows={4} className="input" /></div>
        <div><label className="label">Catatan penting (opsional)</label><textarea name="notice" rows={3} className="input" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Status</label><select name="status" className="input"><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select></div>
          <div className="flex items-end gap-2 pb-2"><input type="checkbox" name="featured" id="f" /><label htmlFor="f" className="text-sm">Featured</label></div>
        </div>
        <button className="btn-primary w-full" disabled={loading}>{loading ? 'Saving…' : 'Create'}</button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </div>
  );
}
