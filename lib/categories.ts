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

/**
 * Normalize to canonical casing when it matches, otherwise keep the
 * admin's manual label (max 50 chars). Empty/blank falls back to Lainnya.
 */
export function toCategory(input: string | null | undefined): string {
  const s = (input ?? '').trim().slice(0, 50);
  if (!s) return DEFAULT_CATEGORY;
  const hit = CATEGORIES.find((c) => c.toLowerCase() === s.toLowerCase());
  return hit ?? s;
}
