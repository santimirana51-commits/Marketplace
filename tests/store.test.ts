import { describe, expect, it, vi, beforeEach } from 'vitest';
import { existsSync } from 'node:fs';
import { adminProductSchema, adminFileSchema } from '../lib/validation';
import { formatPrice, formatBytes } from '../lib/format';
import { rateLimit } from '../lib/rate-limit';
import { isAdminEmail } from '../lib/auth';

// Portal berbagi file: publik total, tanpa login/cart/checkout/payment.
// Tests pin the portal security contracts so regressions fail fast.

describe('1. product creation validation', () => {
  it('accepts a valid payload without price (portal: everything free)', () => {
    const r = adminProductSchema.safeParse({ title: 'Panduan', slug: 'panduan' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.price).toBe(0);
  });
  it('rejects negative prices', () => {
    expect(adminProductSchema.safeParse({ title: 'T', slug: 't', price: -1 }).success).toBe(false);
  });
});

describe('2. product publishing', () => {
  it('accepts draft/published/archived only', () => {
    for (const status of ['draft', 'published', 'archived'] as const) {
      expect(adminProductSchema.safeParse({ title: 'T', slug: 't', status }).success).toBe(true);
    }
    expect(adminProductSchema.safeParse({ title: 'T', slug: 't', status: 'live' }).success).toBe(false);
  });
});

describe('3. slugs + drive ids + optional display name', () => {
  it('rejects bad slugs', () => {
    expect(adminProductSchema.safeParse({ title: 'T', slug: 'Bad Slug!' }).success).toBe(false);
  });
  it('requires Drive file id, name optional (falls back to Drive name)', () => {
    expect(adminFileSchema.safeParse({ google_drive_file_id: 'x' }).success).toBe(false);
    expect(adminFileSchema.safeParse({ google_drive_file_id: '1AbCdefGh' }).success).toBe(true);
    const r = adminFileSchema.safeParse({ google_drive_file_id: '1AbCdefGh' });
    if (r.success) expect(r.data.name).toBe('');
  });
});

describe('4. formatting', () => {
  it('formats USD (legacy helper kept)', () => expect(formatPrice(29.99, 'USD')).toBe('$29.99'));
  it('formats bytes', () => {
    expect(formatBytes(undefined)).toBe('—');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });
  it('exports beforeEach helper available (sanity)', () => {
    expect(typeof beforeEach).toBe('function');
  });
});

describe('5. rate limiting', () => {
  it('blocks bursts', () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(rateLimit(key, 5)).toBe(true);
    expect(rateLimit(key, 5)).toBe(false);
  });
});

describe('6. google drive lib', () => {
  it('exposes metadata/stream/validate + link extraction, maps 404, never logs secrets', async () => {
    const mod = await import('../lib/google-drive');
    expect(typeof mod.getDriveFileMetadata).toBe('function');
    expect(typeof mod.getDriveFile).toBe('function');
    expect(typeof mod.downloadDriveFile).toBe('function');
    expect(typeof mod.extractDriveFileId).toBe('function');
    expect(typeof mod.isDriveConfigured).toBe('function');
    const src = await import('node:fs/promises').then((fs) => fs.readFile('lib/google-drive.ts', 'utf8'));
    expect(src).toMatch(/Drive file not found/);
    expect(src).not.toMatch(/REFRESH_TOKEN.*console|console.*REFRESH/);
  });
  it('accepts bare ids and full share links', async () => {
    const { extractDriveFileId } = await import('../lib/google-drive');
    expect(extractDriveFileId('1g3OgK_QQUGQlrlodieSxyz')).toBe('1g3OgK_QQUGQlrlodieSxyz');
    expect(extractDriveFileId('https://drive.google.com/file/d/1g3OgK_QQUGQlrlodieSxyz/view?usp=sharing')).toBe('1g3OgK_QQUGQlrlodieSxyz');
    expect(extractDriveFileId('https://drive.google.com/open?id=1g3OgK_QQUGQlrlodieSxyz')).toBe('1g3OgK_QQUGQlrlodieSxyz');
  });
});

describe('7. admin authorization', () => {
  it('allow-list email check is case-insensitive, never trusts client roles', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'Owner@Example.com');
    expect(isAdminEmail('owner@example.com')).toBe(true);
    expect(isAdminEmail('intruder@example.com')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    vi.unstubAllEnvs();
    const src = await import('node:fs/promises').then((fs) => fs.readFile('lib/auth.ts', 'utf8'));
    expect(src).toMatch(/ADMIN_EMAILS/);
    expect(src).not.toMatch(/role.*body|body.*role/);
  });
  it('admin product routes call requireAdmin()', async () => {
    const src = await import('node:fs/promises').then((fs) =>
      fs.readFile('app/api/admin/products/[id]/route.ts', 'utf8'),
    );
    expect(src).toMatch(/requireAdmin/);
  });
});

