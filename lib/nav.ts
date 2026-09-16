// Shared navigation data (server-safe: no 'use client' here — client
// modules may re-export from this file, never the other way around).

export const NAV_CATS = [
  { label: 'Semua', href: '/products' },
  { label: 'Template', href: '/products?cat=Template' },
  { label: 'Desain', href: '/products?cat=Desain' },
  { label: 'PDF & Dokumen', href: '/products?cat=PDF+%26+Dokumen' },
  { label: 'Script & Kode', href: '/products?cat=Script+%26+Kode' },
  { label: 'Game', href: '/products?cat=Game' },
  { label: 'Software', href: '/products?cat=Software' },
];

export const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Products', href: '/admin/products' },
];
