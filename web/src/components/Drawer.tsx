'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCard } from './store';
import { useUI, type DrawerTab } from './ui';
import type { Ev, EventType, Role, Visibility } from '@/lib/types';
import { fmtShort, parseMonth, todayISO } from '@/lib/dates';
import { PAIRS, TYPES, codeFor, hashIdx, huntStats, norm, slugify, sortedEvents, statusOf, uid } from '@/lib/derived';

export type DrawerState = { open: boolean; tab: DrawerTab; roleId: string | null; eventId: string | null; prefill: Partial<Ev> | null; nonce: number };

export function Drawer({ d }: { d: DrawerState }) {
  const { openDrawer, closeDrawer } = useUI();
  return (
    <>
      <div className="scrim" onClick={closeDrawer} />
      <aside className={'drawer' + (d.open ? ' open' : '') + (d.tab === 'log' ? ' wide' : '')} aria-hidden={!d.open}>
        <div className="drawer-head">
          <div className="tabs">
            {(['role', 'event', 'profile', 'log'] as DrawerTab[]).map((t) => (
              <button key={t} className={'tab' + (d.tab === t ? ' on' : '')} onClick={() => openDrawer(t, t === 'role' ? { roleId: null } : t === 'event' ? { eventId: null } : undefined)}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          <button className="btn icon" title="Close" onClick={closeDrawer}>×</button>
        </div>
        <div className="drawer-body">
          {d.tab === 'role' && <RoleForm key={'r' + d.nonce} roleId={d.roleId} />}
          {d.tab === 'event' && <EventForm key={'e' + d.nonce} eventId={d.eventId} prefill={d.prefill} />}
          {d.tab === 'profile' && <ProfileForm key={'p' + d.nonce} />}
          {d.tab === 'log' && <Log />}
        </div>
      </aside>
    </>
  );
}

const field = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

// ---------- role ----------
function RoleForm({ roleId }: { roleId: string | null }) {
  const { S, update, flash } = useCard();
  const { closeDrawer, openDrawer } = useUI();
  const r = useMemo(() => S.roles.find((x) => x.id === roleId) || null, [S.roles, roleId]);
  const [company, setCompany] = useState(r?.company || '');
  const [title, setTitle] = useState(r?.title || '');
  const [code, setCode] = useState(r?.code || '');
  const [codeTouched, setCodeTouched] = useState(!!r?.code);
  const [current, setCurrent] = useState(!!(r && !r.end));
  const [swatch, setSwatch] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const companyRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!roleId) companyRef.current?.focus(); }, [roleId]);
  const curSwatch = swatch != null ? swatch : S.brand[norm(company)] != null ? S.brand[norm(company)] : hashIdx(company);
  const companies = [...new Set(S.roles.map((x) => x.company.trim()))].sort();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const rec: Omit<Role, 'id'> = {
      company: company.trim(), title: title.trim(), code: (code.trim() || codeFor(title)).toUpperCase().slice(0, 4),
      start: parseMonth(field(fd, 'start')) || '', end: current ? null : parseMonth(field(fd, 'end')) || null,
      location: field(fd, 'location'), reason: field(fd, 'reason'),
      bullets: field(fd, 'bullets').split('\n').map((s) => s.trim().replace(/^[-•·*]\s*/, '')).filter(Boolean),
      skills: field(fd, 'skills').split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (!rec.company || !rec.title || !rec.start) { setMsg(field(fd, 'start') && !rec.start ? 'Start month should look like 2021-03 or Mar 2021.' : 'Company, title and start are needed.'); return; }
    if (rec.end && rec.end < rec.start) { setMsg('It ended before it started.'); return; }
    update((s) => {
      const brand = swatch != null ? { ...s.brand, [norm(rec.company)]: swatch } : s.brand;
      const roles = roleId ? s.roles.map((x) => (x.id === roleId ? { ...x, ...rec } : x)) : [...s.roles, { id: uid(), ...rec }];
      return { ...s, roles, brand };
    });
    if (roleId) { flash('Saved.'); closeDrawer(); } else { flash('Added.'); openDrawer('role', { roleId: null }); }
  };
  const del = () => { if (!r || !confirm(`Delete ${r.title} at ${r.company}?`)) return; update((s) => ({ ...s, roles: s.roles.filter((x) => x.id !== r.id) })); flash('Deleted.'); closeDrawer(); };

  return (
    <section>
      <h2>{roleId ? 'Edit role' : 'Add a role'}</h2>
      <form className="form" autoComplete="off" onSubmit={submit}>
        <div className="field"><label htmlFor="r-company">Company (team)</label><input id="r-company" ref={companyRef} list="companies" required placeholder="Acme Corp" value={company} onChange={(e) => { setCompany(e.target.value); setSwatch(null); }} /><datalist id="companies">{companies.map((c) => <option key={c} value={c} />)}</datalist></div>
        <div className="row3">
          <div className="field" style={{ gridColumn: 'span 2' }}><label htmlFor="r-title">Title (position)</label><input id="r-title" required placeholder="Program Delivery Lead" value={title} onChange={(e) => { setTitle(e.target.value); if (!codeTouched) setCode(codeFor(e.target.value)); }} /></div>
          <div className="field"><label htmlFor="r-code">Badge</label><input id="r-code" maxLength={4} placeholder="PDL" value={code} onChange={(e) => { setCode(e.target.value); setCodeTouched(true); }} /></div>
        </div>
        <div className="row2">
          <div className="field"><label htmlFor="r-start">Started</label><input type="month" id="r-start" name="start" required placeholder="YYYY-MM or Mar 2021" defaultValue={r?.start || ''} /></div>
          <div className="field"><label htmlFor="r-end">Ended</label><input type="month" id="r-end" name="end" placeholder="YYYY-MM, blank if current" defaultValue={r?.end || ''} disabled={current} /></div>
        </div>
        <label className="check"><input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} /> I still work here</label>
        <div className="row2">
          <div className="field"><label htmlFor="r-location">Location</label><input id="r-location" name="location" placeholder="Chicago, IL" defaultValue={r?.location || ''} /></div>
          <div className="field"><label htmlFor="r-reason">How it ended</label><input id="r-reason" name="reason" placeholder="Promoted · Left for · Role eliminated" defaultValue={r?.reason || ''} /></div>
        </div>
        <div className="field"><label htmlFor="r-bullets">Highlights, one per line</label><textarea id="r-bullets" name="bullets" placeholder={'Led delivery for a portfolio of clients\nRan intake, triage and UAT'} defaultValue={(r?.bullets || []).join('\n')} /></div>
        <div className="field"><label htmlFor="r-skills">Skills, comma separated</label><input id="r-skills" name="skills" placeholder="Program management, UAT, Client delivery" defaultValue={(r?.skills || []).join(', ')} /></div>
        <div className="field"><label>Team colors</label>
          <div className="swatches">{PAIRS.map((p, i) => <button type="button" key={i} className={'sw' + (i === curSwatch ? ' on' : '')} style={{ '--a': p[0], '--b': p[1] } as React.CSSProperties} title={'Color pair ' + (i + 1)} onClick={() => setSwatch(i)} />)}</div>
          <span className="help">Shared by every role at this company.</span>
        </div>
        <div className="form-foot">
          <button className="btn primary" type="submit">{roleId ? 'Save role' : 'Add role'}</button>
          <button className="btn" type="button" onClick={closeDrawer}>Cancel</button>
          {roleId && <button className="btn danger" type="button" onClick={del}>Delete</button>}
          <span className="spacer" /><span className="status">{msg}</span>
        </div>
      </form>
    </section>
  );
}

