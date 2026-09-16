// Shared navigation data (server-safe: no 'use client' here — client
// modules may re-export from this file, never the other way around).

export const NAV_CATS = [
  { label: 'Semua', href: '/products' },
  { label: 'Template', href: '/products?q=template' },
  { label: 'Desain', href: '/products?q=design' },
  { label: 'PDF & Dokumen', href: '/products?q=pdf' },
  { label: 'Script & Kode', href: '/products?q=script' },
];

export const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Products', href: '/admin/products' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Customers', href: '/admin/customers' },
];
