import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Where to go after signing in: a path on this site, else home. '//host', '/\\host' and a full URL all lead off the site, and a
 * browser drops tabs and newlines inside a URL, so the check is on where the URL actually resolves, not on how it starts. */
function sameSite(asked: string | null, origin: string): string {
  if (!asked || !asked.startsWith('/')) return '/';
  try { const u = new URL(asked, origin); return u.origin === origin ? u.pathname + u.search + u.hash : '/'; } catch { return '/'; }
}

/** Magic links and OAuth land here with a code; trade it for a session cookie and go home. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = sameSite(url.searchParams.get('next'), url.origin);
  if (code) {
    const sb = await supabaseServer();
    if (sb) {
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error) return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(error.message), url.origin));
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
