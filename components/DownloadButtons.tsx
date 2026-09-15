'use client';
import { useEffect, useState } from 'react';
import { formatBytes } from '@/lib/format';

type Row = {
  product_file_id: string;
  name: string;
  mime?: string | null;
  size?: number | null;
  expires_at?: string;
  download_count?: number;
  max_downloads?: number;
};

export function DownloadButtons({ orderId }: { orderId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`).then((r) => r.json()).then((d) => {
      const map = new Map<string, Row>();
      for (const t of d.downloads ?? []) {
        map.set(t.product_file_id, {
          product_file_id: t.product_file_id,
          name: t.product_files?.name ?? 'File',
          mime: t.product_files?.google_drive_mime_type,
          size: t.product_files?.file_size,
          expires_at: t.expires_at, download_count: t.download_count, max_downloads: t.max_downloads,
        });
      }
      for (const t of d.links ?? []) {
        if (!map.has(t.product_file_id)) map.set(t.product_file_id, t);
      }
      setRows(Array.from(map.values()));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [orderId]);

  async function getLink(fileId: string) {
    setBusy(fileId);
    try {
      const res = await fetch('/api/account/download-link', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, productFileId: fileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      window.location.href = `/api/download/${data.token}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="mt-3 text-sm text-zinc-500">Loading…</p>;
  if (!rows.length) return <p className="mt-3 text-sm text-zinc-500">No files yet — webhook fulfills within a minute of payment.</p>;
  return (
    <div className="mt-3 space-y-2">
      {rows.map((r) => (
        <div key={r.product_file_id} className="card flex items-center justify-between">
          <div><p className="font-medium">{r.name}</p><p className="text-xs text-zinc-500">{r.mime ?? 'file'} · {formatBytes(r.size)} · {r.download_count ?? 0}/{r.max_downloads ?? 5} downloads</p></div>
          <button className="btn-primary !px-3 !py-1.5 text-xs" disabled={busy === r.product_file_id} onClick={() => getLink(r.product_file_id)}>
            {busy === r.product_file_id ? 'Preparing…' : 'Download'}
          </button>
        </div>
      ))}
    </div>
  );
}
