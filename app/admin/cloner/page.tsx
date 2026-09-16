'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type CloneMode = 'audit' | 'mirror' | 'assets';

const modeCopy: Record<CloneMode, { label: string; description: string }> = {
  audit: { label: 'Audit struktur', description: 'Susun crawl plan untuk halaman, link internal, dan asset yang terdeteksi.' },
  mirror: { label: 'Mirror offline', description: 'Siapkan struktur mirror untuk situs yang Anda miliki atau berikan izinnya.' },
  assets: { label: 'Extract assets', description: 'Fokuskan rencana pada gambar, CSS, JavaScript, dan font.' },
};

export default function WebsiteClonerPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<CloneMode>('audit');
  const [depth, setDepth] = useState(2);
  const [delay, setDelay] = useState(1);
  const [robots, setRobots] = useState(true);
  const [sameDomain, setSameDomain] = useState(true);
  const [assets, setAssets] = useState(true);
  const [downloadLinks, setDownloadLinks] = useState(true);
  const [batch, setBatch] = useState('');
  const [planReady, setPlanReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [implementing, setImplementing] = useState(false);

  const normalizedUrl = useMemo(() => {
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed : null;
    } catch {
      return null;
    }
  }, [url]);

  const batchCount = batch.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;

  function createPlan() {
    setPlanReady(false);
    setError(null);
    if (!normalizedUrl) {
      setError('Masukkan URL http(s) yang valid.');
      return;
    }
    if (depth < 1 || depth > 10) {
      setError('Depth harus antara 1 dan 10.');
      return;
    }
    setPlanReady(true);
  }

  async function implementAsDraft() {
    if (!normalizedUrl || implementing) return;
    setImplementing(true);
    setError(null);
    try {
      const plan = `Target: ${normalizedUrl.href}
Workflow: ${modeCopy[mode].label}
Depth: ${depth}
Delay: ${delay}s
Respect robots.txt: ${robots}
Same domain only: ${sameDomain}
Include assets: ${assets}
Clone download links: ${downloadLinks}
Batch targets: ${batchCount}`;
      const aiResponse = await fetch('/api/admin/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: `Create a concise digital product draft from this authorized website clone plan. The product represents an offline website archive or asset pack. Do not claim the site was downloaded if it was not. Return title, short_description, description, install_steps, notice, category, and suggested_thumbnail_url only.\n\n${plan}` }),
      });
      const aiData = await aiResponse.json();
      if (!aiResponse.ok) throw new Error(aiData.error ?? 'AI draft generation failed');
      const product = aiData.product ?? {};
      const title = String(product.title ?? `${modeCopy[mode].label} ${normalizedUrl.hostname}`);
      const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160) || 'website-archive'}-${Date.now().toString(36)}`;
      const createResponse = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          short_description: String(product.short_description ?? `Authorized ${modeCopy[mode].label.toLowerCase()} for ${normalizedUrl.hostname}.`),
          description: String(product.description ?? `Clone plan for ${normalizedUrl.href}.\n\n${plan}`),
          install_steps: String(product.install_steps ?? 'Review the archive contents.\nFollow the included offline usage notes.'),
          notice: String(product.notice ?? 'Use only with permission from the website owner. Review copyright and terms before publishing.'),
          category: String(product.category ?? 'Lainnya'),
          thumbnail_url: typeof product.suggested_thumbnail_url === 'string' && /^https?:\/\//.test(product.suggested_thumbnail_url) ? product.suggested_thumbnail_url : undefined,
          status: 'draft',
          featured: false,
        }),
      });
      const created = await createResponse.json();
      if (!createResponse.ok) throw new Error(created.error ?? 'Product creation failed');
      router.push(`/admin/products/${created.product.id}`);
    } catch (implementationError) {
      setError(implementationError instanceof Error ? implementationError.message : 'Failed to implement product draft.');
    } finally {
      setImplementing(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Admin tool</p>
          <h1 className="mt-1 text-3xl font-bold">Website Cloner</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">Rencanakan audit, mirror offline, dan ekstraksi asset untuk website yang Anda miliki atau berikan izinnya.</p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Authorized use only</span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="card space-y-5">
          <div>
            <label className="label" htmlFor="clone-url">Target URL</label>
            <input id="clone-url" className="input" type="url" placeholder="https://website-anda.com" value={url} onChange={(event) => setUrl(event.target.value)} />
            <p className="mt-1 text-xs text-zinc-500">Gunakan hanya untuk situs sendiri atau situs yang Anda punya izin untuk arsipkan.</p>
          </div>

          <div>
            <p className="label">Workflow</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(modeCopy) as CloneMode[]).map((value) => (
                <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-xl border p-3 text-left ${mode === value ? 'border-brand-600 bg-brand-50' : 'border-zinc-200 hover:bg-zinc-50'}`}>
                  <span className="block text-sm font-bold">{modeCopy[value].label}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{modeCopy[value].description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="clone-depth">Crawl depth: {depth}</label>
              <input id="clone-depth" className="w-full accent-brand-600" type="range" min="1" max="10" value={depth} onChange={(event) => setDepth(Number(event.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="clone-delay">Delay antar request: {delay}s</label>
              <input id="clone-delay" className="w-full accent-brand-600" type="range" min="0" max="10" value={delay} onChange={(event) => setDelay(Number(event.target.value))} />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={robots} onChange={(event) => setRobots(event.target.checked)} /> Hormati robots.txt</label>
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={sameDomain} onChange={(event) => setSameDomain(event.target.checked)} /> Batasi domain yang sama</label>
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={assets} onChange={(event) => setAssets(event.target.checked)} /> Sertakan asset</label>
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={downloadLinks} onChange={(event) => setDownloadLinks(event.target.checked)} /> Clone link download</label>
          </div>

          <div>
            <label className="label" htmlFor="clone-batch">Batch URL (opsional, satu per baris)</label>
            <textarea id="clone-batch" className="input" rows={4} placeholder={'https://site-anda.com\nhttps://docs.site-anda.com'} value={batch} onChange={(event) => setBatch(event.target.value)} />
            <p className="mt-1 text-xs text-zinc-500">{batchCount} URL tambahan terdeteksi.</p>
          </div>

          <button type="button" className="btn-primary" onClick={createPlan}>Buat clone plan</button>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>

        <aside className="space-y-4">
          <div className="card">
            <h2 className="font-bold">Pipeline</h2>
            <ol className="mt-3 space-y-3 text-sm text-zinc-600">
              <li><strong className="text-zinc-900">01.</strong> Validasi URL dan izin</li>
              <li><strong className="text-zinc-900">02.</strong> Crawl dengan depth dan delay</li>
              <li><strong className="text-zinc-900">03.</strong> Extract HTML dan asset</li>
              <li><strong className="text-zinc-900">04.</strong> Rewrite link untuk offline</li>
              <li><strong className="text-zinc-900">05.</strong> Export directory atau ZIP</li>
            </ol>
          </div>
          <div className="card border-amber-200 bg-amber-50">
            <p className="text-sm font-bold text-amber-900">Batas aman</p>
            <p className="mt-1 text-xs leading-5 text-amber-800">Jangan gunakan untuk menyalin konten berhak cipta, melewati proteksi, atau membebani server. Proxy rotation dan bypass robots sengaja tidak tersedia di panel ini.</p>
          </div>
        </aside>
      </div>

      {planReady && normalizedUrl && <section className="card mt-6 border-green-200 bg-green-50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-widest text-green-700">Plan ready</p><h2 className="mt-1 text-xl font-bold text-green-900">{modeCopy[mode].label}</h2><p className="mt-1 text-sm text-green-800">{normalizedUrl.origin} · depth {depth} · delay {delay}s · {batchCount + 1} target</p></div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-green-700">Preview only</span>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs leading-6 text-green-300">{`website-cloner ${mode} "${normalizedUrl.href}" --depth ${depth} --delay ${delay}${robots ? ' --robots' : ''}${sameDomain ? ' --same-domain' : ''}${assets ? ' --assets' : ''}${downloadLinks ? ' --download-links' : ''}`}</pre>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary !bg-green-700 hover:!bg-green-800" onClick={implementAsDraft} disabled={implementing}>{implementing ? 'AI membuat draft...' : 'Implementasikan sebagai produk baru'}</button>
          <p className="text-xs text-green-800">AI membuat metadata draft; review di editor sebelum publish.</p>
        </div>
        <p className="mt-3 text-xs text-green-800">Plan ini belum mengunduh data. Worker/CLI terisolasi tetap diperlukan untuk membuat arsip aktual.</p>
      </section>}
    </div>
  );
}
