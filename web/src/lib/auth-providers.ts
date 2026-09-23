/** Which "Continue with" providers are turned on: NEXT_PUBLIC_AUTH_PROVIDERS, e.g. "google,linkedin_oidc" or "none". Each also needs its app configured in Supabase Auth (see README). */
export type Provider = 'google' | 'linkedin_oidc' | 'apple';

export const enabledProviders: Provider[] = (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? 'google,linkedin_oidc,apple')
  .split(',').map((s) => s.trim()).filter((s): s is Provider => s === 'google' || s === 'linkedin_oidc' || s === 'apple');

export const linkedinOn = enabledProviders.includes('linkedin_oidc');
