import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

export async function getSessionUser() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** Throw 401 unless signed in; returns the user. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    const err = new Error('Unauthorized') as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return user;
}

/**
 * Server-side admin check. Never trusts client-sent roles: verifies the
 * Supabase Auth session via the anon client, then compares the verified
 * email against the ADMIN_EMAILS allow-list.
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) {
    const err = new Error('Forbidden') as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return user;
}

/** Get-or-create the customers row for the verified user (service role). */
export async function ensureCustomer(userId: string, email: string, name?: string) {
  const admin = adminClient();
  const { data: existing } = await admin
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return existing as { id: string };
  const { data, error } = await admin
    .from('customers')
    .insert({ user_id: userId, email, name: name ?? null })
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: string };
}