describe('8. migrations 0001-0005', () => {
  it('schema, RLS, hardening, provider, downloads counter all exist', async () => {
    const fs = await import('node:fs/promises');
    const s1 = await fs.readFile('supabase/migrations/0001_schema.sql', 'utf8');
    expect(s1).toMatch(/product_files/);
    const rls = await fs.readFile('supabase/migrations/0002_rls.sql', 'utf8');
    expect(rls).toMatch(/enable row level security/);
    const hardening = await fs.readFile('supabase/migrations/0003_hardening.sql', 'utf8');
    expect(hardening).toMatch(/product_files/);
    expect(existsSync('supabase/migrations/0004_provider.sql')).toBe(true);
    const m5 = await fs.readFile('supabase/migrations/0005_downloads.sql', 'utf8');
    expect(m5).toMatch(/downloads/);
  });
});

describe('9. public download route contract', () => {
  const P = 'app/api/files/[id]/download/route.ts';
  it('serves published files only (404 otherwise)', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile(P, 'utf8'));
    expect(src).toMatch(/published/);
    expect(src).toMatch(/status.*404/);
  });
  it('rate-limits per IP (429)', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile(P, 'utf8'));
    expect(src).toMatch(/rateLimit/);
    expect(src).toMatch(/429/);
  });
  it('increments counter tolerantly + streams with safe headers', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile(P, 'utf8'));
    expect(src).toMatch(/downloads/);
    expect(src).toMatch(/downloadDriveFileStream/);
    expect(src).toMatch(/attachment/);
    expect(src).toMatch(/no-store/);
    expect(src).toMatch(/nosniff/);
  });
  it('needs no login/token/order — and never takes Drive ids from client', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile(P, 'utf8'));
    expect(src).not.toMatch(/requireUser|getSessionUser|hashToken|orderStatus|paid/);
    expect(src).not.toMatch(/google_drive_file_id.*params|params.*google_drive_file_id/);
  });
  it('rejects malformed ids with 404', async () => {
    const { GET } = await import('../app/api/files/[id]/download/route');
    const res = await GET(new Request('http://x/api/files/x/download'), { params: { id: '' } });
    expect(res.status).toBe(404);
  });
});

describe('10. no shop/payment code remains', () => {
  const gone = [
    'app/api/checkout/route.ts',
    'app/api/stripe/webhook/route.ts',
    'app/api/midtrans/webhook/route.ts',
    'app/api/orders/route.ts',
    'app/api/account/download-link/route.ts',
    'app/api/download/[token]/route.ts',
    'app/cart/page.tsx',
    'app/checkout/page.tsx',
    'app/success/page.tsx',
    'app/account/page.tsx',
    'app/admin/orders/page.tsx',
    'app/admin/customers/page.tsx',
    'components/CartProvider.tsx',
    'components/CartBadge.tsx',
    'components/CheckoutButton.tsx',
    'components/CartQuickBuy.tsx',
    'components/AddToCartButton.tsx',
    'components/DownloadButtons.tsx',
    'lib/stripe.ts',
    'lib/midtrans.ts',
    'lib/tokens.ts',
  ];
  it.each(gone)('%s is deleted', (f) => {
    expect(existsSync(f)).toBe(false);
  });
  it('no price/cart/checkout code remains in storefront', async () => {
    const fs = await import('node:fs/promises');
    for (const f of ['app/page.tsx', 'components/ProductCard.tsx', 'components/SiteHeader.tsx']) {
      const src = await fs.readFile(f, 'utf8');
      expect(src).not.toMatch(/formatPrice|isFreePrice|useCart|CartBadge/);
      expect(src).not.toMatch(/\/cart|\/checkout|Stripe|Midtrans|QRIS/);
    }
  });
  it('middleware protects only /admin', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile('middleware.ts', 'utf8'));
    expect(src).toMatch(/\/admin/);
    expect(src).not.toMatch(/\/account/);
  });
});

