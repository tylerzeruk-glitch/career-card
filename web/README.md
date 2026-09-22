# CareerCards (web app)

The Next.js version of CareerCards: the same cards, deck, resume rows and
timeline as `../index.html`, plus accounts. It runs in two modes:

- **Local mode** (no sign-in): the card lives in this browser's localStorage,
  exactly like the single-file version. This is what you get with no
  Supabase configuration at all.
- **Signed in**: the card is saved to the account (Supabase Postgres) and
  follows you between devices. You can give it an address (`/u/your-name`)
  and choose who can see it: only you (the default), anyone with the link,
  or public. The page shows the career only. Nothing from the job hunt
  (events, day count, log) ever leaves the owner's row.

## Run it

```
cd web
npm install
npm run dev
```

That is local mode. To turn on accounts:

1. Create a Supabase project. In the SQL editor, run the files in
   `supabase/migrations/` in order. They create the `cards` table (one row
   per user, owner-only through row-level security) and the `public_card`
   function that public pages read through. It returns only the career
   column, and only for rows whose owner chose to share them.
2. Authentication → Providers: turn on **Email** (magic links). Optionally
   **Google** and **LinkedIn (OIDC)**; each needs its own OAuth app with
   the callback URL Supabase shows you.
3. Authentication → URL configuration: set the site URL to where the app
   runs and add `<site>/auth/callback` to the redirect list.
4. Copy `.env.example` to `.env.local` and fill in the project URL and the
   publishable (anon) key from Project settings → API.
5. Authentication → SMTP settings: turn on custom SMTP. Supabase's built-in
   sender allows about two emails an hour, which is enough to test and not
   enough to use. Production uses Resend with the app's own domain:
   host `smtp.resend.com`, port 465, username `resend`, password a
   send-only Resend API key, sender `hello@<your domain>`. Then raise
   Authentication → Rate limits → emails per hour.

Deploy anywhere Next.js runs (Vercel is the easy path); set the same three
environment variables there, with `NEXT_PUBLIC_SITE_URL` as the deployed
origin.

## Single-file preview

`npm run artifact` bundles the client side into one HTML file (local mode,
sample career, no account) at `careercards-preview.html`. It is what gets
published as a claude.ai artifact for review comments; it is not the
deployed app.

## How it fits together

- `src/lib/` is pure: types, dates, derived stats, the sample career, the
  import parsers, and the deck layout maths. No React, no DOM state.
- `src/components/store.tsx` holds the document and decides where it is
  saved. Local mode writes localStorage on every change; signed in, it
  upserts the row (debounced) and shows a saved/saving dot in the menu.
  On first sign-in with a card already in the browser, a banner offers to
  bring it into the account.
- `src/components/` is the UI: `Deck` (the overlapping shelf), `Cards`
  (front and back), `Focus` (the big flipped view), `Fold` (resume rows),
  `Timeline` (pan/zoom SVG), `Drawer` (role, event, profile and page
  settings, log), `dialogs` (import, backup, help), `PublicCard` (the
  shareable page).
- `src/app/page.tsx` renders the signed-in card on the server so there is
  no flash of local data; `src/app/u/[slug]/page.tsx` is the public page;
  `src/proxy.ts` keeps the session cookie fresh.
- `src/styles/card.css` is the card stylesheet, shared with the single-file
  version; `src/app/globals.css` is the page chrome.

## Resume import

Import → Resume sends the file to `src/app/api/resume/route.ts`, which
asks Claude for the structure (roles with dates, highlights and skills,
education, certifications, contact details) as a typed object and returns
the same preview shape the LinkedIn import uses. It needs `ANTHROPIC_API_KEY`
on the server and a signed-in user, so the key is never exposed to
anonymous traffic. Without either, the browser falls back to the
date-pattern parser and says so in the preview.

## Not yet

- Clean up the Role, Event and Profile drawer forms: fewer fields up front,
  better date entry, inline validation.
- The "download a standalone HTML page" export. The public page replaces
  it once you sign in.
- Company logo lookup for the card art.
- Import libraries (SheetJS, JSZip, pdf.js, mammoth) are still loaded from
  cdnjs at import time rather than bundled.
