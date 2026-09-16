import { z } from 'zod';

export const checkoutSchema = z.object({
  items: z
    .array(z.object({ slug: z.string().min(1).max(200), quantity: z.number().int().min(1).max(10) }))
    .min(1)
    .max(20),
  customerEmail: z.string().email().optional(),
});

export const adminProductSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric + dashes'),
  description: z.string().max(20000).default(''),
  short_description: z.string().max(500).default(''),
  // Portal mode: everything is free; price kept only for the legacy column.
  price: z.number().min(0).max(1000000).default(0),
  currency: z.string().length(3).default('USD'),
  thumbnail_url: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  featured: z.boolean().default(false),
});

/**
 * External source URLs must be plain public http(s) links. Rejects
 * javascript:/data: schemes and loopback/private/metadata hosts so a
 * stored URL can never become an XSS or SSRF primitive.
 */
export function isSafeExternalUrl(input: string): boolean {
  const s = (input ?? '').trim();
  if (s.length < 12 || s.length > 2000) return false;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    const n = host.split('.').map(Number);
    if (n[0] === 10) return false;
    if (n[0] === 127) return false;
    if (n[0] === 169 && n[1] === 254) return false;
    if (n[0] === 192 && n[1] === 168) return false;
    if (n[0] === 172 && n[1] >= 16 && n[1] <= 31) return false;
    if (n[0] === 0) return false;
  }
  if (host === 'metadata.google.internal' || host.endsWith('.metadata.google.internal')) return false;
  if (host === 'metadata.google.com' || host === 'instance-data') return false;
  return true;
}

export const adminFileSchema = z.object({
  // Optional: empty falls back to the Drive file name server-side.
  name: z.string().max(300).default(''),
  // Optional now: a file may live on Drive OR an external URL (at least one).
  google_drive_file_id: z.string().max(300).default(''),
  external_url: z.string().max(2000).default(''),
}).refine(
  (d) => d.google_drive_file_id.trim().length >= 5 || isSafeExternalUrl(d.external_url),
  { message: 'Isi ID Drive atau URL luar yang valid (http/https publik)' },
);

export function errResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
