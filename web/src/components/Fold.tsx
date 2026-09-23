'use client';
import { useCard } from './store';
import { useUI } from './ui';
import { fmtMonth } from '@/lib/dates';
import { huntStats, skillTally, status } from '@/lib/derived';

const Row = ({ h2, children, tone, hint }: { h2: string; children: React.ReactNode; tone?: 'private'; hint?: string }) => (
  <section className={'row' + (tone ? ' ' + tone : '')}>
    <h2>{h2}{hint && <span className="hint-q" tabIndex={0} role="img" aria-label={hint} data-tip={hint}>?</span>}{hint && <span className="only" aria-hidden="true">{hint}</span>}</h2>
    <div className="body">{children}</div>
  </section>
);
const Fig = ({ v, k }: { v: React.ReactNode; k: string }) => <span><b>{v}</b><small>{k}</small></span>;

/** The resume rows under the deck. Only the owner ever sees the Free agency row. */
export function Fold() {
  const { S } = useCard();
  const { openDrawer, setView, timeline } = useUI();
  const p = S.profile, st = status(S), h = huntStats(S), skills = skillTally(S);
  const toTimeline = () => { setView('timeline'); setTimeout(() => timeline.current?.zoomFreeAgency(), 0); };
  return (
    <div className="fold" id="fold">
      <Row h2="Scouting report">
        {p.summary ? <p>{p.summary}</p> : <p className="empty">Add a summary in Profile.</p>}
        {skills.length ? <div className="tiles">{skills.map(([k, n]) => <span key={k}>{k}{n > 1 ? <b>×{n}</b> : null}</span>)}</div> : null}
      </Row>
      <Row h2="Farm system">
        <ul className="list">{(p.education || []).length ? p.education.map((e, i) => <li key={i}><span>{e.school}{e.degree ? ' · ' + e.degree : ''}</span><span className="m">{e.years || ''}</span></li>) : <li className="empty">No education yet.</li>}</ul>
      </Row>
      <Row h2="Award inserts">
        <ul className="list">{(p.certs || []).length ? p.certs.map((c, i) => <li key={i}><span>{c.name}{c.issuer ? ' · ' + c.issuer : ''}</span><span className="m">{c.year || ''}</span></li>) : <li className="empty">None yet.</li>}</ul>
      </Row>
      {st.free ? (
        <Row h2="Free agency" tone="private" hint="Only visible to you">
          <div className="figs">
            <Fig v={st.days != null ? st.days : '–'} k="days" /><Fig v={h.apps} k="applications" />{h.open ? <Fig v={h.open} k="open" /> : null}
            <Fig v={h.interviews} k="interviews" /><Fig v={h.offers} k="offers" /><Fig v={h.apps ? Math.round((100 * h.responded) / h.apps) + '%' : '–'} k="response" />
            <Fig v={h.sinceLast == null ? '–' : h.sinceLast === 0 ? 'today' : h.sinceLast + 'd'} k="last activity" />
            <span className="actions"><button className="btn sm" onClick={() => openDrawer('event', { eventId: null })}>+ Event</button><button className="btn sm" onClick={toTimeline}>Timeline</button></span>
          </div>
        </Row>
      ) : st.current ? (
        <Row h2="Active roster">
          <div className="figs">
            <span><b style={{ fontSize: 14 }}>{st.current.company}</b><small>{st.current.title} · since {fmtMonth(st.current.start)}</small></span>
            <span className="actions"><button className="btn sm" onClick={() => openDrawer('event', { eventId: null })}>+ Event</button><button className="btn sm" onClick={toTimeline}>Timeline</button></span>
          </div>
        </Row>
      ) : null}
      <Row h2="Contact">
        <ul className="list inline">
          {p.email ? <li><a href={'mailto:' + p.email}>{p.email}</a></li> : null}
          {p.linkedin ? <li><a href={p.linkedin} target={p.linkedin === '#' ? undefined : '_blank'} rel="noopener" title={p.linkedin === '#' ? 'Example only' : undefined} onClick={p.linkedin === '#' ? (e) => e.preventDefault() : undefined}>LinkedIn</a></li> : null}
          {!p.email && !p.linkedin ? <li className="empty">Add contact details in Profile.</li> : null}
        </ul>
      </Row>
    </div>
  );
}
