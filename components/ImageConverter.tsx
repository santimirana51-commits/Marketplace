'use client';

import { DragEvent, useEffect, useRef, useState } from 'react';

type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';

const FORMAT_LABELS: Record<OutputFormat, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WebP',
};

function extensionFor(format: OutputFormat) {
  return format === 'image/jpeg' ? 'jpg' : format.split('/')[1];
}

export function ImageConverter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<OutputFormat>('image/webp');
  const [quality, setQuality] = useState(0.85);
  const [maxWidth, setMaxWidth] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [previewUrl, resultUrl]);

  function selectFile(nextFile: File | undefined) {
    if (!nextFile) return;
    if (!nextFile.type.startsWith('image/')) {
      setError('Pilih file gambar yang valid.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setResultUrl(null);
    setResultSize(null);
    setError(null);
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    selectFile(event.dataTransfer.files[0]);
  }

  async function convert() {
    if (!file || !previewUrl || busy) return;
    setBusy(true);
    setError(null);
    try {
      const image = new Image();
      image.src = previewUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
      });

      const requestedWidth = Number(maxWidth);
      const width = requestedWidth > 0 ? Math.min(requestedWidth, image.naturalWidth) : image.naturalWidth;
      const height = Math.round(image.naturalHeight * (width / image.naturalWidth));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Browser tidak mendukung konversi gambar.');
      if (format === 'image/jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(image, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, quality));
      if (!blob) throw new Error('Konversi gambar gagal.');
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
      setResultSize(blob.size);
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : 'Konversi gambar gagal.');
    } finally {
      setBusy(false);
    }
  }

  const outputName = file ? `${file.name.replace(/\.[^.]+$/, '')}.${extensionFor(format)}` : `pixelbay-converted.${extensionFor(format)}`;
  const formatBytes = (bytes: number | null) => bytes === null ? '' : `${(bytes / 1024).toFixed(1)} KB`;

  return (
    <section className="space-y-5">
      <button type="button" className="flex min-h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 px-6 text-center hover:bg-brand-100" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <span className="text-4xl" aria-hidden="true">+</span>
        <span className="mt-2 font-semibold text-brand-800">Pilih gambar atau seret ke sini</span>
        <span className="mt-1 text-sm text-zinc-500">PNG, JPG, GIF, BMP, atau WebP</span>
      </button>
      <input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={(event) => selectFile(event.target.files?.[0])} />

      {file && previewUrl && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="overflow-hidden rounded-xl border bg-zinc-50 p-3">
            <img src={previewUrl} alt="Preview gambar asli" className="mx-auto max-h-96 max-w-full object-contain" />
            <p className="mt-3 truncate text-sm text-zinc-600">{file.name} · {formatBytes(file.size)}</p>
          </div>
          <div className="space-y-4 rounded-xl border p-4">
            <div>
              <label className="label" htmlFor="image-format">Format hasil</label>
              <select id="image-format" className="input" value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)}>
                {(Object.keys(FORMAT_LABELS) as OutputFormat[]).map((value) => <option key={value} value={value}>{FORMAT_LABELS[value]}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="max-width">Lebar maksimum (px, opsional)</label>
              <input id="max-width" className="input" type="number" min="1" placeholder="Biarkan ukuran asli" value={maxWidth} onChange={(event) => setMaxWidth(event.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="quality">Kualitas: {Math.round(quality * 100)}%</label>
              <input id="quality" className="w-full accent-brand-600" type="range" min="0.1" max="1" step="0.05" value={quality} onChange={(event) => setQuality(Number(event.target.value))} disabled={format === 'image/png'} />
              {format === 'image/png' && <p className="mt-1 text-xs text-zinc-500">PNG menggunakan kualitas lossless.</p>}
            </div>
            <button type="button" className="btn-primary w-full" onClick={convert} disabled={busy}>{busy ? 'Mengonversi...' : 'Konversi gambar'}</button>
          </div>
        </div>
      )}

      {resultUrl && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <div>
            <p className="font-semibold text-green-800">Konversi selesai</p>
            <p className="text-sm text-green-700">{outputName} · {formatBytes(resultSize)}</p>
          </div>
          <a className="btn-download" href={resultUrl} download={outputName}>Unduh hasil {FORMAT_LABELS[format]}</a>
        </div>
      )}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </section>
  );
}