describe('11b. external source links', () => {
  it('accepts public http(s), rejects dangerous/private targets', async () => {
    const { isSafeExternalUrl } = await import('../lib/validation');
    expect(isSafeExternalUrl('https://example.com/file.zip')).toBe(true);
    expect(isSafeExternalUrl('http://cdn.example.org/a/b.pdf')).toBe(true);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,hi')).toBe(false);
    expect(isSafeExternalUrl('https://localhost/x.zip')).toBe(false);
    expect(isSafeExternalUrl('http://127.0.0.1/f.zip')).toBe(false);
    expect(isSafeExternalUrl('http://192.168.1.5/f.zip')).toBe(false);
    expect(isSafeExternalUrl('http://10.0.0.5/f.zip')).toBe(false);
    expect(isSafeExternalUrl('http://169.254.169.254/x')).toBe(false);
    expect(isSafeExternalUrl('not a url')).toBe(false);
    expect(isSafeExternalUrl('')).toBe(false);
  });
  it('admin attach accepts external-only (no drive id needed)', async () => {
    const { adminFileSchema } = await import('../lib/validation');
    expect(adminFileSchema.safeParse({ external_url: 'https://example.com/f.zip' }).success).toBe(true);
    expect(adminFileSchema.safeParse({}).success).toBe(false);
  });
  it('download route redirects external + validates server-side', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile('app/api/files/[id]/download/route.ts', 'utf8'));
    expect(src).toMatch(/isSafeExternalUrl/);
    expect(src).toMatch(/Response\.redirect/);
    expect(src).toMatch(/302/);
  });
  it('migration 0006 adds external_url', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile('supabase/migrations/0006_external.sql', 'utf8'));
    expect(src).toMatch(/external_url/);
  });
});

describe('11b2. forgiving attach input routing', () => {
  it('routes drive links/ids vs external URLs vs garbage', async () => {
    const { classifyAttachmentInput } = await import('../lib/validation');
    expect(classifyAttachmentInput('1AbCdefGhIjK', '')).toEqual({ driveId: '1AbCdefGhIjK', url: '' });
    expect(classifyAttachmentInput('https://drive.google.com/file/d/1AbCdefGhIjK/view', '')).toEqual({ driveId: '1AbCdefGhIjK', url: '' });
    expect(classifyAttachmentInput('https://www.mediafire.com/file/abc/file', '')).toEqual({ driveId: '', url: 'https://www.mediafire.com/file/abc/file' });
    expect(classifyAttachmentInput('https://www.mediafire.com/file/abc/file', 'https://example.com/x.zip')).toEqual({ driveId: '', url: 'https://example.com/x.zip' });
    expect(classifyAttachmentInput('!!!', '')).toEqual({ driveId: '', url: '' });
    expect(classifyAttachmentInput('', '')).toEqual({ driveId: '', url: '' });
  });
});

describe('11c. bulk attach', () => {
  it('parses lines, skips empties, caps at MAX', async () => {
    const { parseBulkLines, MAX_BULK_FILES } = await import('../lib/validation');
    expect(parseBulkLines('  a\n\nb\r\n  \nc  ')).toEqual(['a', 'b', 'c']);
    expect(parseBulkLines('')).toEqual([]);
    const many = Array.from({ length: 50 }, (_, i) => `https://example.com/${i}.zip`).join('\n');
    expect(parseBulkLines(many)).toHaveLength(MAX_BULK_FILES);
  });
  it('bulk route validates per line and reports errors', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile('app/api/admin/products/[id]/route.ts', 'utf8'));
    expect(src).toMatch(/addFiles/);
    expect(src).toMatch(/MAX_BULK_FILES/);
    expect(src).toMatch(/errors/);
    expect(src).toMatch(/classifyAttachmentInput/);
  });
});

describe('11d. editable install steps + notice', () => {
  it('schema accepts optional install_steps/notice', async () => {
    const { adminProductSchema } = await import('../lib/validation');
    const r = adminProductSchema.safeParse({ title: 'T', slug: 't', install_steps: 'a\nb', notice: 'x' });
    expect(r.success).toBe(true);
    const d = adminProductSchema.safeParse({ title: 'T', slug: 't' });
    if (d.success) {
      expect(d.data.install_steps).toBe('');
      expect(d.data.notice).toBe('');
    }
  });
  it('detail renders custom text with defaults fallback', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile('app/products/[slug]/page.tsx', 'utf8'));
    expect(src).toMatch(/DEFAULT_INSTALL_STEPS/);
    expect(src).toMatch(/DEFAULT_NOTICE/);
    expect(src).toMatch(/install_steps\?\.trim/);
  });
  it('admin editor + new form expose the fields; API tolerates pre-0007 DB', async () => {
    const fs = await import('node:fs/promises');
    expect(await fs.readFile('components/AdminProductEditor.tsx', 'utf8')).toMatch(/install_steps/);
    expect(await fs.readFile('app/admin/products/new/page.tsx', 'utf8')).toMatch(/install_steps/);
    expect(await fs.readFile('app/api/admin/products/[id]/route.ts', 'utf8')).toMatch(/migrasi 0007/);
    expect(await fs.readFile('supabase/migrations/0007_content.sql', 'utf8')).toMatch(/install_steps/);
  });
});