// ---------- event ----------
function EventForm({ eventId, prefill }: { eventId: string | null; prefill: Partial<Ev> | null }) {
  const { S, update, flash } = useCard();
  const { closeDrawer, openDrawer, setSelectedId } = useUI();
  const e0 = useMemo(() => S.events.find((x) => x.id === eventId) || null, [S.events, eventId]);
  const base: Partial<Ev> = e0 || prefill || {};
  const [type, setType] = useState<EventType>((base.type as EventType) || 'application');
  const [msg, setMsg] = useState('');
  const ms = type === 'layoff' || type === 'milestone';
  const companies = [...new Set(S.events.map((x) => (x.company || '').trim()).filter(Boolean))].sort();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const rec = { date: field(fd, 'date'), type, company: field(fd, 'company'), title: field(fd, 'title'), salary: field(fd, 'salary'), link: field(fd, 'link'), notes: field(fd, 'notes') };
    if (!rec.date) { setMsg('Pick a date.'); return; }
    if (!rec.company && !rec.title) { setMsg('Give it a company or a title.'); return; }
    update((s) => ({ ...s, events: eventId ? s.events.map((x) => (x.id === eventId ? { ...x, ...rec } : x)) : [...s.events, { id: uid(), ...rec }] }));
    if (eventId) { setSelectedId(null); flash('Saved.'); closeDrawer(); } else { flash('Added.'); openDrawer('event', { eventId: null, prefill: { type } }); }
  };
  const del = () => { if (!e0 || !confirm(`Delete ${TYPES[e0.type].label.toLowerCase()} ${e0.company || e0.title || ''} on ${e0.date}?`)) return; update((s) => ({ ...s, events: s.events.filter((x) => x.id !== e0.id) })); setSelectedId(null); flash('Deleted.'); closeDrawer(); };

  return (
    <section>
      <h2>{eventId ? 'Edit event' : 'Add a job-hunt event'}</h2>
      <form className="form" autoComplete="off" onSubmit={submit}>
        <div className="row2">
          <div className="field"><label htmlFor="f-date">Date</label><input type="date" id="f-date" name="date" required defaultValue={base.date || todayISO()} /></div>
          <div className="field"><label htmlFor="f-type">Type</label>
            <select id="f-type" value={type} onChange={(e) => setType(e.target.value as EventType)}>
              {(['application', 'interview', 'offer', 'denial', 'withdrawn', 'milestone', 'layoff'] as EventType[]).map((t) => <option key={t} value={t}>{t === 'layoff' ? 'Layoff / job loss' : TYPES[t].label}</option>)}
            </select></div>
        </div>
        <div className="field"><label htmlFor="f-company">Company</label><input id="f-company" name="company" list="ev-companies" placeholder="Acme Corp" defaultValue={base.company || ''} /><datalist id="ev-companies">{companies.map((c) => <option key={c} value={c} />)}</datalist></div>
        <div className="field"><label htmlFor="f-title">{ms ? 'What happened' : 'Job title'}</label><input id="f-title" name="title" placeholder="Program Delivery Lead" defaultValue={base.title || ''} /></div>
        <div className="row2">
          <div className="field"><label htmlFor="f-salary">Salary</label><input id="f-salary" name="salary" placeholder="$120k" defaultValue={base.salary || ''} /></div>
          <div className="field"><label htmlFor="f-link">Link</label><input id="f-link" name="link" type="url" placeholder="https://" defaultValue={base.link || ''} /></div>
        </div>
        <div className="field"><label htmlFor="f-notes">Notes</label><textarea id="f-notes" name="notes" defaultValue={base.notes || ''} /></div>
        <div className="form-foot">
          <button className="btn primary" type="submit">{eventId ? 'Save changes' : 'Add event'}</button>
          <button className="btn" type="button" onClick={() => { setSelectedId(null); closeDrawer(); }}>Cancel</button>
          {eventId && <button className="btn danger" type="button" onClick={del}>Delete</button>}
          <span className="spacer" /><span className="status">{msg}</span>
        </div>
      </form>
    </section>
  );
}

