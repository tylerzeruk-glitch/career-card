'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Login() {
  const sb = supabaseBrowser();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const redirectTo = () => (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) + '/auth/callback';

  const magic = async (e: React.FormEvent) => {
    e.preventDefault(); if (!sb) return; setBusy(true); setMsg(null);
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo() } });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Check your email for a sign-in link.' });
  };
  const oauth = async (provider: 'google' | 'linkedin_oidc') => {
    if (!sb) return; setMsg(null);
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo() } });
    if (error) setMsg({ ok: false, text: error.message });
  };

  return (
    <div className="login">
      <div className="box">
        <div className="boxhead"><h1>Sign in</h1><ThemeToggle /></div>
        {sb ? (
          <>
            <p>Your card follows you between devices, and you can give it an address to share. Nothing from the job hunt is ever public.</p>
            <form onSubmit={magic}>
              <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <button className="btn wide primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
            </form>
            <div className="or">or</div>
            <button className="btn wide" onClick={() => oauth('google')}>Continue with Google</button>
            <div style={{ height: 8 }} />
            <button className="btn wide" onClick={() => oauth('linkedin_oidc')}>Continue with LinkedIn</button>
            {msg && <div className={'msg ' + (msg.ok ? 'ok' : 'err')}>{msg.text}</div>}
          </>
        ) : (
          <p>Sign-in is not set up on this deployment. The app still works on this device; use Backup to move your card.</p>
        )}
        <a className="back" href="/">← Back</a>
      </div>
    </div>
  );
}
