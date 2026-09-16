'use client';
import { useState } from 'react';
import { CONTENT_DEFAULTS } from '@/lib/content';

const GROUPS: { title: string; keys: { key: string; label: string; rows?: number }[] }[] = [
  {
    title: 'Hero',
    keys: [
      { key: 'hero_title_a', label: 'Judul baris 1' },
      { key: 'hero_title_b', label: 'Judul baris 2 (gradasi)' },
      { key: 'hero_sub', label: 'Sub-judul', rows: 2 },
      { key: 'hero_placeholder', label: 'Placeholder search' },
    ],
  },
  {
    title: 'Judul section',
    keys: [
      { key: 'sec_categories', label: 'Kategori' },
      { key: 'sec_featured', label: 'Unggulan' },
      { key: 'sec_latest', label: 'Baru diunggah' },
      { key: 'sec_how_kicker', label: 'Kicker cara kerja' },
      { key: 'sec_how_title', label: 'Judul cara kerja' },
      { key: 'sec_why', label: 'Kenapa Pixelbay' },
      { key: 'sec_faq', label: 'FAQ' },
      { key: 'view_all', label: 'Link "lihat semua"' },
    ],
  },
  {
    title: 'Cara kerja (satu per baris: Judul | teks)',
    keys: [{ key: 'steps_text', label: 'Langkah-langkah', rows: 5 }],
  },
  {
    title: 'Fitur (satu per baris: ikon | Judul | teks)',
    keys: [{ key: 'features_text', label: 'Fitur', rows: 5 }],
  },
  {
    title: 'FAQ (satu per baris: Pertanyaan ||| Jawaban)',
    keys: [{ key: 'faqs_text', label: 'FAQ', rows: 8 }],
  },
  {
    title: 'CTA bawah',
    keys: [
      { key: 'cta_title', label: 'CTA judul' },
      { key: 'cta_sub', label: 'CTA sub' },
      { key: 'cta_btn', label: 'CTA tombol' },
    ],
  },
];

export function LandingEditor({ initial }: { initial: Record<string, string> }) {
  const [vals, setVals] = useState<Record<string, string>>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(k: string, v: string) {
    setVals((p) => ({ ...p, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ values: vals }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan');
      setMsg(`Tersimpan (${data.saved} field). Kosongkan field untuk kembali ke default.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-6 space-y-6">
      {GROUPS.map((g) => (
        <div key={g.title} className="card">
          <p className="font-bold">{g.title}</p>
          <div className="mt-3 space-y-3">
            {g.keys.map(({ key, label, rows }) => (
              <div key={key}>
                <label className="label">{label} <span className="font-normal text-zinc-400">(default: {(CONTENT_DEFAULTS[key] ?? '').slice(0, 60)}…)</span></label>
                {rows ? (
                  <textarea name={key} rows={rows} value={vals[key] ?? ''} onChange={(e) => set(key, e.target.value)} className="input font-mono text-xs" placeholder="Kosongkan = pakai default" />
                ) : (
                  <input name={key} value={vals[key] ?? ''} onChange={(e) => set(key, e.target.value)} className="input" placeholder="Kosongkan = pakai default" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan landing'}</button>
        {msg ? <span className="text-sm text-zinc-600">{msg}</span> : null}
      </div>
    </form>
  );
}
