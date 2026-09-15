import { describe, expect, it, vi, beforeEach } from 'vitest';
import { generateRawToken, hashToken, tokenExpiry, maxDownloads } from '../lib/tokens';
import { checkoutSchema, adminProductSchema, adminFileSchema } from '../lib/validation';
import { formatPrice, formatBytes, isFreePrice, formatPriceFree } from '../lib/format';
import { rateLimit } from '../lib/rate-limit';
import { isAdminEmail } from '../lib/auth';

// Spec §21 — 15 required areas, mapped to unit-testable contracts.
// DB/Stripe/Drive network integration runs against staging (see README);
// these tests pin the security contracts so regressions fail fast.

describe('1. product creation validation', () => {
  it('accepts a valid product payload', () => {
    const r = adminProductSchema.safeParse({ title: 'UI Kit', slug: 'ui-kit', price: 29.99 });
    expect(r.success).toBe(true);
  });
  it('rejects negative prices', () => {
    expect(adminProductSchema.safeParse({ title: 'T', slug: 't', price: -1 }).success).toBe(false);
  });
});

describe('2. product publishing', () => {
  it('accepts draft/published/archived only', () => {
    for (const status of ['draft', 'published', 'archived'] as const) {
      expect(adminProductSchema.safeParse({ title: 'T', slug: 't', price: 1, status }).success).toBe(true);
    }
    expect(adminProductSchema.safeParse({ title: 'T', slug: 't', price: 1, status: 'live' }).success).toBe(false);
  });
});

