# CareerCards (web app)

The Next.js version of CareerCards: the same cards, pack, resume rows and
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
2. Authentication → Providers: turn on **Email** (magic links). The sign-in
   page also offers **Google**, **LinkedIn (OIDC)** and **Apple**; each
   needs its own OAuth app registered with the provider, using the callback
   URL Supabase shows you (`https://<project>.supabase.co/auth/v1/callback`),
   and its client id and secret pasted into the provider's row in Supabase.
   `NEXT_PUBLIC_AUTH_PROVIDERS` lists which buttons to show: unset shows
   all three and `none` hides them all, so hide any that are not configured yet.
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

`npm run artifact` bundles the client side into one HTML file (the landing
page, then the app in local mode with the sample career, no account) at
`careercards-preview.html`. It is what gets
published as a claude.ai artifact for review comments; it is not the
deployed app.

## How it fits together

- `src/lib/` is pure: types, dates, derived stats, the sample career, the
  import parsers, and the pack layout maths. No React, no DOM state.
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
  no flash of local data, and the landing page (`Landing`) for anyone
  signed out; `src/app/app/page.tsx` is the app without an account (the
  card lives in that browser); `src/app/u/[slug]/page.tsx` is the public
  page; `src/proxy.ts` keeps the session cookie fresh.
- `src/styles/card.css` is the card stylesheet, shared with the single-file
  version; `src/app/globals.css` is the page chrome.

## Portraits

A profile can carry an `avatar`. The example career's is the built-in
`george`: ten PNGs under `public/avatars/`, one per team colour pair, made
from one riso-style portrait with the cream keyed out, the bust filled to a
flat bottom and the shirt recoloured to the pair's frame colour. `RoleCard`
shows it in the art box in place of the monogram (`src/lib/avatar.ts`
picks the file; the single-file preview inlines them).

Players add their own under Profile → Player → Portrait (`PortraitPicker`
in `src/components/Drawer.tsx`). A headshot comes from a file, a drop on
the preview square, or the player's LinkedIn profile photo. The browser
crops the centre square and scales it (`src/lib/portrait.ts`), then saves
it straight away: signed in, to the `portraits` storage bucket at
`<user id>/photo.jpg` (public read, owner write; migration
`0003_portraits.sql`) and the address goes on the profile as `avatar` and
`photo`; signed out, as a small data URL inside the local card, which the
store moves into the bucket on the first save after signing in. A photo
fills the art box edge to edge (`img.photo` in `card.css`); the built-in
busts keep their cut-out bottom edge. Redrawing the photo in the house
style is the next step down (`photo` is kept for it).

**Drawing it.** "Draw me in the house style" (signed in, photo present)
asks for four takes at once, each a `POST /api/portrait/draw`: the photo
goes to OpenAI's image edit endpoint with the house prompt from the
Avatars canvas (`src/lib/riso-prompt.ts`; model and quality from
`OPENAI_IMAGE_MODEL`, default `gpt-image-1`, and `OPENAI_IMAGE_QUALITY`,
default `medium`; `input_fidelity: high` to hold the likeness, dropped
if the model refuses it). The result is finished in `src/lib/riso.ts`,
a port of the steps George went through: cream keyed out (the border's
median colour, only where it touches the border, soft edge), the bust
squared up bottom-anchored with everything under the arc, and out to
both edges, filled with the shirt), stored at the model's full size as a
palette PNG under `<user id>/takes/`. "Use this one"
(`POST /api/portrait/pick`) recolours the fabric to each of the ten team
frame colours, stores `riso-0.png` … `riso-9.png` (600px palette PNGs) in the player's folder,
and saves the avatar as that address with a `{pair}`
slot, which `avatarSrc` fills per card. Twelve takes per player in a
rolling 24 hours (`TAKES_PER_DAY`): the takes folder is the count, so
picking one does not clear it; takes older than a day are removed on the
next deal; accounts listed in `PORTRAIT_UNLIMITED` (user ids, comma-separated) have no limit. Both routes need a signed-in user; the button only renders for
one, and the key never leaves the server. Needs `OPENAI_API_KEY`
on the server (Vercel, sensitive), like the Anthropic key; without it the
button says drawing is not switched on.

**The LinkedIn photo.** LinkedIn's API gives third-party apps nothing but
sign-in, and sign-in with OpenID Connect includes a `picture` claim: a
short-lived address of the profile photo on LinkedIn's CDN, refreshed each
time the player signs in or links with LinkedIn. `GET
/api/portrait/linkedin` reads it from the signed-in user's `linkedin_oidc`
identity, fetches the bytes (the browser cannot, there is no CORS) and
hands them back; the picker then treats them like a chosen file. If the
account has no LinkedIn identity the picker calls `linkIdentity`, which
sends the player through LinkedIn and back to `/?portrait=linkedin`, where
the app reopens the Profile drawer and the picker carries on; if the
address has expired it sends them through a fresh LinkedIn sign-in the
same way. Needs, in Supabase Auth: the LinkedIn (OIDC) provider configured
with a LinkedIn app that has the "Sign In with LinkedIn using OpenID
Connect" product (scopes `openid profile email`), and **Allow manual
linking** turned on (Authentication → Settings) so a player who signed in
with email or Google can link LinkedIn. Then include `linkedin_oidc` in
`NEXT_PUBLIC_AUTH_PROVIDERS`; until it is, the button shows as "Coming
soon".