describe('11e. categories', () => {
  it('normalizes canonical casing, keeps manual labels, defaults Lainnya', async () => {
    const { toCategory, CATEGORIES, DEFAULT_CATEGORY } = await import('../lib/categories');
    expect(CATEGORIES).toContain('Game');
    expect(DEFAULT_CATEGORY).toBe('Lainnya');
    expect(toCategory('game')).toBe('Game');
    expect(toCategory('  PDF & Dokumen ')).toBe('PDF & Dokumen');
    expect(toCategory(null)).toBe('Lainnya');
    expect(toCategory('  ')).toBe('Lainnya');
    expect(toCategory('Anime Sub Indo')).toBe('Anime Sub Indo');
  });
  it('validation accepts canonical + manual labels', async () => {
    const { adminProductSchema } = await import('../lib/validation');
    expect(adminProductSchema.safeParse({ title: 'T', slug: 't', category: 'Game' }).success).toBe(true);
    expect(adminProductSchema.safeParse({ title: 'T', slug: 't', category: 'Anime Sub Indo' }).success).toBe(true);
    expect(adminProductSchema.safeParse({ title: 'T', slug: 't', category: '' }).success).toBe(true);
  });
  it('admin list filters + shows category; forms offer select', async () => {
    const fs = await import('node:fs/promises');
    expect(await fs.readFile('app/admin/products/page.tsx', 'utf8')).toMatch(/\?cat=/);
    expect(await fs.readFile('components/AdminProductEditor.tsx', 'utf8')).toMatch(/name="category"/);
    expect(await fs.readFile('app/admin/products/new/page.tsx', 'utf8')).toMatch(/name="category"/);
  });
  it('storefront filters by cat, tiles link cat, detail prioritizes same category', async () => {
    const fs = await import('node:fs/promises');
    const list = await fs.readFile('app/products/page.tsx', 'utf8');
    expect(list).toMatch(/searchParams.*cat|cat.*searchParams/);
    expect(list).toMatch(/p\.category\.toLowerCase\(\) !== cat\.toLowerCase\(\)/);
    expect(await fs.readFile('app/page.tsx', 'utf8')).toMatch(/products\?cat=/);
    const detail = await fs.readFile('app/products/[slug]/page.tsx', 'utf8');
    expect(detail).toMatch(/toCategory/);
  });
  it('migration 0008 adds category with default', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile('supabase/migrations/0008_category.sql', 'utf8'));
    expect(src).toMatch(/category/);
    expect(src).toMatch(/Lainnya/);
  });
});

describe('11. portal admin surface', () => {
  it('nav has Dashboard + Products only (no orders/customers)', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile('components/AdminShell.tsx', 'utf8'));
    expect(src).toMatch(/\/admin\/products/);
    expect(src).not.toMatch(/\/admin\/orders|\/admin\/customers/);
  });
  it('dashboard stats files + downloads, product forms have no price', async () => {
    const fs = await import('node:fs/promises');
    const home = await fs.readFile('app/admin/page.tsx', 'utf8');
    expect(home).toMatch(/downloads/i);
    expect(home).not.toMatch(/Revenue|order_items/);
    const editor = await fs.readFile('components/AdminProductEditor.tsx', 'utf8');
    expect(editor).not.toMatch(/name="price"|fd\.get\('price'\)/);
    const fresh = await fs.readFile('app/admin/products/new/page.tsx', 'utf8');
    expect(fresh).not.toMatch(/name="price"/);
  });
  it('detail page links straight to /api/files download', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile('app/products/[slug]/page.tsx', 'utf8'));
    expect(src).toMatch(/\/api\/files\//);
    expect(src).not.toMatch(/AddToCart|BuyNow|formatPrice/);
  });
  it('download box collapses long mirror lists', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile('app/products/[slug]/page.tsx', 'utf8'));
    expect(src).toMatch(/Tampilkan semua/);
    expect(src).toMatch(/slice\(0, 5\)/);
    expect(src).toMatch(/<details/);
  });
  it('download article mirrors kuyhaa structure (meta/spec/install/box/related)', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile('app/products/[slug]/page.tsx', 'utf8'));
    expect(src).toMatch(/oleh.*Pixelbay/);
    expect(src).toMatch(/Spesifikasi file/);
    expect(src).toMatch(/Langkah install/);
    expect(src).toMatch(/Link download/);
    expect(src).toMatch(/via \$/);
    expect(src).toMatch(/Penting/);
    expect(src).toMatch(/terkait/);
  });
});
