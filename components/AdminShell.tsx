'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { label: 'Dashboard', href: '/admin', icon: <IconGrid /> },
  { label: 'Products', href: '/admin/products', icon: <IconBox /> },
];

function itemCls(active: boolean) {
  return `flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
    active ? 'bg-brand-600 text-white shadow-sm' : 'text-zinc-700 hover:bg-zinc-100'
  }`;
}

function NavLinks({ pathname, onNav }: { pathname: string; onNav?: () => void }) {
  return (
    <>
      {NAV.map((it) => {
        const active = it.href === '/admin' ? pathname === '/admin' : pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} onClick={onNav} aria-current={active ? 'page' : undefined} className={itemCls(active)}>
            <span className="h-5 w-5 shrink-0">{it.icon}</span>
            {it.label}
          </Link>
        );
      })}
    </>
  );
}

export function AdminShell({ email, children }: { email?: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-[70vh] bg-zinc-50">
      {/* Top bar */}
      <div className="border-b bg-white">
        <div className="container-x flex h-16 items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-extrabold text-white">P</span>
            <span className="leading-tight">
              <span className="block font-extrabold tracking-tight">Pixelbay</span>
              <span className="block text-[11px] font-medium text-zinc-500">Admin panel</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden max-w-[220px] truncate text-zinc-500 md:block" title={email ?? ''}>{email ?? ''}</span>
            <Link href="/" className="btn-secondary hidden !px-3 !py-1.5 text-xs sm:inline-flex">View store</Link>
            <Link href="/auth/signout" className="hidden text-xs font-medium text-red-600 hover:underline sm:block">Sign out</Link>
            <button className="btn-secondary !px-3 !py-2 lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={open}>☰</button>
          </div>
        </div>
        {/* Stacked nav row (desktop) */}
        <nav className="hidden border-t lg:block" aria-label="Admin">
          <div className="container-x flex gap-1 overflow-x-auto py-1.5">
            <NavLinks pathname={pathname} />
          </div>
        </nav>
      </div>
      {/* Stacked nav dropdown (mobile) */}
      {open ? (
        <nav className="border-b bg-white px-4 py-2 lg:hidden" aria-label="Admin">
          <div className="grid gap-1">
            <NavLinks pathname={pathname} onNav={() => setOpen(false)} />
            <div className="flex gap-2 border-t pt-2">
              <Link href="/" className="btn-secondary flex-1 !px-3 !py-1.5 text-xs">View store</Link>
              <Link href="/auth/signout" className="flex-1 rounded-lg px-3 py-1.5 text-center text-xs font-medium text-red-600 hover:bg-red-50">Sign out</Link>
            </div>
          </div>
        </nav>
      ) : null}
      <main className="container-x max-w-6xl px-4 py-6 sm:px-6">{children}</main>
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
