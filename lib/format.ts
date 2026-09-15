export function formatPrice(amount: number | string, currency = 'USD') {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
}

/** Price 0 (or "0") means free — no migration needed, CHECK (price >= 0) allows it. */
export function isFreePrice(amount: number | string): boolean {
  return Number(amount) <= 0;
}

/** Display helper: "Free" instead of $0.00. */
export function formatPriceFree(amount: number | string, currency = 'USD'): string {
  return isFreePrice(amount) ? 'Free' : formatPrice(amount, currency);
}

export function formatBytes(bytes?: number | null) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  return `${v.toFixed(1)} ${units[u]}`;
}
