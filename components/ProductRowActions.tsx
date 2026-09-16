'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Row actions for the admin product table: edit + permanent delete. */
export function ProductRowActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm(`Hapus permanen "${title}" beserta semua filenya? Tidak bisa dibatalkan.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}?hard=1`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Gagal menghapus');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-3">
      <Link href={`/admin/products/${id}`} className="underline">Edit</Link>
      <button onClick={remove} disabled={busy} className="text-red-600 underline disabled:opacity-50">
        {busy ? '…' : 'Hapus'}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
