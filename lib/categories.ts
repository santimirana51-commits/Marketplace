// Canonical product categories — single source of truth for admin
// <select>, storefront tiles/nav, and validation. DB stores plain text.

export const CATEGORIES = [
  'Template',
  'Desain',
  'PDF & Dokumen',
  'Script & Kode',
  'Game',
  'Software',
  'Lainnya',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_CATEGORY: Category = 'Lainnya';

/** Normalize user/legacy input to a canonical label (fallback Lainnya). */
export function toCategory(input: string | null | undefined): Category {
  const s = (input ?? '').trim().toLowerCase();
  const hit = CATEGORIES.find((c) => c.toLowerCase() === s);
  return (hit ?? DEFAULT_CATEGORY) as Category;
}
