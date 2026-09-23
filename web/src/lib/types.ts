export type EventType =
  | 'application'
  | 'interview'
  | 'offer'
  | 'denial'
  | 'withdrawn'
  | 'milestone'
  | 'layoff';

export type Role = {
  id: string;
  company: string;
  title: string;
  code?: string;
  start: string; // YYYY-MM
  end: string | null; // YYYY-MM, null while current
  location?: string;
  reason?: string;
  bullets: string[];
  skills: string[];
};

export type Ev = {
  id: string;
  date: string; // YYYY-MM-DD
  type: EventType;
  company?: string;
  title?: string;
  salary?: string;
  link?: string;
  notes?: string;
  status?: string; // free-text status from a tracker import
};

export type Education = { school: string; degree: string; years: string };
export type Cert = { name: string; issuer: string; year: string };

export type Profile = {
  name: string;
  headline: string;
  location: string;
  summary: string;
  targets: string[];
  email: string;
  linkedin: string;
  education: Education[];
  certs: Cert[];
  /** The scouting-report skills. Empty means: gather them from the roles. */
  skills: string[];
  /** The portrait in the art box: a built-in key (the example's 'george') or a stored image (an address, or a data URL while the card lives in this browser only). Missing means the monogram. */
  avatar?: string;
  /** The headshot the portrait is made from, kept so it can be redrawn later. For now the avatar is the photo itself. */
  photo?: string;
};

export type Settings = { group: 'role' | 'team'; view: 'cards' | 'timeline' };

/** The whole card. It is saved as one document, locally or in the account. */
export type State = {
  profile: Profile;
  roles: Role[];
  events: Ev[];
  brand: Record<string, number>; // company (normalised) -> colour pair index
  settings: Settings;
};

/** The career half of the document: everything a public page may show. */
export type CareerData = Omit<State, 'events' | 'settings'>;

export type Visibility = 'private' | 'unlisted' | 'public';

export type AuthUser = { id: string; email: string | null };

export type CloudCard = {
  slug: string | null;
  visibility: Visibility;
  state: State;
  updatedAt: string | null;
};
