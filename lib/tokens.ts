import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32; // 256-bit entropy

/** Raw token shown to the customer exactly once (in success URL / email). */
export function generateRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/** SHA-256 hash stored in DB. Raw tokens are never persisted or logged. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function tokenExpiry(hours?: number): Date {
  const h = hours ?? Number(process.env.DOWNLOAD_TOKEN_TTL_HOURS ?? 72);
  return new Date(Date.now() + h * 3600_000);
}

export function maxDownloads(): number {
  return Number(process.env.DOWNLOAD_MAX_DOWNLOADS ?? 5);
}
