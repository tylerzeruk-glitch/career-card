import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Magic links and OAuth land here with a code; trade it for a session cookie and go home. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';
  if (code) {
    const sb = await supabaseServer();
    if (sb) {
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error) return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(error.message), url.origin));
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
