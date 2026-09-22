import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import mammoth from 'mammoth';
import { NextResponse, type NextRequest } from 'next/server';
import { RESUME_SYSTEM, ResumeSchema, type ResumeExtract } from '@/lib/resume-schema';
import { supabaseServer } from '@/lib/supabase/server';
import type { CareerImport } from '@/lib/imports';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_BYTES = 10 * 1024 * 1024;

/** Turn Claude's extraction into the import preview shape the dialog already understands. */
function toImport(x: ResumeExtract): CareerImport {
  const clean = (s: string) => s.trim();
  return {
    kind: 'career',
    roles: x.roles.map((r) => ({ company: clean(r.company), title: clean(r.title), start: r.start, end: r.end, location: clean(r.location), bullets: r.bullets.map(clean).filter(Boolean), skills: r.skills.map(clean).filter(Boolean) })).filter((r) => r.company || r.title),
    education: x.education.map((e) => ({ school: clean(e.school), degree: clean(e.degree), years: [e.start, e.end].map(clean).filter(Boolean).join('–') })).filter((e) => e.school),
    certs: x.certs.map((c) => ({ name: clean(c.name), issuer: clean(c.issuer), year: clean(c.year) })).filter((c) => c.name),
    skills: x.skills.map(clean).filter(Boolean),
    profile: { name: clean(x.profile.name), headline: clean(x.profile.headline), location: clean(x.profile.location), email: clean(x.profile.email), linkedin: clean(x.profile.linkedin), summary: clean(x.profile.summary) },
    source: 'Extracted by Claude; check each row',
  };
}

/**
 * POST a resume (multipart, field "file": PDF, .docx, .txt or .md) and get back the import preview.
 * Signed-in users only, so the API key is not open to the internet. Without a key the route says so
 * and the browser falls back to the date-pattern parser.
 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'not-configured', message: 'Claude extraction is not set up on this deployment.' }, { status: 503 });
  const sb = await supabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ error: 'unauthorized', message: 'Sign in to have Claude read the resume.' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'bad-request', message: 'No file received.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'too-large', message: 'That file is over 10 MB.' }, { status: 413 });

  // PDFs go to Claude as documents so layout survives; everything else goes as text.
  const bytes = Buffer.from(await file.arrayBuffer());
  let content: Anthropic.ContentBlockParam[];
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
    content = [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: bytes.toString('base64') } }, { type: 'text', text: 'Extract this resume.' }];
  } else {
    const text = /\.docx$/i.test(file.name) ? (await mammoth.extractRawText({ buffer: bytes })).value : bytes.toString('utf8');
    const trimmed = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
    if (trimmed.length < 80) return NextResponse.json({ error: 'empty', message: 'Not much text came out of that file.' }, { status: 422 });
    content = [{ type: 'text', text: '<resume>\n' + trimmed + '\n</resume>' }];
  }

  const client = new Anthropic();
  try {
    const res = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 16000,
      system: RESUME_SYSTEM,
      messages: [{ role: 'user', content }],
      output_config: { format: zodOutputFormat(ResumeSchema), effort: 'medium' },
    });
    if (res.stop_reason === 'refusal') return NextResponse.json({ error: 'refused', message: 'Claude declined to read that file.' }, { status: 422 });
    if (res.stop_reason === 'max_tokens' || !res.parsed_output) return NextResponse.json({ error: 'unparsed', message: 'Claude did not return a complete result. Try again.' }, { status: 502 });
    return NextResponse.json(toImport(res.parsed_output));
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: 'auth', message: 'The Claude API key on this deployment was rejected.' }, { status: 502 });
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'rate', message: 'Claude is busy right now. Try again in a minute.' }, { status: 503 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: 'api', message: 'Claude returned an error (' + e.status + ').' }, { status: 502 });
    throw e;
  }
}
