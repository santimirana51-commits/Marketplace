import { redirect } from 'next/navigation';
import { getSessionUser, isAdminEmail } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';

export default async function AdminCustomers() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) redirect('/login');
  const { data: customers } = await adminClient().from('customers').select('*').order('created_at', { ascending: false }).limit(100);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold">Customers</h1>
      <table className="table mt-6"><thead><tr><th>Email</th><th>Name</th><th>Joined</th></tr></thead>
        <tbody>
          {(customers ?? []).map((c) => {
            const cu = c as { id: string; email: string; name?: string | null; created_at: string };
            return <tr key={cu.id}><td>{cu.email}</td><td>{cu.name ?? '—'}</td><td>{new Date(cu.created_at).toLocaleDateString()}</td></tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