// ---------- profile + page settings ----------
function ProfileForm() {
  const { S, update, flash, user, slug, visibility, setMeta } = useCard();
  const p = S.profile;
  const [msg, setMsg] = useState('');
  const [pageMsg, setPageMsg] = useState('');
  const [slugIn, setSlugIn] = useState(slug || slugify(p.name));
  const [vis, setVis] = useState<Visibility>(visibility);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const lines = (k: string) => field(fd, k).split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((x) => x[0]);
    update((s) => ({ ...s, profile: { ...s.profile, name: field(fd, 'name'), headline: field(fd, 'headline'), location: field(fd, 'location'), summary: field(fd, 'summary'), targets: field(fd, 'targets').split(',').map((x) => x.trim()).filter(Boolean), email: field(fd, 'email'), linkedin: field(fd, 'linkedin'), education: lines('education').map((x) => ({ school: x[0], degree: x[1] || '', years: x[2] || '' })), certs: lines('certs').map((x) => ({ name: x[0], issuer: x[1] || '', year: x[2] || '' })) } }));
    setMsg('Saved.'); flash('Saved.');
  };
  const savePage = async () => {
    const s = slugify(slugIn); setSlugIn(s);
    if (vis !== 'private' && s.length < 3) { setPageMsg('Pick an address of at least 3 characters.'); return; }
    const err = await setMeta({ slug: s || null, visibility: vis });
    setPageMsg(err || (vis === 'private' ? 'Saved. Your page is private.' : 'Saved.'));
  };

  return (
    <section>
      <h2>Profile</h2>
      <form className="form" autoComplete="off" onSubmit={submit}>
        <div className="field"><label htmlFor="p-name-in">Name</label><input id="p-name-in" name="name" placeholder="Jordan Avery" defaultValue={p.name} /></div>
        <div className="field"><label htmlFor="p-headline">Headline (position)</label><input id="p-headline" name="headline" placeholder="Program Delivery Lead" defaultValue={p.headline} /></div>
        <div className="field"><label htmlFor="p-location">Location</label><input id="p-location" name="location" placeholder="Chicago, IL" defaultValue={p.location} /></div>
        <div className="field"><label htmlFor="p-summary">Scouting report (summary)</label><textarea id="p-summary" name="summary" style={{ minHeight: 80 }} defaultValue={p.summary} /></div>
        <div className="field"><label htmlFor="p-targets">Open to (target roles), comma separated</label><input id="p-targets" name="targets" placeholder="Delivery, Program, Client services" defaultValue={(p.targets || []).join(', ')} /></div>
        <div className="row2">
          <div className="field"><label htmlFor="p-email">Email</label><input id="p-email" name="email" type="email" defaultValue={p.email} /></div>
          <div className="field"><label htmlFor="p-linkedin">LinkedIn URL</label><input id="p-linkedin" name="linkedin" type="url" defaultValue={p.linkedin} /></div>
        </div>
        <div className="field"><label htmlFor="p-education">Education, one per line</label><textarea id="p-education" name="education" placeholder="Illinois State University | BS, Computer Science | 1998 – 2002" defaultValue={(p.education || []).map((e) => [e.school, e.degree, e.years].filter(Boolean).join(' | ')).join('\n')} /><span className="help">School | Degree | Years</span></div>
        <div className="field"><label htmlFor="p-certs">Certifications and awards, one per line</label><textarea id="p-certs" name="certs" placeholder="PMP | PMI | 2015" defaultValue={(p.certs || []).map((c) => [c.name, c.issuer, c.year].filter(Boolean).join(' | ')).join('\n')} /><span className="help">Name | Issuer | Year</span></div>
        <div className="form-foot"><button className="btn primary" type="submit">Save profile</button><span className="spacer" /><span className="status">{msg}</span></div>
      </form>

      <h2 style={{ marginTop: 28 }}>Your page</h2>
      {user ? (
        <div className="form">
          <div className="field"><label htmlFor="pg-slug">Address</label>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ color: 'var(--muted)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{origin}/u/</span><input id="pg-slug" value={slugIn} onChange={(e) => setSlugIn(e.target.value)} placeholder="jordan-avery" /></div>
          </div>
          <div className="field"><label>Who can see it</label>
            <div className="opts">
              {([['private', 'Only me'], ['unlisted', 'Anyone with the link'], ['public', 'Public']] as [Visibility, string][]).map(([v, l]) => (
                <label key={v}><input type="radio" name="vis" checked={vis === v} onChange={() => setVis(v)} /> {l}</label>
              ))}
            </div>
            <span className="help">The page shows your cards, scouting report, farm system, awards and contact. Never the job hunt.</span>
          </div>
          <div className="form-foot">
            <button className="btn primary" type="button" onClick={savePage}>Save page settings</button>
            {slug && visibility !== 'private' && <a className="btn" href={'/u/' + slug} target="_blank" rel="noopener">Open your page ↗</a>}
            <span className="spacer" /><span className="status">{pageMsg}</span>
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--ink-2)', fontSize: 13.5, margin: 0 }}>Sign in to give your card an address you can send to people. <a href="/login">Sign in</a></p>
      )}
    </section>
  );
}

