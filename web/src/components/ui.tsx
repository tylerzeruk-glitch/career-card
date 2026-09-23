'use client';
import { createContext, useContext, type MutableRefObject } from 'react';
import type { Ev } from '@/lib/types';

export type DrawerTab = 'role' | 'event' | 'profile' | 'share' | 'log';
export type ImportTab = 'linkedin' | 'resume' | 'tracker';

export type TimelineApi = { fitCareer: () => void; zoomFreeAgency: () => void };

export type UI = {
  view: 'cards' | 'timeline';
  setView: (v: 'cards' | 'timeline') => void;
  openDrawer: (tab: DrawerTab, opts?: { roleId?: string | null; eventId?: string | null; prefill?: Partial<Ev> }) => void;
  closeDrawer: () => void;
  openFocus: (id: string) => void;
  openImport: (tab?: ImportTab) => void;
  openBackup: () => void;
  openHelp: () => void;
  timeline: MutableRefObject<TimelineApi | null>;
  /** Selected event on the timeline (highlighted while its form is open). */
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
};

export const UICtx = createContext<UI | null>(null);
export const useUI = () => {
  const c = useContext(UICtx);
  if (!c) throw new Error('useUI outside the app');
  return c;
};
