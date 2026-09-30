import type { SupabaseClient } from '@supabase/supabase-js';
import { TAKES_PER_DAY, unlimited } from './riso-prompt';

/** What each paid route allows a user per day (UTC). Counted in the database, see supabase/migrations/0006_usage_quota.sql. */
export const DAILY = { portrait: TAKES_PER_DAY, resume: 10, tracker: 10 } as const;
export type Paid = keyof typeof DAILY;

/**
 * Take one use of a paid route for the signed-in user, before the paid call is made. The count is raised
 * atomically in the database, so parallel requests each get their own number and none slip past the cap.
 * Accounts listed in PORTRAIT_UNLIMITED (the owner, testers) are counted but never capped.
 */
export async function spend(sb: SupabaseClient, userId: string, kind: Paid): Promise<{ ok: true; left: number } | { ok: false; status: number; message: string }> {
  const { data, error } = await sb.rpc('bump_usage', { p_kind: kind });
  if (error || typeof data !== 'number') {
    console.error('bump_usage', kind, error?.message);
    return { ok: false, status: 503, message: 'Could not check today’s limit. Try again in a moment.' };
  }
  if (unlimited(userId)) return { ok: true, left: 99 };
  if (data > DAILY[kind]) return { ok: false, status: 429, message: 'That is the limit for today. Try again tomorrow.' };
  return { ok: true, left: DAILY[kind] - data };
}
