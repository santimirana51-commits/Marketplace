'use client';
import { useState } from 'react';
import { CONTENT_DEFAULTS, parsePipedList, parseFaqList, type Step, type Feature, type Faq } from '@/lib/content';

/** Live preview mirroring the homepage sections (simplified). */
function Preview({ vals }: { vals: Record<string, string> }) {
  const shown = (k: string) => {
    const v = (vals[k] ?? '').trim();
    return v || CONTENT_DEFAULTS[k] || '';
  };
  const steps = parsePipedList<Step>(shown('steps_text'), 'steps');
  const feats = parsePipedList<Feature>(shown('features_text'), 'features');
  const faqs = parseFaqList(shown('faqs_text'));
  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <p className="border-b bg-zinc-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Pratinjau live</p>
      <div className="space-y-6 p-4">
        <div className="text-center">
          <p className="text-xl font-extrabold tracking-tight">
            {shown('hero_title_a')}{' '}
            <span className="bg-gradient-to-r from-brand-600 to-green-600 bg-clip-text text-transparent">{shown('hero_title_b')}</span>
          </p>
          <p className="mt-1 text-xs text-zinc-600">{shown('hero_sub')}</p>
          <div className="mx-auto mt-3 flex max-w-xs items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-zinc-400">
            <span className="flex-1 text-left">{shown('hero_placeholder')}</span>
            <span className="rounded-full bg-brand-600 px-2.5 py-1 font-bold text-white">Cari</span>
          </div>
        </div>
        <div>
          <p className="font-bold">{shown('sec_categories')}</p>
          <p className="font-bold">{shown('sec_featured')}</p>
          <p className="font-bold">{shown('sec_latest')}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-green-600">{shown('sec_how_kicker')}</p>
          <p className="font-extrabold">{shown('sec_how_title')}</p>
          <div className="mt-2 space-y-2">
            {steps.map((s) => (
              <div key={s.n} className="rounded-xl bg-zinc-950 p-3 text-white">
                <p className="text-sm font-bold">{s.n}. {s.title}</p>
                <p className="text-xs text-zinc-300">{s.text}</p>
              </div>
            ))}
            {!steps.length ? <p className="text-xs text-red-500">Format salah — pakai “Judul | teks” per baris.</p> : null}
          </div>
        </div>
        <div>
          <p className="font-extrabold">{shown('sec_why')}</p>
          <div className="mt-2 space-y-2">
            {feats.map((f) => (
              <div key={f.title} className="rounded-xl border p-3">
                <p className="text-sm font-bold">{f.icon} {f.title}</p>
                <p className="text-xs text-zinc-600">{f.text}</p>
              </div>
            ))}
            {!feats.length ? <p className="text-xs text-red-500">Format salah — pakai “ikon | Judul | teks”.</p> : null}
          </div>
        </div>
        <div>
          <p className="font-extrabold">{shown('sec_faq')}</p>
          <div className="mt-2 space-y-2">
            {faqs.map((f) => (
              <details key={f.q} className="rounded-xl border">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">{f.q}</summary>
                <p className="px-3 pb-3 text-xs text-zinc-600">{f.a}</p>
              </details>
            ))}
            {!faqs.length ? <p className="text-xs text-red-500">Format salah — pakai “Pertanyaan ||| Jawaban”.</p> : null}
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-brand-700 to-green-700 p-4 text-white">
          <p className="font-bold">{shown('cta_title')}</p>
          <p className="text-xs text-white/80">{shown('cta_sub')}</p>
          <p className="mt-2 inline-block rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-green-700">{shown('cta_btn')}</p>
        </div>
      </div>
    </div>
  );
}

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
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
    <form onSubmit={save} className="space-y-6">
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
    <div className="xl:sticky xl:top-24">
      <Preview vals={vals} />
    </div>
    </div>
  );
}