// ---------- log ----------
function Log() {
  const { S } = useCard();
  const { openDrawer, setSelectedId } = useUI();
  const [q, setQ] = useState(''), [tf, setTf] = useState(''), [sort, setSort] = useState('desc');
  const h = huntStats(S);
  const fig = (v: React.ReactNode, k: string) => <span key={k}><b>{v}</b><small>{k}</small></span>;
  let list = sortedEvents(S);
  if (sort === 'desc') list.reverse();
  if (sort === 'company') list.sort((a, b) => (norm(a.company) || '~').localeCompare(norm(b.company) || '~') || (a.date < b.date ? -1 : 1));
  if (tf) list = list.filter((e) => e.type === tf);
  const nq = norm(q); if (nq) list = list.filter((e) => [e.company, e.title, e.notes, e.status, e.salary].some((v) => norm(v).includes(nq)));
  return (
    <section>
      <h2>Job-hunt log</h2>
      <div className="figs" style={{ marginBottom: 12 }}>{fig(h.apps, 'applications')}{fig(h.open, 'open')}{fig(h.apps ? Math.round((100 * h.responded) / h.apps) + '%' : '–', 'response')}{fig(h.interviews, 'interviews')}{fig(h.offers, 'offers')}{fig(h.denials, 'denials')}</div>
      <div className="log-tools">
        <input placeholder="Search" style={{ minWidth: 150 }} value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={tf} onChange={(e) => setTf(e.target.value)}><option value="">All types</option><option value="application">Applications</option><option value="interview">Interviews</option><option value="offer">Offers</option><option value="denial">Denials</option><option value="withdrawn">Withdrawn</option><option value="milestone">Milestones</option></select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="desc">Newest first</option><option value="asc">Oldest first</option><option value="company">By company</option></select>
        <span className="count">{list.length === S.events.length ? `${S.events.length} events` : `${list.length} of ${S.events.length}`}</span>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Company</th><th>Job</th><th>Status</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            {list.length ? list.map((e) => {
              const t = TYPES[e.type] || TYPES.milestone; const s = e.type === 'application' ? statusOf(S, e) : null;
              return (
                <tr key={e.id}>
                  <td className="d">{e.date}</td>
                  <td><span className={'type ' + e.type}><i />{t.label}</span></td>
                  <td className="co">{e.company || '–'}{e.link ? <> <a href={e.link} target="_blank" rel="noopener">↗</a></> : null}</td>
                  <td>{e.title || ''}{e.salary ? <> <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>{e.salary}</span></> : null}</td>
                  <td>{s ? (s.needs ? <button className="st needs" onClick={() => openDrawer('event', { eventId: null, prefill: { type: s.key as EventType, company: e.company, title: e.title, date: todayISO() } })}>{s.label} · needs date</button> : <span className="st">{s.label}{s.from ? <> <span style={{ color: 'var(--muted)' }}>{fmtShort(s.from.date)}</span></> : null}</span>) : null}</td>
                  <td className="n">{e.notes || ''}</td>
                  <td><button className="btn sm edit" onClick={() => { setSelectedId(e.id); openDrawer('event', { eventId: e.id }); }}>Edit</button></td>
                </tr>
              );
            }) : <tr><td colSpan={7} style={{ color: 'var(--muted)' }}>No events yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