## Light and dark

The dark palette is in `src/app/globals.css` but held back: `DARK_MODE` in
`src/lib/theme.ts` is `false`, so every page is pinned light (the system
preference is ignored) and the sun/moon toggle on each page is shown
disabled. Set it to `true` to turn dark mode on; the toggle then remembers
the choice in localStorage and a script in the document head applies it
before first paint.

## Resume import

Import → Resume sends the file to `src/app/api/resume/route.ts`, which
asks Claude for the structure (roles with dates, highlights and skills,
education, certifications, contact details) as a typed object and returns
the same preview shape the LinkedIn import uses. It needs `ANTHROPIC_API_KEY`
on the server and a signed-in user, so the key is never exposed to
anonymous traffic. Without either, the browser falls back to the
date-pattern parser and says so in the preview.

## Job-hunt tracker import

Import → Job-hunt tracker opens the workbook in the browser (SheetJS) and,
for a signed-in user, sends the chosen sheet as tab-separated text to
`src/app/api/tracker/route.ts`. Claude (Sonnet; the sheet is small,
structured text) returns the events it records in the timeline's own
terms: an application per row, plus interview, offer, denial or withdrawal
events wherever the sheet has a date for them, and the row's status text
kept on the application. Signed out, or if Claude is unavailable, the
columns are matched by header and each row becomes an application; both
paths land in the same preview, and either can be switched to from the
dialog. Duplicates (same date, type, company and title) are skipped on save.

## Not yet

- Clean up the Role, Event and Profile drawer forms: fewer fields up front,
  better date entry, inline validation.
- The "download a standalone HTML page" export. The public page replaces
  it once you sign in.
- Company logo lookup for the card art.
- Import libraries (SheetJS, JSZip, pdf.js, mammoth) are still loaded from
  cdnjs at import time rather than bundled.
- A contact sheet for the landing page footer. "Contact me" is a mailto to
  hello@careercards.app, which Cloudflare Email Routing forwards to the
  owner's inbox (the domain's DNS is at Cloudflare; Email → Email Routing on
  the zone, a verified destination address, a custom address that sends to
  it; no mailbox exists). `CONTACT_EMAIL` in `src/components/Landing.tsx`
  is the address; empty makes the link inert again.
- Greenhouse.io integration: pull applications and their stages into the
  free-agency timeline instead of logging them by hand.
- Portraits: "describe yourself in a sentence" as an alternative to a
  photo (the canvas's step 01), and a way to nudge a take (hat on, no
  glasses) before dealing again.

## Sign-in email

Supabase Auth sends the magic-link email from its own templates, so the
site's look lives in `supabase/templates/`: `magic-link.html` (a returning
player) and `confirm-signup.html` (a first sign-in, which Supabase sends
from the Confirm signup template instead). Both are table-based email
HTML: the wordmark as an image served from the site
(`public/email/wordmark.png`, made from the Flag and the Lilita One
wordmark at 2x), the site's colours, a real button on the confirmation
link and the plain link under it. Email clients do not load web fonts, so
the type falls back to Arial Narrow and Georgia where the site has Barlow
Condensed and Libre Caslon.

To install them: Supabase dashboard → Authentication → Email Templates.
Under **Magic Link** set the subject to `Your CareerCards sign-in link`
and paste `magic-link.html` as the body; under **Confirm signup** set the
subject to `Welcome to CareerCards: confirm your email` and paste
`confirm-signup.html`. Keep the `{{ .ConfirmationURL }}` placeholders as
they are. The wordmark image must be deployed before the first send.

## Share card

A player's page unfurls with their own cards. `src/app/u/[slug]/opengraph-image.tsx`
draws a 1200 x 630 picture on request from the same data as the page:
name, headline, the season count, and a hand of their three most recent
cards (the free-agent card takes the last slot when they are on the
market), rebuilt for the Open Graph renderer in `src/lib/og/share.tsx`
(flex and absolute positioning only, so the card front is redrawn there
rather than from `card.css`; the three faces are served from
`public/fonts`). The page's metadata sets the title and description to
match. A page that is not shared gets the example's picture, as it 404s.
`/share-card/opengraph-image` draws the example the same way, as the
reference for the renderer. LinkedIn caches unfurls hard; its Post
Inspector refreshes one.

The root URL keeps a static picture. Links to the site unfurl with `public/og.png` (Open Graph and Twitter tags in `src/app/layout.tsx`). The picture is a screenshot of the hidden `/share-card` route, which renders the hero at 1200 x 630. To regenerate it after a design change:

```
npx next build && npx next start -p 3111
# in another shell, with Playwright's Chromium
node -e "import('playwright').then(async ({chromium})=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1200,height:630},deviceScaleFactor:2})).newPage();await p.goto('http://127.0.0.1:3111/share-card',{waitUntil:'networkidle'});const f=await p.evaluate(async()=>{await document.fonts.ready;return [...document.fonts].filter(x=>x.status==='loaded').map(x=>x.family)});console.log(f);await p.screenshot({path:'public/og.png'});await b.close();})"
```

The printed list must include Lilita One, Barlow Condensed and Libre Caslon Text; if a font request failed, the picture has fallback type. Rerun until it does.

