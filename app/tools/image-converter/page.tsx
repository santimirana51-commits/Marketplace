import type { Metadata } from 'next';
import { ImageConverter } from '@/components/ImageConverter';

export const metadata: Metadata = {
  title: 'Konverter Gambar Online',
  description: 'Konversi dan perkecil gambar ke PNG, JPG, atau WebP langsung di browser.',
};

export default function ImageConverterPage() {
  return (
    <main className="container-x py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Tool gratis Pixelbay</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Konverter gambar</h1>
          <p className="mt-3 text-zinc-600">Ubah format dan ukuran gambar tanpa mengunggah file ke server. Semua proses berlangsung di browser Anda.</p>
        </div>
        <div className="card">
          <ImageConverter />
        </div>
      </div>
    </main>
  );
}
