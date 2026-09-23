'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Flag } from '@/components/Landing';
import { ThemeToggle } from '@/components/ThemeToggle';

type Provider = 'google' | 'linkedin_oidc' | 'apple';

/**
 * The "Continue with" buttons. Each needs its provider turned on in Supabase
 * Auth (see README); NEXT_PUBLIC_AUTH_PROVIDERS narrows the list, e.g.
 * "google,apple", or "none" to hide them all. Unset shows all three.
 */
const PROVIDERS: { id: Provider; label: string; icon: React.ReactNode }[] = [
  { id: 'google', label: 'Continue with Google', icon: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" /><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.2v3.1C3.2 21.3 7.3 24 12 24z" /><path fill="#FBBC05" d="M5.3 14.3c-.5-1.5-.5-3.1 0-4.6V6.6H1.2c-1.6 3.3-1.6 7.2 0 10.5l4.1-2.8z" /><path fill="#EA4335" d="M12 4.7c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.1 0 12 0 7.3 0 3.2 2.7 1.2 6.6l4.1 3.1c.9-2.9 3.6-5 6.7-5z" /></svg> },
  { id: 'linkedin_oidc', label: 'Continue with LinkedIn', icon: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect width="24" height="24" rx="3" fill="#0A66C2" /><path fill="#fff" d="M6.9 9.5h2.6V18H6.9zM8.2 5.3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11.2 9.5h2.5v1.2c.4-.7 1.3-1.4 2.7-1.4 2.8 0 3.3 1.8 3.3 4.2V18h-2.6v-3.9c0-.9 0-2.1-1.3-2.1s-1.5 1-1.5 2.1V18h-2.6V9.5z" /></svg> },
  { id: 'apple', label: 'Continue with Apple', icon: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M16.4 12.7c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.4-2.8-.1 0-2.6-1-2.6-3.8zM14 5.5c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" /></svg> },
];
const enabled = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? 'google,linkedin_oidc,apple').split(',').map((s) => s.trim()).filter(Boolean);

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
  const oauth = async (provider: Provider) => {
    if (!sb) return; setMsg(null);
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo() } });
    if (error) setMsg({ ok: false, text: error.message });
  };
  const providers = PROVIDERS.filter((p) => enabled.includes(p.id));

  return (
    <div className="login">
      <div className="box">
        <div className="boxhead">
          <a className="wordmark" href="/"><Flag /><span>CareerCards</span></a>
          <ThemeToggle />
        </div>
        <h1>Sign in</h1>
        {sb ? (
          <>
            <p>Your pack follows you between devices, and you can give it an address to share. Nothing from the job hunt is ever public.</p>
            <form onSubmit={magic}>
              <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <button className="btn wide primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
            </form>
            {providers.length > 0 && (
              <>
                <div className="or">or</div>
                <div className="providers">
                  {providers.map((p) => <button key={p.id} className="btn wide" type="button" onClick={() => oauth(p.id)}>{p.icon}{p.label}</button>)}
                </div>
              </>
            )}
            {msg && <div className={'msg ' + (msg.ok ? 'ok' : 'err')}>{msg.text}</div>}
          </>
        ) : (
          <p>Sign-in is not set up on this deployment. The app still works on this device; use Backup to move your pack.</p>
        )}
        <a className="back" href="/">← Back</a>
      </div>
    </div>
  );
}
