'use client';

import { DragEvent, useEffect, useRef, useState } from 'react';
import ImageTracer from 'imagetracerjs';

type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';
type Mode = 'raster' | 'vector';
type Result = { name: string; url: string; size: number };

const FORMATS: Record<OutputFormat, string> = { 'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/webp': 'WebP' };
const extensionFor = (format: OutputFormat) => format === 'image/jpeg' ? 'jpg' : format.split('/')[1];
const stem = (name: string) => name.replace(/\.[^.]+$/, '');
const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export function ImageConverter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('vector');
  const [format, setFormat] = useState<OutputFormat>('image/webp');
  const [quality, setQuality] = useState(0.85);
  const [maxWidth, setMaxWidth] = useState('');
  const [tolerance, setTolerance] = useState(1);
  const [smoothing, setSmoothing] = useState(1);
  const [colorCount, setColorCount] = useState(16);
  const [simplify, setSimplify] = useState(8);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    results.forEach((result) => URL.revokeObjectURL(result.url));
  }, [previewUrl, results]);

  function selectFiles(nextFiles: FileList | File[]) {
    const images = Array.from(nextFiles).filter((file) => file.type.startsWith('image/'));
    if (!images.length) { setError('Pilih minimal satu file gambar yang valid.'); return; }
    results.forEach((result) => URL.revokeObjectURL(result.url));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFiles(images);
    setPreviewUrl(URL.createObjectURL(images[0]));
    setResults([]);
    setError(null);
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    selectFiles(event.dataTransfer.files);
  }

  function loadImage(file: File) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name} tidak dapat dibaca.`)); };
      image.src = url;
    });
  }

  async function traceFile(file: File): Promise<Result> {
    const image = await loadImage(file);
    const requestedWidth = Number(maxWidth);
    const width = requestedWidth > 0 ? Math.min(requestedWidth, image.naturalWidth) : image.naturalWidth;
    const height = Math.max(1, Math.round(image.naturalHeight * (width / image.naturalWidth)));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Browser tidak mendukung canvas.');
    context.drawImage(image, 0, 0, width, height);
    const svg = ImageTracer.imagedataToSVG(context.getImageData(0, 0, width, height), {
      ltres: tolerance, qtres: smoothing, pathomit: simplify,
      numberofcolors: colorCount, colorsampling: 2, blurradius: 0,
      blurdelta: 20, strokewidth: 0, roundcoords: 2, linefilter: true,
    });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    return { name: `${stem(file.name)}.svg`, url: URL.createObjectURL(blob), size: blob.size };
  }

  async function convertRaster(file: File): Promise<Result> {
    const image = await loadImage(file);
    const requestedWidth = Number(maxWidth);
    const width = requestedWidth > 0 ? Math.min(requestedWidth, image.naturalWidth) : image.naturalWidth;
    const height = Math.max(1, Math.round(image.naturalHeight * (width / image.naturalWidth)));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Browser tidak mendukung canvas.');
    if (format === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); }
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, quality));
    if (!blob) throw new Error(`Konversi ${file.name} gagal.`);
    return { name: `${stem(file.name)}.${extensionFor(format)}`, url: URL.createObjectURL(blob), size: blob.size };
  }

  async function convertAll() {
    if (!files.length || busy) return;
    setBusy(true); setError(null);
    results.forEach((result) => URL.revokeObjectURL(result.url));
    setResults([]);
    try {
      const converted: Result[] = [];
      for (const file of files) converted.push(mode === 'vector' ? await traceFile(file) : await convertRaster(file));
      setResults(converted);
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : 'Konversi gagal.');
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-5">
      <button type="button" className="flex min-h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 px-6 text-center hover:bg-brand-100" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <span className="text-4xl" aria-hidden="true">+</span>
        <span className="mt-2 font-semibold text-brand-800">Pilih gambar atau seret ke sini</span>
        <span className="mt-1 text-sm text-zinc-500">PNG, JPG, BMP, GIF, atau WebP · Bisa banyak file</span>
      </button>
      <input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/bmp,image/gif,image/webp" multiple onChange={(event) => { if (event.target.files) selectFiles(event.target.files); }} />

      {files.length > 0 && previewUrl && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-hidden rounded-xl border bg-zinc-50 p-3">
          <img src={previewUrl} alt="Preview gambar pertama" className="mx-auto max-h-96 max-w-full object-contain" />
          <p className="mt-3 truncate text-sm text-zinc-600">{files.length} file dipilih · {files[0].name}</p>
        </div>
        <div className="space-y-4 rounded-xl border p-4">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={`rounded-lg border px-3 py-2 text-sm font-semibold ${mode === 'vector' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-zinc-300'}`} onClick={() => setMode('vector')}>Ke SVG</button>
            <button type="button" className={`rounded-lg border px-3 py-2 text-sm font-semibold ${mode === 'raster' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-zinc-300'}`} onClick={() => setMode('raster')}>Format gambar</button>
          </div>
          {mode === 'vector' ? <>
            <div><label className="label" htmlFor="tolerance">Tolerance: {tolerance}</label><input id="tolerance" className="w-full accent-brand-600" type="range" min="0.1" max="5" step="0.1" value={tolerance} onChange={(event) => setTolerance(Number(event.target.value))} /></div>
            <div><label className="label" htmlFor="smoothing">Smoothing: {smoothing}</label><input id="smoothing" className="w-full accent-brand-600" type="range" min="0.1" max="5" step="0.1" value={smoothing} onChange={(event) => setSmoothing(Number(event.target.value))} /></div>
            <div><label className="label" htmlFor="colors">Jumlah warna: {colorCount}</label><input id="colors" className="w-full accent-brand-600" type="range" min="2" max="64" value={colorCount} onChange={(event) => setColorCount(Number(event.target.value))} /></div>
            <div><label className="label" htmlFor="simplify">Simplify paths: {simplify}</label><input id="simplify" className="w-full accent-brand-600" type="range" min="0" max="30" value={simplify} onChange={(event) => setSimplify(Number(event.target.value))} /></div>
          </> : <>
            <div><label className="label" htmlFor="image-format">Format hasil</label><select id="image-format" className="input" value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)}>{(Object.keys(FORMATS) as OutputFormat[]).map((value) => <option key={value} value={value}>{FORMATS[value]}</option>)}</select></div>
            <div><label className="label" htmlFor="quality">Kualitas: {Math.round(quality * 100)}%</label><input id="quality" className="w-full accent-brand-600" type="range" min="0.1" max="1" step="0.05" value={quality} onChange={(event) => setQuality(Number(event.target.value))} disabled={format === 'image/png'} /></div>
          </>}
          <div><label className="label" htmlFor="max-width">Lebar maksimum (px, opsional)</label><input id="max-width" className="input" type="number" min="1" placeholder="Ukuran asli" value={maxWidth} onChange={(event) => setMaxWidth(event.target.value)} /></div>
          <button type="button" className="btn-primary w-full" onClick={convertAll} disabled={busy}>{busy ? `Memproses ${files.length} file...` : `Konversi ${files.length} file`}</button>
        </div>
      </div>}

      {results.length > 0 && <div className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-bold">Hasil ({results.length})</h2><p className="text-sm text-zinc-500">Preview SVG</p></div>{results.map((result) => <div key={result.url} className="flex flex-wrap items-center gap-3 rounded-xl border p-3"><img src={result.url} alt={`Preview ${result.name}`} className="h-16 w-24 rounded border bg-zinc-50 object-contain" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{result.name}</p><p className="text-xs text-zinc-500">{formatBytes(result.size)}</p></div><a className="btn-download !px-3 !py-2 !text-xs" href={result.url} download={result.name}>Download {mode === 'vector' ? 'SVG' : FORMATS[format]}</a></div>)}</div>}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </section>
  );
}
