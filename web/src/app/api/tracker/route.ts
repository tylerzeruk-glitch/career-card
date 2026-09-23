import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { NextResponse, type NextRequest } from 'next/server';
import { TRACKER_SYSTEM, TrackerSchema } from '@/lib/tracker-schema';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** The sheet is small structured text; Sonnet reads it well and costs a fraction of Opus. */
const MODEL = 'claude-sonnet-5';
const MAX_CHARS = 200_000;

/**
 * POST { sheet, text } where text is the sheet as tab-separated lines (the browser has already
 * opened the workbook) and get back the events Claude found. Signed-in users only, like the
 * resume route, so the API key is not open to the internet.
 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'not-configured', message: 'Claude extraction is not set up on this deployment.' }, { status: 503 });
  const sb = await supabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in to have Claude read the sheet.' }, { status: 401 });

  const body = await req.json().catch(() => null) as { sheet?: string; text?: string } | null;
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) return NextResponse.json({ error: 'bad-request', message: 'No sheet received.' }, { status: 400 });
  if (text.length > MAX_CHARS) return NextResponse.json({ error: 'too-large', message: 'That sheet is too big to send in one go. Try one sheet, or the rows since your last import.' }, { status: 413 });

  const client = new Anthropic();
  try {
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 32000,
      system: TRACKER_SYSTEM,
      messages: [{ role: 'user', content: `Sheet "${(body?.sheet || 'Sheet1').slice(0, 80)}", tab-separated, one row per line:\n<sheet>\n${text}\n</sheet>` }],
      output_config: { format: zodOutputFormat(TrackerSchema) },
    });
    if (res.stop_reason === 'refusal') return NextResponse.json({ error: 'refused', message: 'Claude declined to read that sheet.' }, { status: 422 });
    if (res.stop_reason === 'max_tokens' || !res.parsed_output) return NextResponse.json({ error: 'unparsed', message: 'Claude did not return a complete result. Try a smaller sheet.' }, { status: 502 });
    const x = res.parsed_output;
    const clean = (s: string) => s.trim();
    const events = x.events
      .map((e) => ({ date: e.date.trim(), type: e.type, company: clean(e.company), title: clean(e.title), salary: clean(e.salary), link: clean(e.link), notes: clean(e.notes), status: clean(e.status) }))
      .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && (e.company || e.title));
    return NextResponse.json({ events, skipped: x.skipped, note: x.note.trim() });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: 'auth', message: 'The Claude API key on this deployment was rejected.' }, { status: 502 });
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'rate', message: 'Claude is busy right now. Try again in a minute.' }, { status: 503 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: 'api', message: 'Claude returned an error (' + e.status + ').' }, { status: 502 });
    throw e;
  }
}
