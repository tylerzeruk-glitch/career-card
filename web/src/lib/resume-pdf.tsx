import { Document, Font, Link, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { State } from './types';
import { careerStats, roles, skillTally } from './derived';
import { fmtMonth } from './dates';

/**
 * The card as a one-column resume: the same rows the public page shows, set in the site's faces on Letter paper.
 * Nothing from the job hunt is on it; the public page's data is all it gets.
 */

const BARLOW = 'Barlow Condensed', CASLON = 'Libre Caslon Text', LILITA = 'Lilita One';
const INK = '#1c1b18', MUTED = '#6b6559', RED = '#dc4432', HAIR = '#d8d2c4';

let registered = '';
function fonts(site: string) {
  if (registered === site) return;
  Font.register({ family: BARLOW, src: site + '/fonts/barlow-condensed-700.woff', fontWeight: 700 });
  Font.register({ family: CASLON, src: site + '/fonts/libre-caslon.woff' });
  Font.register({ family: LILITA, src: site + '/fonts/lilita-one.woff' });
  Font.registerHyphenationCallback((w) => [w]);
  registered = site;
}

const s = StyleSheet.create({
  page: { paddingTop: 50, paddingBottom: 56, paddingHorizontal: 54, fontFamily: CASLON, fontSize: 10, lineHeight: 1.45, color: INK },
  name: { fontFamily: BARLOW, fontSize: 27, letterSpacing: 0.8, textTransform: 'uppercase', lineHeight: 1 },
  headline: { fontFamily: CASLON, fontSize: 11.5, color: MUTED, marginTop: 5 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, fontFamily: BARLOW, fontSize: 8.5, letterSpacing: 1.1, textTransform: 'uppercase', color: MUTED },
  metaItem: { marginRight: 14 },
  link: { color: MUTED, textDecoration: 'none' },
  rule: { height: 2.5, backgroundColor: RED, marginTop: 14, marginBottom: 6 },
  section: { marginTop: 14 },
  h2: { fontFamily: BARLOW, fontSize: 9.5, letterSpacing: 1.8, textTransform: 'uppercase', color: RED, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 0.6, borderBottomColor: HAIR },
  para: { fontSize: 10, lineHeight: 1.5 },
  role: { marginBottom: 11 },
  roleHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontFamily: BARLOW, fontSize: 12.5, letterSpacing: 0.3, textTransform: 'uppercase' },
  company: { fontFamily: CASLON, fontSize: 10, color: MUTED, marginTop: 1 },
  dates: { fontFamily: BARLOW, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', color: MUTED, marginLeft: 12 },
  bullets: { marginTop: 4 },
  bullet: { flexDirection: 'row', marginBottom: 2 },
  dot: { width: 11, color: RED },
  bulletText: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  chip: { fontFamily: BARLOW, fontSize: 7.5, letterSpacing: 0.8, textTransform: 'uppercase', color: '#fff', backgroundColor: RED, paddingVertical: 1.5, paddingHorizontal: 4, marginRight: 4, marginBottom: 3, borderRadius: 1.5 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  listMuted: { fontFamily: BARLOW, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', color: MUTED, marginLeft: 12 },
  chipBig: { fontSize: 8.5, paddingVertical: 2, paddingHorizontal: 5, marginRight: 5, marginBottom: 4 },
  foot: { position: 'absolute', bottom: 26, fontFamily: BARLOW, fontSize: 7.5, letterSpacing: 1, textTransform: 'uppercase', color: MUTED },
  wordmark: { fontFamily: LILITA, fontSize: 8.5, textTransform: 'none', letterSpacing: 0.2, color: INK },
});

const span = (start: string, end: string | null) => `${fmtMonth(start)} – ${end ? fmtMonth(end) : 'Present'}`;
const tidyUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

export function ResumeDoc({ S, slug, site }: { S: State; slug: string; site: string }) {
  const p = S.profile, rs = roles(S).slice().reverse(), cs = careerStats(S), skills = skillTally(S, 24);
  const pageUrl = site.replace(/^https?:\/\//, '') + '/u/' + slug;
  const link = p.linkedin && p.linkedin !== '#' ? p.linkedin : '';
  const stat = cs ? [[cs.seasons, 'season'], [cs.teams, 'team'], [cs.positions, 'position']].map(([v, k]) => `${v} ${k}${v === 1 ? '' : 's'}`).join(' · ') : '';
  return (
    <Document title={(p.name || 'Career') + ' · Resume'} author={p.name || 'CareerCards'} producer="CareerCards" creator="CareerCards">
      <Page size="LETTER" style={s.page}>
        <View>
          <Text style={s.name}>{p.name || 'Career'}</Text>
          {p.headline ? <Text style={s.headline}>{p.headline}</Text> : null}
          <View style={s.meta}>
            {p.location ? <Text style={s.metaItem}>{p.location}</Text> : null}
            {p.email ? <Link style={[s.link, s.metaItem]} src={'mailto:' + p.email}>{p.email}</Link> : null}
            {link ? <Link style={[s.link, s.metaItem]} src={link}>{tidyUrl(link)}</Link> : null}
            <Link style={[s.link, s.metaItem]} src={site + '/u/' + slug}>{pageUrl}</Link>
          </View>
          <View style={s.rule} />
          {stat ? <Text style={[s.meta, { marginTop: 0 }]}>{stat}</Text> : null}
        </View>

        {p.summary ? <View style={s.section}><Text style={s.h2}>Scouting report</Text><Text style={s.para}>{p.summary}</Text></View> : null}

        {rs.length > 0 ? <View style={s.section}>
          <Text style={s.h2}>Experience</Text>
          {rs.map((r) => (
            <View key={r.id} style={s.role} wrap={false}>
              <View style={s.roleHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{r.title || 'Role'}</Text>
                  <Text style={s.company}>{[r.company, r.location].filter(Boolean).join(' · ')}</Text>
                </View>
                <Text style={s.dates}>{span(r.start, r.end)}</Text>
              </View>
              {r.bullets.length > 0 ? <View style={s.bullets}>{r.bullets.map((b, i) => <View key={i} style={s.bullet}><Text style={s.dot}>•</Text><Text style={s.bulletText}>{b}</Text></View>)}</View> : null}
              {r.skills.length > 0 ? <View style={s.chips}>{r.skills.map((k) => <Text key={k} style={s.chip}>{k}</Text>)}</View> : null}
            </View>
          ))}
        </View> : null}

        {p.education.length > 0 ? <View style={s.section} wrap={false}>
          <Text style={s.h2}>Education</Text>
          {p.education.map((e, i) => <View key={i} style={s.listRow}><Text>{[e.school, e.degree].filter(Boolean).join(' · ')}</Text>{e.years ? <Text style={s.listMuted}>{e.years}</Text> : null}</View>)}
        </View> : null}

        {p.certs.length > 0 ? <View style={s.section} wrap={false}>
          <Text style={s.h2}>Certifications</Text>
          {p.certs.map((c, i) => <View key={i} style={s.listRow}><Text>{[c.name, c.issuer].filter(Boolean).join(' · ')}</Text>{c.year ? <Text style={s.listMuted}>{c.year}</Text> : null}</View>)}
        </View> : null}

        {skills.length > 0 ? <View style={s.section} wrap={false}>
          <Text style={s.h2}>Skills</Text>
          <View style={s.chips}>{skills.map(([k]) => <Text key={k} style={[s.chip, s.chipBig]}>{k}</Text>)}</View>
        </View> : null}

        <Text style={[s.foot, { left: 54 }]} fixed><Text style={s.wordmark}>CareerCards</Text>  ·  {pageUrl}</Text>
      </Page>
    </Document>
  );
}

/** The PDF bytes for a card. `site` is where the fonts and the page live. */
export async function resumePdf(S: State, slug: string, site: string): Promise<Buffer> {
  fonts(site);
  return renderToBuffer(<ResumeDoc S={S} slug={slug} site={site} />);
}

/** A safe download name: "Jordan-Rabidou-resume.pdf". */
export function resumeFileName(name: string) {
  const base = (name || 'career').trim().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'career';
  return base + '-resume.pdf';
}
