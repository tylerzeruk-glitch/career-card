# CareerCards

A career page in the grammar of a ballplayer's page: teams are companies,
seasons are years, positions are titles, and the gap after a layoff is free
agency. One trading card per role, fanned into a pack (hover lifts a card, click opens it); a career line; a timeline with
company spans; and the job-hunt tracker folded in as the free-agency record.

Single file, no build step, no server. Data lives in the browser's local
storage under `careercard.v1`. `wireframe.html` is the layout study that
preceded it.

## What's on the page

- **Masthead:** name, headline · location · seasons, and the status pill
  (Free agent · day N, or Active · company).
- **Stat line:** seasons (years employed, overlaps merged), teams, positions,
  longest tenure per company, free-agent days, applications.
- **Cards view:** the shelf, oldest to newest, then the Free Agent card when no
  role is current. "By role" is one card per title; "By team" gathers
  consecutive roles at one company into a stack you click to spread. Click a
  card to open it large; click again to flip. Arrow keys move, Esc closes,
  Edit opens the role in the drawer.
- **Card front (Topps):** company wordmark in the company's colours, monogram
  and role badge in the art area, name, title · years, card number.
- **Card back (riso):** company bar, seasons table of every role at that
  company (current one in red), highlights, skill tiles, how it ended, card
  number in the set.
- **Below the fold:** free-agency figures, scouting report (summary + skills
  rolled up across roles), education ("farm system"), award inserts (certs and awards),
  contact.
- **Timeline view:** the pan/zoom viewport from `job-hunt-timeline`, with role
  spans above the line in company colours, a hatched free-agency zone, and the
  job-hunt events on the line. Career / Free agency / − / + / Today presets.
- **Drawer:** Role, Event, Profile and Log tabs. Team colours are chosen per
  company from ten validated pairs; a stable default is derived from the name.

## Import

- **LinkedIn export:** Settings → Data privacy → Get a copy of your data. Drop
  the zip, or Positions.csv (+ Education, Skills, Certifications, Profile).
  Read with JSZip; dates like "Jan 2021" are parsed to months.
- **Resume:** PDF (pdf.js), Word (mammoth) or text. The text is extracted in
  the browser. Inside a claude.ai artifact the structure is extracted by
  Claude through the `sample` capability (viewer consents, viewer pays);
  elsewhere, or if declined, a date-pattern parser produces a rough draft.
  Every path lands in an editable preview before anything is saved.
- **Job-hunt tracker:** the xlsx/csv importer from `job-hunt-timeline`, mapping
  the Application Tracker columns to application events.
- **Backup:** JSON of the whole state, restored from the ··· menu.

LinkedIn's API does not expose positions to third-party apps, so "sign in with
LinkedIn and import" is not on the table; the data export is the supported
route. SSO and hosted, shareable pages are the accounts phase.

## Share

Share builds a standalone HTML career page: cards (flippable), the career line,
scouting report, education, certs, contact, and nothing from the job hunt.
Optionally a "Free agent · open to" card with no dates or counts. Download,
copy, or preview in a new tab. Inside an artifact, downloads go through the
`downloads` capability.

## Publishing as an artifact

Strip the document wrappers (keep `<title>`, the font link, both `<style>`
blocks and the body) and publish with
`capabilities: {downloads: true, sample: {}}`.

## The web app

`web/` is the Next.js version with accounts: the same cards, pack, rows and
timeline, saved to a Supabase account when you sign in, with a shareable
page at `/u/your-name` that shows the career and never the job hunt. It
runs in local mode (this browser only) without any configuration. See
`web/README.md` for setup. `index.html` remains the single-file version.

## Open items

- Company logo lookup or illustration for the art area (needs network or the
  accounts phase). Monogram + team colours for now.
- Accounts: login (magic link, Google, LinkedIn SSO), hosted data, share as a
  link with public and private views. That is the move from one HTML file to
  an app with a backend. Started in `web/`: sign-in, per-user saving and
  the public page are there; the Free agency row and log are owner-only.
- Past job hunts as their own free-agency zones.
- Clean up how entry works in the Role, Event and Profile flyout (web app).
- Greenhouse.io integration for the job-hunt timeline (web app).
- A contact-us sheet behind the landing page's "See something wrong? Contact us" link (it is a mailto for now).
