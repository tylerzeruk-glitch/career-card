/**
 * The site's own marks, shared by every page: the pennant and the footer. Kept apart from the landing page so the
 * public page, the 404 and the login page can use them without loading the landing (or anything it brings in).
 */

export function Flag({ size = 22 }: { size?: number }) {
  return (
    <svg className="flag" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M9.97 11.67 L12.69 22.18 L14.24 35.35 L19.68 32.04 L25.34 30.42 L29.54 30.27 L36.89 31.08 L41.38 30.20 L49.98 26.74 L60.50 21.08 L51.31 20.56 L41.38 18.80 L35.05 16.52 L26.15 12.18 L20.27 10.49 L14.83 10.27 Z M5.93 5.41 L3.94 6.59 L3.43 8.87 L5.05 10.78 L13.58 57.34 L14.31 58.37 L15.49 58.51 L16.45 57.92 L16.74 56.38 L8.28 10.64 L9.16 7.33 L7.91 5.71 Z" fill="currentColor" fillRule="nonzero" />
    </svg>
  );
}

/** Where "Contact me" goes: a Cloudflare Email Routing forward to the owner's inbox (no mailbox behind it). Empty makes the link inert. */
const CONTACT_EMAIL = 'contact@careercards.app';

/** The footer every page ends on. `signInHref` null hides the sign-in link (signed in); `contact` false drops the site's contact link (on someone's shared page it would read as a way to reach them). */
export function SiteFoot({ signInHref = '/login', contact = true }: { signInHref?: string | null; contact?: boolean }) {
  return (
    <footer className="lfoot">
      <span><Flag size={14} /> CareerCards · © {new Date().getFullYear()}</span>
      <span>{contact ? <>See something wrong? {CONTACT_EMAIL ? <a href={'mailto:' + CONTACT_EMAIL}>Contact me</a> : <span className="soon" title="Coming soon">Contact me</span>}{signInHref && <> · </>}</> : null}{signInHref && <a href={signInHref}>Sign in</a>}</span>
    </footer>
  );
}
