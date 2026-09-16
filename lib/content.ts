import { adminClient } from '@/lib/supabase/admin';

/**
 * CMS landing texts. Defaults = current copy; DB rows override per key.
 * Table/rows may be absent (pre-0009) — everything falls back gracefully.
 */
export const CONTENT_DEFAULTS: Record<string, string> = {
  hero_title_a: 'File gratis.',
  hero_title_b: 'Unduh langsung.',
  hero_sub: 'Template, aset desain, PDF, dan script. Klik, unduh, gratis — tanpa daftar, tanpa bayar.',
  hero_placeholder: 'Coba “template”, “pdf”, “script”… ',
  sec_categories: 'Mulai dari kategori',
  sec_featured: 'Unggulan',
  sec_latest: 'Baru diunggah',
  sec_how_kicker: 'Cara kerja',
  sec_how_title: 'Dari klik ke file dalam 3 langkah',
  sec_why: 'Kenapa Pixelbay',
  sec_faq: 'Pertanyaan umum',
  cta_title: 'Siap ambil file Anda?',
  cta_sub: 'Cari di katalog — klik unduh, file langsung tersimpan.',
  cta_btn: 'Jelajahi file',
  view_all: 'Lihat semua →',
  steps_text: [
    'Pilih file-nya | Jelajahi katalog atau ketik kata kunci. Semua file gratis dan terbuka.',
    'Klik unduh | Tanpa daftar, tanpa bayar, tanpa antre. Satu klik langsung jalan.',
    'File tersimpan | File terunduh ke perangkat Anda. Bagikan halaman produk ke teman bila bermanfaat.',
  ].join('\n'),
  features_text: [
    '🆓 | 100% gratis | Semua file bebas diunduh. Tidak ada harga, keranjang, atau pembayaran.',
    '⚡ | Langsung jalan | Tanpa akun dan tanpa tunggu. Klik tombol unduh, file mengalir detik itu juga.',
    '🔒 | Link aman | File disalurkan server — ID Drive asli tidak pernah diekspos ke publik.',
  ].join('\n'),
  faqs_text: [
    'Apakah perlu daftar akun? ||| Tidak. Semua file bisa diunduh langsung tanpa login dan tanpa bayar.',
    'Apakah ada batas unduhan? ||| Ada batas wajar per IP agar server tetap kencang untuk semua. Tunggu sebentar lalu coba lagi bila terkena batas.',
    'File apa saja yang tersedia? ||| Template, aset desain, PDF, dokumen, dan script — lihat nama, tipe, dan ukuran tiap file di halaman produk sebelum mengunduh.',
    'Bolehkah membagikan ulang file? ||| Bagikan halaman produknya, bukan file mentahnya — supaya penghitung unduhan dan pembaruan tetap akurat.',
    'File rusak / link mati? ||| Laporkan judul produknya lewat halaman kontak admin — file akan diperbaiki.',
  ].join('\n'),
};

export const CONTENT_KEYS = Object.keys(CONTENT_DEFAULTS);

/** Server-side read (service role). Never throws — returns overrides only. */
export async function getContentMap(): Promise<Record<string, string>> {
  try {
    const { data, error } = await adminClient().from('site_content').select('key,value').limit(200);
    if (error || !data) return {};
    const map: Record<string, string> = {};
    for (const r of data as { key: string; value: string }[]) {
      if (typeof r.key === 'string') map[r.key] = r.value ?? '';
    }
    return map;
  } catch {
    return {};
  }
}

/** Resolve one text: DB override (even empty? no — blank falls back) else default. */
export function t(map: Record<string, string>, key: string): string {
  const v = (map[key] ?? '').trim();
  if (v) return map[key];
  return CONTENT_DEFAULTS[key] ?? '';
}

export type Step = { n: string; title: string; text: string };
export type Feature = { icon: string; title: string; text: string };
export type Faq = { q: string; a: string };

/** Parse "Title | text" lines (steps, features). */
export function parsePipedList<T>(raw: string, kind: 'steps' | 'features'): T[] {
  const out: T[] = [];
  const lines = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  lines.forEach((line, idx) => {
    const parts = line.split('|').map((s) => s.trim());
    if (kind === 'steps') {
      const [title, ...rest] = parts;
      if (title && rest.length) out.push({ n: String(idx + 1), title, text: rest.join(' | ') } as T);
    } else {
      const [icon, title, ...rest] = parts;
      if (title && rest.length) out.push({ icon: icon || '✨', title, text: rest.join(' | ') } as T);
    }
  });
  return out;
}

/** Parse "Question ||| Answer" lines (FAQ). */
export function parseFaqList(raw: string): Faq[] {
  const out: Faq[] = [];
  for (const line of raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) {
    const i = line.indexOf('|||');
    if (i > 0) out.push({ q: line.slice(0, i).trim(), a: line.slice(i + 3).trim() });
  }
  return out;
}
