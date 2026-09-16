import { redirect } from 'next/navigation';
import { getSessionUser, isAdminEmail } from '@/lib/auth';
import { AdminShell } from '@/components/AdminShell';

/** Admin chrome: sidebar + topbar for every /admin route. Pages keep their own guards. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser().catch(() => null);
  if (!user || !isAdminEmail(user.email)) redirect('/login');
  return <AdminShell email={user.email}>{children}</AdminShell>;
}
