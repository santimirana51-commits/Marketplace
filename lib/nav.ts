// Shared navigation data (server-safe: no 'use client' here — client
// modules may re-export from this file, never the other way around).

export const NAV_CATS = [
  { label: 'All', href: '/products' },
  { label: 'Templates', href: '/products?q=template' },
  { label: 'Design', href: '/products?q=design' },
  { label: 'PDF & Docs', href: '/products?q=pdf' },
  { label: 'Scripts & Code', href: '/products?q=script' },
];

export const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Products', href: '/admin/products' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Customers', href: '/admin/customers' },
];
