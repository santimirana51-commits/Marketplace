'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const SECTIONS: { label: string; items: { label: string; href: string; icon: React.ReactNode }[] }[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/admin', icon: <IconGrid /> }],
  },
  {
    label: 'Management',
    items: [
      { label: 'Products', href: '/admin/products', icon: <IconBox /> },
      { label: 'Orders', href: '/admin/orders', icon: <IconCart /> },
      { label: 'Customers', href: '/admin/customers', icon: <IconUsers /> },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'View store', href: '/', icon: <IconStore /> },
      { label: 'My account', href: '/account', icon: <IconUser /> },
    ],
  },
];

function itemCls(active: boolean) {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    active ? 'bg-brand-600 text-white shadow-sm' : 'text-zinc-700 hover:bg-zinc-100'
  }`;
}

function SidebarBody({ pathname, onNav }: { pathname: string; onNav?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/admin" onClick={onNav} className="flex h-16 items-center gap-2 border-b px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-extrabold text-white">P</span>
        <span className="leading-tight">
          <span className="block font-extrabold tracking-tight">Pixelbay</span>
          <span className="block text-[11px] font-medium text-zinc-500">Admin panel</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Admin">
        {SECTIONS.map((s) => (
          <div key={s.label}>
            <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{s.label}</p>
            <ul className="space-y-0.5">
              {s.items.map((it) => {
                const active = it.href === '/admin' ? pathname === '/admin' : pathname.startsWith(it.href);
                return (
                  <li key={it.href + it.label}>
                    <Link href={it.href} onClick={onNav} aria-current={active ? 'page' : undefined} className={itemCls(active)}>
                      <span className="h-5 w-5 shrink-0">{it.icon}</span>
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t p-3">
        <Link href="/auth/signout" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
          <span className="h-5 w-5 shrink-0"><IconOut /></span>
          Sign out
        </Link>
      </div>
    </div>
  );
}

export function AdminShell({ email, children }: { email?: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-[70vh] bg-zinc-50 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen border-r bg-white lg:block">
        <SidebarBody pathname={pathname} />
      </aside>
      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <SidebarBody pathname={pathname} onNav={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
      <div className="min-w-0">
        {/* Topbar */}
        <div className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button className="btn-secondary !px-3 !py-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
            <p className="truncate text-sm font-semibold text-zinc-800">Admin panel</p>
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="hidden max-w-[220px] truncate text-zinc-500 sm:block" title={email ?? ''}>{email ?? ''}</span>
              <Link href="/" className="btn-secondary !px-3 !py-1.5 text-xs">View store</Link>
            </div>
          </div>
        </div>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function IconGrid() {
  return (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><rect x="3" y="3" width="6" height="6" rx="1.5" /><rect x="11" y="3" width="6" height="6" rx="1.5" /><rect x="3" y="11" width="6" height="6" rx="1.5" /><rect x="11" y="11" width="6" height="6" rx="1.5" /></svg>);
}
function IconBox() {
  return (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M10 2.5 16.5 6v8L10 17.5 3.5 14V6L10 2.5Z" strokeLinejoin="round" /><path d="M3.5 6 10 9.5 16.5 6M10 9.5v8" strokeLinejoin="round" /></svg>);
}
function IconCart() {
  return (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M2.5 4h2l2.4 9.5h9.4l2-7H6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="8" cy="17" r="1.4" /><circle cx="15" cy="17" r="1.4" /></svg>);
}
function IconUsers() {
  return (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><circle cx="7" cy="7" r="3" /><path d="M2.5 16.5c.8-2.8 2.5-4 4.5-4s3.7 1.2 4.5 4" strokeLinecap="round" /><circle cx="14" cy="8" r="2.2" /><path d="M14.5 12.7c1.4.3 2.4 1.4 3 3.8" strokeLinecap="round" /></svg>);
}
function IconStore() {
  return (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M3 7.5 4.5 3h11L17 7.5M3 7.5h14M3 7.5V16.5h14V7.5M7.5 16.5v-4h5v4" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}
function IconUser() {
  return (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><circle cx="10" cy="7" r="3.2" /><path d="M3.5 16.5c1-3 3.4-4.5 6.5-4.5s5.5 1.5 6.5 4.5" strokeLinecap="round" /></svg>);
}
function IconOut() {
  return (<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M8 3.5H4.5v13H8M13 6.5l3.5 3.5-3.5 3.5M16 10H8" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}