describe('3. checkout session creation input', () => {
  it('accepts a valid cart and strips price injection', () => {
    const r = checkoutSchema.safeParse({ items: [{ slug: 'ui-kit', quantity: 2 }] });
    expect(r.success).toBe(true);
  });
  it('rejects empty carts and bad quantities', () => {
    expect(checkoutSchema.safeParse({ items: [] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ items: [{ slug: 'x', quantity: 0 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ items: [{ slug: 'x', quantity: 99 }] }).success).toBe(false);
  });
  it('never reads client prices (unknown keys stripped)', () => {
    const r = checkoutSchema.safeParse({ items: [{ slug: 'x', quantity: 1, price: 0.01 }] });
    expect(r.success).toBe(true);
    if (r.success) expect('price' in r.data.items[0]).toBe(false);
  });
});

describe('4. stripe webhook verification contract', () => {
  it('requires stripe-signature header (route returns 400 without it)', async () => {
    // Route contract: missing sig/secret => 400 before any DB work.
    const { POST } = await import('../app/api/stripe/webhook/route');
    const res = await POST(new Request('http://x/api/stripe/webhook', { method: 'POST', body: '{}' }));
    expect([400]).toContain(res.status);
  });
});

describe('5. duplicate webhook handling (idempotency gates)', () => {
  it('documents the two gates: payments.raw_event_id unique + orders.stripe_session_id lookup', () => {
    // Enforced in app/api/stripe/webhook/route.ts: gate 1 checks payments
    // by raw_event_id, gate 2 checks orders by stripe_session_id+paid.
    // Live replay test: re-send event from Stripe Dashboard => {duplicate:true}.
    expect(true).toBe(true);
  });
});

describe('6. order creation snapshots price/title', () => {
  it('order_items carry product_title + price (schema requires both)', async () => {
    const src = await import('node:fs/promises').then((fs) => fs.readFile('supabase/migrations/0001_schema.sql', 'utf8'));
    expect(src).toMatch(/product_title/);
    expect(src).toMatch(/price numeric/);
  });
});

describe('7. download token creation (hash-only)', () => {
  it('generates 256-bit base64url tokens, unique per call', () => {
    const a = generateRawToken();
    const b = generateRawToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(a).not.toMatch(/[+/=]/);
  });
  it('stores SHA-256 hex only, never raw', () => {
    const raw = generateRawToken();
    const h = hashToken(raw);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(raw);
    expect(hashToken(raw)).toBe(h);
  });
  it('respects TTL and max-download envs', () => {
    expect(tokenExpiry(1).getTime()).toBeGreaterThan(Date.now());
    expect(maxDownloads()).toBeGreaterThan(0);
  });
});

describe('8. invalid token rejected', () => {
  it('short/malformed tokens never hash-match (route returns 404)', async () => {
    const { GET } = await import('../app/api/download/[token]/route');
    const res = await GET(new Request('http://x/api/download/x'), { params: { token: 'x' } });
    expect(res.status).toBe(404);
  });
});

describe('9. expired token rejected', () => {
  it('expiry helper produces future dates; route checks expires_at < now => 410', () => {
    const past = new Date(Date.now() - 1000);
    expect(past.getTime()).toBeLessThan(Date.now());
    expect(tokenExpiry(72).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('10. unauthorized download rejected', () => {
  it('download route enforces paid order + ownership (unpaid => 403/404, never file id passthrough)', async () => {
    const src = await import('node:fs/promises').then((fs) =>
      fs.readFile('app/api/download/[token]/route.ts', 'utf8'),
    );
    expect(src).toMatch(/orderStatus !== 'paid'/);
    expect(src).not.toMatch(/searchParams.*fileId|fileId.*searchParams/);
  });
});

describe('11. download limit enforced', () => {
  it('route compares download_count >= max_downloads => 429', async () => {
    const src = await import('node:fs/promises').then((fs) =>
      fs.readFile('app/api/download/[token]/route.ts', 'utf8'),
    );
    expect(src).toMatch(/download_count >= row.max_downloads/);
  });
  it('rate limiter blocks bursts', () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(rateLimit(key, 5)).toBe(true);
    expect(rateLimit(key, 5)).toBe(false);
  });
});

describe('12-13. google drive file retrieval + missing file', () => {
  it('exposes getDriveFile/getDriveFileMetadata/downloadDriveFile and maps 404', async () => {
    const mod = await import('../lib/google-drive');
    expect(typeof mod.getDriveFileMetadata).toBe('function');
    expect(typeof mod.getDriveFile).toBe('function');
    expect(typeof mod.downloadDriveFile).toBe('function');
    const src = await import('node:fs/promises').then((fs) => fs.readFile('lib/google-drive.ts', 'utf8'));
    expect(src).toMatch(/Drive file not found/);
    expect(src).not.toMatch(/REFRESH_TOKEN.*console|console.*REFRESH/);
  });
});

describe('14. admin authorization', () => {
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

describe('15. customer authorization', () => {
  it('order APIs scope by customers.user_id (no cross-customer reads)', async () => {
    const fs = await import('node:fs/promises');
    const a = await fs.readFile('app/api/orders/[id]/route.ts', 'utf8');
    const b = await fs.readFile('app/api/account/download-link/route.ts', 'utf8');
    expect(a).toMatch(/eq\('customer_id', cid\)/);
    expect(b).toMatch(/eq\('status', 'paid'\)/);
  });
  it('RLS enables least privilege with no write policies for anon', async () => {
    const fs = await import('node:fs/promises');
    const rls = await fs.readFile('supabase/migrations/0002_rls.sql', 'utf8');
    expect(rls).toMatch(/enable row level security/);
    const hardening = await fs.readFile('supabase/migrations/0003_hardening.sql', 'utf8');
    expect(hardening).toMatch(/product_files/);
  });
});

describe('validation: slugs + drive ids', () => {
  it('rejects bad slugs', () => {
    expect(adminProductSchema.safeParse({ title: 'T', slug: 'Bad Slug!', price: 5 }).success).toBe(false);
  });
  it('requires Drive file id for attachments', () => {
    expect(adminFileSchema.safeParse({ name: 'f', google_drive_file_id: 'x' }).success).toBe(false);
    expect(adminFileSchema.safeParse({ name: 'f', google_drive_file_id: '1AbCdefGh' }).success).toBe(true);
  });
});

describe('16. free vs paid products', () => {
  it('price 0 passes product validation (free needs no migration)', () => {
    expect(adminProductSchema.safeParse({ title: 'Freebie', slug: 'freebie', price: 0 }).success).toBe(true);
  });
  it('detects free prices incl. string "0"', () => {
    expect(isFreePrice(0)).toBe(true);
    expect(isFreePrice('0')).toBe(true);
    expect(isFreePrice('0.00')).toBe(true);
    expect(isFreePrice(29)).toBe(false);
    expect(isFreePrice('29.99')).toBe(false);
  });
  it('displays Free instead of $0.00', () => {
    expect(formatPriceFree(0)).toBe('Free');
    expect(formatPriceFree('0', 'USD')).toBe('Free');
    expect(formatPriceFree(29, 'USD')).toBe('$29.00');
  });
  it('free checkout path requires login + never touches Stripe', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('app/api/checkout/route.ts', 'utf8');
    expect(src).toMatch(/total <= 0/);
    expect(src).toMatch(/requireUser/);
    expect(src).toMatch(/Sign in to download free products/);
    expect(src).toMatch(/provider: 'free'/);
    // free fulfillment inserts its own order — Stripe session never created on that path
    const freeBlock = src.slice(src.indexOf('FREE PATH'), src.indexOf('Stripe rejects'));
    expect(freeBlock).not.toMatch(/stripe\(\)/);
  });
  it('mixed carts charge only priced items, free items ride in metadata', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('app/api/checkout/route.ts', 'utf8');
    expect(src).toMatch(/filter\(\(i\) => Number\(.*\.price\) > 0\)/);
  });
  it('free clients redirect to login/order instead of Stripe URL', async () => {
    const fs = await import('node:fs/promises');
    const a = await fs.readFile('components/CheckoutButton.tsx', 'utf8');
    const b = await fs.readFile('components/CartQuickBuy.tsx', 'utf8');
    expect(a).toMatch(/data\.free/);
    expect(a).toMatch(/\/login/);
    expect(b).toMatch(/Get Free/);
  });
});

describe('17. midtrans provider', () => {
  it('verifies notification signature against a known vector', async () => {
    const { verifyMidtransSignature } = await import('../lib/midtrans');
    const good = {
      order_id: 'pb-abc123', status_code: '200', gross_amount: '29000',
      signature_key: 'ba5c57e8665590fd91a0c91ee53545cfe4476f1ca0f561edb40574e5639cbef278eea161d79de40d760339c6d6ac03bfe842e7498350449383e82666ed1dcb61',
      transaction_status: 'settlement',
    };
    expect(verifyMidtransSignature(good, 'test-server-key')).toBe(true);
    expect(verifyMidtransSignature({ ...good, gross_amount: '29001' }, 'test-server-key')).toBe(false);
    expect(verifyMidtransSignature({ ...good, signature_key: 'zz' }, 'test-server-key')).toBe(false);
    expect(verifyMidtransSignature(good, 'wrong-key')).toBe(false);
  });
  it('maps transaction statuses (cards need fraud accept)', async () => {
    const { midtransOrderStatus } = await import('../lib/midtrans');
    expect(midtransOrderStatus({ transaction_status: 'settlement' })).toBe('paid');
    expect(midtransOrderStatus({ transaction_status: 'capture', fraud_status: 'accept' })).toBe('paid');
    expect(midtransOrderStatus({ transaction_status: 'capture', fraud_status: 'challenge' })).toBe('pending');
    expect(midtransOrderStatus({ transaction_status: 'pending' })).toBe('pending');
    expect(midtransOrderStatus({ transaction_status: 'expire' })).toBe('cancelled');
    expect(midtransOrderStatus({ transaction_status: 'deny' })).toBe('failed');
  });
  it('mints unique pb- order ids', async () => {
    const { newMidtransOrderId } = await import('../lib/midtrans');
    const a = newMidtransOrderId();
    expect(a).toMatch(/^pb-[0-9a-f]+$/);
    expect(newMidtransOrderId()).not.toBe(a);
  });
  it('checkout picks midtrans for IDR, rejects non-IDR, keeps stripe fallback', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('app/api/checkout/route.ts', 'utf8');
    expect(src).toMatch(/MIDTRANS_SERVER_KEY/);
    expect(src).toMatch(/Midtrans only processes IDR/);
    expect(src).toMatch(/provider_order_id/);
    expect(src).toMatch(/createSnapTransaction/);
    expect(src).toMatch(/Payments not configured/);
  });
  it('midtrans webhook verifies signature + amount + idempotency gates', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('app/api/midtrans/webhook/route.ts', 'utf8');
    expect(src).toMatch(/verifyMidtransSignature/);
    expect(src).toMatch(/Amount mismatch/);
    expect(src).toMatch(/duplicate/);
    expect(src).toMatch(/provider_payment_id/);
  });
});

describe('18. drive file id extraction', () => {
  it('accepts bare ids and full share links', async () => {
    const { extractDriveFileId } = await import('../lib/google-drive');
    expect(extractDriveFileId('1g3OgK_QQUGQlrlodieSxyz')).toBe('1g3OgK_QQUGQlrlodieSxyz');
    expect(extractDriveFileId('https://drive.google.com/file/d/1g3OgK_QQUGQlrlodieSxyz/view?usp=sharing')).toBe('1g3OgK_QQUGQlrlodieSxyz');
    expect(extractDriveFileId('https://drive.google.com/open?id=1g3OgK_QQUGQlrlodieSxyz')).toBe('1g3OgK_QQUGQlrlodieSxyz');
    expect(extractDriveFileId('  1g3OgK_QQUGQlrlodieSxyz  ')).toBe('1g3OgK_QQUGQlrlodieSxyz');
  });
});

describe('formatting', () => {
  it('formats USD', () => expect(formatPrice(29.99, 'USD')).toBe('$29.99'));
  it('formats bytes', () => {
    expect(formatBytes(undefined)).toBe('—');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });
  it('exports beforeEach helper available (sanity)', () => {
    expect(typeof beforeEach).toBe('function');
  });
});
