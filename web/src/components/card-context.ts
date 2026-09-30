'use client';
/**
 * The card's context and its hook, apart from the provider in store.tsx. Views that only read the card (the timeline,
 * the focus view, also shown on the public page and the landing) import this, so they don't bring in the account
 * client and the save code that the provider needs.
 */
import { createContext, useContext } from 'react';
import type { AuthUser, State, Visibility } from '@/lib/types';

export type SyncStatus = 'local' | 'saved' | 'saving' | 'error';

export type Store = {
  S: State;
  sampleMode: boolean;
  user: AuthUser | null;
  slug: string | null;
  visibility: Visibility;
  sync: SyncStatus;
  /** Replace the document (and leave sample mode). */
  update: (fn: (s: State) => State, opts?: { keepSample?: boolean }) => void;
  /** Replace the whole document wholesale (import, restore, migrate). */
  replace: (s: State, sample?: boolean) => void;
  reset: () => void;
  setMeta: (m: { slug?: string | null; visibility?: Visibility }) => Promise<string | null>;
  /** Local data that could be brought into a freshly signed-in account. */
  migration: State | null;
  migrate: (bring: boolean) => void;
  flash: (msg: string) => void;
  flashMsg: string | null;
  signOut: () => Promise<void>;
  /** Deal the example career again (local mode). */
  loadExample: () => void;
};

export const Ctx = createContext<Store | null>(null);
export const useCard = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCard outside CardProvider');
  return c;
};
