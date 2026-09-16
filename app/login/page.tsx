'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return; // single-flight: Supabase rate-limits OTP emails
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      if (error) setError(error.message);
      else setSent(true);
    } finally {
      setBusy(false);
    }
  }

  async function passwordAuth(e: React.FormEvent, action: 'in' | 'up') {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      if (action === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        else window.location.href = '/admin';
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) setError(error.message);
        else if (!data.session) setNotice('Account created. If email confirmation is on, check your inbox — or ask Supabase admin to confirm you, then sign in.');
        else window.location.href = '/admin';
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-x max-w-md py-16">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-600">Password or passwordless magic link. Admins use an allow-listed email.</p>
      <div className="mt-4 flex gap-2 text-sm">
        <button onClick={() => setMode('password')} className={mode === 'password' ? 'btn-primary !px-3 !py-1.5' : 'btn-secondary !px-3 !py-1.5'}>Password</button>
        <button onClick={() => setMode('otp')} className={mode === 'otp' ? 'btn-primary !px-3 !py-1.5' : 'btn-secondary !px-3 !py-1.5'}>Magic link</button>
      </div>
      {mode === 'password' ? (
        <form onSubmit={(e) => passwordAuth(e, 'in')} className="card mt-4 space-y-3">
          <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label className="label">Password</label><input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <button type="button" className="btn-secondary w-full" disabled={busy} onClick={(e) => passwordAuth(e, 'up')}>Create account</button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {notice ? <p className="text-sm text-zinc-600">{notice}</p> : null}
        </form>
      ) : sent ? (
        <p className="card mt-4 text-sm">Check your inbox for the sign-in link.</p>
      ) : (
        <form onSubmit={sendLink} className="card mt-4 space-y-3">
          <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send magic link'}</button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      )}
    </div>
  );
}
