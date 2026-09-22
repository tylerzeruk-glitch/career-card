import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicCard } from '@/components/PublicCard';
import { hydrate } from '@/lib/derived';
import { supabaseServer } from '@/lib/supabase/server';
import type { State } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function load(slug: string): Promise<State | null> {
  const sb = await supabaseServer();
  if (!sb) return null;
  const { data } = await sb.from('public_cards').select('data').eq('slug', slug).maybeSingle();
  if (!data) return null;
  // the view carries the career only; events never leave the owner's row
  return hydrate({ ...(data.data as Partial<State>), events: [] });
}

export async function generateMetadata({ params }: PageProps<'/u/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const S = await load(slug);
  if (!S) return { title: 'Career Card' };
  return { title: (S.profile.name || 'Career') + ' · Career Card', description: S.profile.summary || S.profile.headline || undefined, robots: { index: false } };
}

/** Someone's card at its address. Shows the career, never the job hunt. */
export default async function Page({ params }: PageProps<'/u/[slug]'>) {
  const { slug } = await params;
  const S = await load(slug);
  if (!S) notFound();
  return <PublicCard S={S} />;
}
