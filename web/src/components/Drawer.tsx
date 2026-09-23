'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCard } from './store';
import { useUI, type DrawerTab } from './ui';
import type { Ev, EventType, Role, Visibility } from '@/lib/types';

type EduRow = { school: string; degree: string; start: string; end: string; inProgress: boolean };
type CertRow = { name: string; issuer: string; year: string; inProgress: boolean };
const IN_PROGRESS = /in progress|present/i;
import { fmtShort, parseMonth, todayISO } from '@/lib/dates';
import { PAIRS, TYPES, codeFor, hashIdx, huntStats, initials, looking, norm, pairFor, pairIndexFor, roles, slugify, sortedEvents, statusOf, uid } from '@/lib/derived';
import { avatarSrc, isPhoto, isSet } from '@/lib/avatar';
import { LOCAL_SIDE, PORTRAIT_SIDE, dropPortrait, drawTake, isDataUrl, photoBlob, pickTake, squarePhoto, storePortrait, toDataUrl, type Take } from '@/lib/portrait';
import { linkedinOn } from '@/lib/auth-providers';
import { supabaseBrowser } from '@/lib/supabase/client';

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

/** Free-form entry that turns into chips: Enter (or a comma) adds one, hover a chip for its ×, Backspace on an empty box removes the last. */
function TagInput({ id, value, onChange, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const add = (raw: string) => {
    const items = raw.split(',').map((x) => x.trim()).filter(Boolean).filter((x) => !value.some((v) => v.toLowerCase() === x.toLowerCase()));
    if (items.length) onChange([...value, ...items]);
    setDraft('');
  };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); }
    else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className="tags" onClick={() => inputRef.current?.focus()}>
      {value.map((t, i) => (
        <span className="tag" key={t + i}>{t}<button type="button" aria-label={'Remove ' + t} title="Remove" onClick={(e) => { e.stopPropagation(); onChange(value.filter((_, j) => j !== i)); }}>×</button></span>
      ))}
      <input ref={inputRef} id={id} value={draft} placeholder={value.length ? '' : placeholder} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={() => { if (draft.trim()) add(draft); }} />
    </div>
  );
}

// ---------- role ----------
/** Why a role ended. The card foot shows this instead of "Ended Mon YYYY". */
export const REASONS = ['Promoted', 'Left for a new role', 'Role eliminated', 'Laid off', 'Contract ended', 'Company acquired', 'Company closed', 'Relocated', 'Went back to school', 'Retired'];
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
  const [skills, setSkills] = useState<string[]>(r?.skills || []);
  const [reasonSel, setReasonSel] = useState(!r?.reason ? '' : REASONS.includes(r.reason) ? r.reason : '__other');
  const [reasonOther, setReasonOther] = useState(r?.reason && !REASONS.includes(r.reason) ? r.reason : '');
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
      location: field(fd, 'location'), reason: reasonSel === '__other' ? reasonOther.trim() : reasonSel,
      bullets: field(fd, 'bullets').split('\n').map((s) => s.trim().replace(/^[-•·*]\s*/, '')).filter(Boolean),
      skills,
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
          <div className="field" style={{ gridColumn: 'span 2' }}><label htmlFor="r-title">Title (position)</label><input id="r-title" required placeholder="Importer / Exporter" value={title} onChange={(e) => { setTitle(e.target.value); if (!codeTouched) setCode(codeFor(e.target.value)); }} /></div>
          <div className="field"><label htmlFor="r-code">Badge</label><input id="r-code" maxLength={4} placeholder="PDL" value={code} onChange={(e) => { setCode(e.target.value); setCodeTouched(true); }} /></div>
        </div>
        <div className="row2">
          <div className="field"><label htmlFor="r-start">Started</label><input type="month" id="r-start" name="start" required placeholder="YYYY-MM or Mar 2021" defaultValue={r?.start || ''} /></div>
          <div className="field"><label htmlFor="r-end">Ended</label><input type="month" id="r-end" name="end" placeholder="YYYY-MM, blank if current" defaultValue={r?.end || ''} disabled={current} /></div>
        </div>
        <label className="check"><input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} /> I still work here</label>
        <div className="row2">
          <div className="field"><label htmlFor="r-location">Location</label><input id="r-location" name="location" placeholder="New York, NY" defaultValue={r?.location || ''} /></div>
          <div className="field"><label htmlFor="r-reason">How it ended</label>
            <select id="r-reason" value={reasonSel} onChange={(e) => setReasonSel(e.target.value)}>
              <option value="">—</option>
              {REASONS.map((x) => <option key={x} value={x}>{x}</option>)}
              <option value="__other">Other…</option>
            </select>
            {reasonSel === '__other' && <input aria-label="How it ended, in your words" placeholder="In your words" value={reasonOther} onChange={(e) => setReasonOther(e.target.value)} autoFocus />}
          </div>
        </div>
        <div className="field"><label htmlFor="r-bullets">Highlights, one per line</label><textarea id="r-bullets" name="bullets" placeholder={'Led delivery for a portfolio of clients\nRan intake, triage and UAT'} defaultValue={(r?.bullets || []).join('\n')} /></div>
        <div className="field"><label htmlFor="r-skills">Skills</label><TagInput id="r-skills" value={skills} onChange={setSkills} placeholder="Type a skill and press Enter" /></div>
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
        <div className="field"><label htmlFor="f-title">{ms ? 'What happened' : 'Job title'}</label><input id="f-title" name="title" placeholder="Importer / Exporter" defaultValue={base.title || ''} /></div>
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
/** Where the browser lands after LinkedIn: the callback sends it home with this, and the picker carries on. */
export const LINKEDIN_RETURN = '/?portrait=linkedin';
export const PORTRAIT_NOTE = 'careercard.portrait';

const LinkedInMark = <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect width="24" height="24" rx="3" fill="#0A66C2" /><path fill="#fff" d="M6.9 9.5h2.6V18H6.9zM8.2 5.3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11.2 9.5h2.5v1.2c.4-.7 1.3-1.4 2.7-1.4 2.8 0 3.3 1.8 3.3 4.2V18h-2.6v-3.9c0-.9 0-2.1-1.3-2.1s-1.5 1-1.5 2.1V18h-2.6V9.5z" /></svg>;

/**
 * Profile → Player → Portrait. A headshot from a file, a drop, or the player's LinkedIn profile photo;
 * cropped square in the browser and saved as soon as it is picked: into the account's storage, or as a
 * small data URL inside the local card (it moves to the account on sign-in). Shown on every card.
 */
function PortraitPicker() {
  const { S, update, user } = useCard();
  const p = S.profile;
  const first = roles(S)[0];
  const [a, b] = first ? pairFor(S, first.company) : PAIRS[0];
  const [busy, setBusy] = useState<'photo' | 'linkedin' | null>(null);
  const [msg, setMsg] = useState('');
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [takes, setTakes] = useState<(Take | null)[]>([]); // four slots while a deal is out; null = still drawing
  const [dealing, setDealing] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);

  const take = async (src: Blob) => {
    setBusy('photo'); setMsg('');
    try {
      const photo = await squarePhoto(src, user ? PORTRAIT_SIDE : LOCAL_SIDE);
      const url = user ? await storePortrait(user.id, photo) : await toDataUrl(photo);
      update((s) => ({ ...s, profile: { ...s.profile, avatar: url, photo: url } }));
      setTakes([]);
      setMsg('Saved. It shows on every card' + (user ? ' and on your page.' : '.'));
    } catch (e) { setMsg((e as Error).message || 'Could not use that photo.'); }
    setBusy(null);
  };
  const remove = () => {
    const stored = user && p.avatar && isPhoto(p.avatar) && !isDataUrl(p.avatar);
    update((s) => { const { avatar: _a, photo: _p, ...rest } = s.profile; return { ...s, profile: rest }; });
    if (stored) dropPortrait(user.id).catch(() => { /* the file is orphaned at worst */ });
    setMsg('Removed. Cards show your initials.');
  };
  const linkedin = async () => {
    const sb = supabaseBrowser();
    if (!user || !sb) { setMsg('Sign in first, then link LinkedIn.'); return; }
    setBusy('linkedin'); setMsg('');
    const r = await fetch('/api/portrait/linkedin').catch(() => null);
    if (r?.ok) { await take(await r.blob()); return; }
    const err = r ? ((await r.json().catch(() => ({}))) as { error?: string }).error : 'network';
    const options = { redirectTo: (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) + '/auth/callback?next=' + encodeURIComponent(LINKEDIN_RETURN) };
    if (err === 'not-linked') {
      setMsg('Taking you to LinkedIn to link it…');
      const { error } = await sb.auth.linkIdentity({ provider: 'linkedin_oidc', options });
      if (error) setMsg(error.message);
    } else if (err === 'expired') {
      setMsg('LinkedIn needs a fresh sign-in to hand over the photo…');
      const { error } = await sb.auth.signInWithOAuth({ provider: 'linkedin_oidc', options });
      if (error) setMsg(error.message);
    } else if (err === 'no-photo') setMsg('Your LinkedIn profile has no photo to pull.');
    else setMsg('Could not reach LinkedIn just now.');
    setBusy(null);
  };
  /** Four takes from the image model, drawn in parallel; each lands in its slot as it arrives. */
  const deal = async () => {
    if (!user || !p.photo) return;
    setDealing(true); setMsg(''); setTakes([null, null, null, null]);
    let src: Blob;
    try { src = await photoBlob(p.photo); } catch (e) { setMsg((e as Error).message); setDealing(false); setTakes([]); return; }
    let firstErr = '', left = -1;
    await Promise.all([0, 1, 2, 3].map(async (i) => {
      try { const t = await drawTake(src); left = Math.min(left < 0 ? t.left : left, t.left); setTakes((ts) => ts.map((x, j) => (j === i ? t : x))); }
      catch (e) { firstErr ||= (e as Error).message; setTakes((ts) => ts.map((x, j) => (j === i ? undefined as unknown as null : x))); }
    }));
    setTakes((ts) => ts.filter((t) => t !== undefined));
    setDealing(false);
    setMsg(firstErr || (left === 0 ? 'Pick one. That was the last deal for today.' : 'Pick one, or deal four more.'));
  };
  const pick = async (t: Take) => {
    setPicking(t.path); setMsg('');
    try {
      const avatar = await pickTake(t.path);
      update((s) => ({ ...s, profile: { ...s.profile, avatar } }));
      setTakes([]); setMsg('Saved. It shows on every card, in each team\'s colours, and on your page.');
    } catch (e) { setMsg((e as Error).message); }
    setPicking(null);
  };
  const usePhoto = () => { if (p.photo) update((s) => ({ ...s, profile: { ...s.profile, avatar: s.profile.photo } })); setMsg('Back to the photo.'); };

  // back from LinkedIn: the app left a note to carry on
  useEffect(() => {
    try { if (sessionStorage.getItem(PORTRAIT_NOTE) === 'linkedin') { sessionStorage.removeItem(PORTRAIT_NOTE); linkedin(); } } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liTitle = !linkedinOn ? 'Coming soon' : !user ? 'Sign in to use this' : undefined;
  return (
    <div className="field"><label>Portrait</label>
      <div className="portrait">
        <div className={'pv' + (over ? ' over' : '')} style={{ '--a': a, '--b': b } as React.CSSProperties} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) take(f); }}>
          {p.avatar ? <img className={isPhoto(p.avatar) ? 'photo' : 'bust'} src={avatarSrc(p.avatar, first ? pairIndexFor(S, first.company) : 0)} alt="" /> : <span className="mono">{initials(p.name) || '?'}</span>}
          {busy && <span className="wait">{busy === 'linkedin' ? 'Asking LinkedIn…' : 'Saving…'}</span>}
        </div>
        <div className="pt-side">
          <div className="pt-actions">
            <button type="button" className="btn sm" disabled={!!busy} onClick={() => fileRef.current?.click()}>Choose a photo</button><input ref={fileRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) take(f); }} />
            <button type="button" className="btn sm" disabled={!linkedinOn || !user || !!busy} title={liTitle} onClick={linkedin}>{LinkedInMark} Use my LinkedIn photo</button>
            {p.avatar && <button type="button" className="btn sm" disabled={!!busy} onClick={remove}>Remove</button>}
          </div>
          {user && p.photo && !takes.length && (
            <div className="pt-actions">
              <button type="button" className="btn sm draw" disabled={!!busy || dealing} onClick={deal}>{isSet(p.avatar || '') ? 'Draw me again' : 'Draw me in the house style'}</button>
              {isSet(p.avatar || '') && <button type="button" className="btn sm" onClick={usePhoto}>Use the photo instead</button>}
            </div>
          )}
          <span className="help">{msg || (user && p.photo ? 'The model redraws your photo as a riso print like George\'s: four takes, pick one. Each deal is a few cents, so there is a daily limit.' : 'A headshot works best: face the camera, plain background. Drop one on the square or choose a file; it is cropped to the centre.')}</span>
        </div>
      </div>
      {takes.length > 0 && (
        <div className="takes">
          {takes.map((t, i) => (
            <div key={t ? t.path : 'wait' + i} className="take" style={{ '--a': a, '--b': b } as React.CSSProperties}>
              {t ? <><img src={t.url} alt={'Take ' + (i + 1)} /><button type="button" className="btn sm use" disabled={!!picking} onClick={() => pick(t)}>{picking === t.path ? 'Saving…' : 'Use this one'}</button></> : <span className="wait">Drawing…</span>}
            </div>
          ))}
          <div className="pt-actions wide">
            <button type="button" className="btn sm" disabled={dealing || !!picking} onClick={deal}>Deal four more</button>
            <button type="button" className="btn sm" disabled={dealing || !!picking} onClick={() => { setTakes([]); setMsg(''); }}>Keep what I have</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileForm() {
  const { S, update, flash, user, slug, visibility, setMeta } = useCard();
  const p = S.profile;
  const [targets, setTargets] = useState<string[]>(p.targets || []);
  const onMarket = looking(S);
  const [pskills, setPskills] = useState<string[]>(p.skills || []);
  const [edu, setEdu] = useState<EduRow[]>(() => (p.education || []).map((e) => { const ys = e.years.match(/\d{4}/g) || []; const ip = IN_PROGRESS.test(e.years) || /[–-]\s*$/.test(e.years); return { school: e.school, degree: e.degree, start: ys[0] || '', end: ip ? '' : ys[1] || '', inProgress: ip }; }));
  const [certs, setCerts] = useState<CertRow[]>(() => (p.certs || []).map((c) => ({ name: c.name, issuer: c.issuer, year: IN_PROGRESS.test(c.year) ? '' : c.year, inProgress: IN_PROGRESS.test(c.year) })));
  const setEduAt = (i: number, k: keyof EduRow, v: string | boolean) => setEdu((rows) => rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const setCertAt = (i: number, k: keyof CertRow, v: string | boolean) => setCerts((rows) => rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const [msg, setMsg] = useState('');
  const [pageMsg, setPageMsg] = useState('');
  const [slugIn, setSlugIn] = useState(slug || slugify(p.name));
  const [vis, setVis] = useState<Visibility>(visibility);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    update((s) => ({ ...s, profile: { ...s.profile, name: field(fd, 'name'), headline: field(fd, 'headline'), location: field(fd, 'location'), summary: field(fd, 'summary'), targets, skills: pskills, email: field(fd, 'email'), linkedin: field(fd, 'linkedin'), education: edu.map((r) => ({ school: r.school.trim(), degree: r.degree.trim(), years: r.inProgress ? (r.start.trim() ? r.start.trim() + '–present' : 'In progress') : [r.start.trim(), r.end.trim()].filter(Boolean).join('–') })).filter((r) => r.school), certs: certs.map((c) => ({ name: c.name.trim(), issuer: c.issuer.trim(), year: c.inProgress ? 'In progress' : c.year.trim() })).filter((c) => c.name) } }));
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
      <form className="form" autoComplete="off" onSubmit={submit}>
        <div className="group"><div className="gh">Player</div>
        <div className="field"><label htmlFor="p-name-in">Name</label><input id="p-name-in" name="name" placeholder="George Costanza" defaultValue={p.name} /></div>
        <PortraitPicker />
        <div className="row2">
        <div className="field"><label htmlFor="p-headline">Headline</label><input id="p-headline" name="headline" placeholder="Importer / Exporter" defaultValue={p.headline} /></div>
        <div className="field"><label htmlFor="p-location">Location</label><input id="p-location" name="location" placeholder="New York, NY" defaultValue={p.location} /></div>
        </div>
        </div>
        <div className="group"><div className="gh">Scouting report</div>
        <div className="field"><label htmlFor="p-summary">Summary</label><textarea id="p-summary" name="summary" style={{ minHeight: 80 }} defaultValue={p.summary} /></div>
        <div className="field"><label htmlFor="p-skills">Skills</label><TagInput id="p-skills" value={pskills} onChange={setPskills} placeholder="Type a skill and press Enter" /><span className="help">Leave empty to show the skills gathered from your roles.</span></div>
        </div>
        <div className="group"><div className="gh">Farm system</div>
          <div className="rows">
            {edu.map((r, i) => (
              <div className="entry" key={i}>
                <div className="edu-row">
                  <input aria-label="School" placeholder="School" value={r.school} onChange={(e) => setEduAt(i, 'school', e.target.value)} />
                  <input aria-label="Degree" placeholder="Degree" value={r.degree} onChange={(e) => setEduAt(i, 'degree', e.target.value)} />
                  <input aria-label="Start year" placeholder="Start" inputMode="numeric" maxLength={4} value={r.start} onChange={(e) => setEduAt(i, 'start', e.target.value)} />
                  <input aria-label="End year" placeholder={r.inProgress ? '—' : 'End'} inputMode="numeric" maxLength={4} value={r.inProgress ? '' : r.end} disabled={r.inProgress} onChange={(e) => setEduAt(i, 'end', e.target.value)} />
                  <button type="button" className="btn icon" title="Remove" aria-label="Remove this education" onClick={() => setEdu(edu.filter((_, j) => j !== i))}>×</button>
                </div>
                <label className="inprog"><input type="checkbox" checked={r.inProgress} onChange={(e) => setEduAt(i, 'inProgress', e.target.checked)} /> In progress</label>
              </div>
            ))}
            <button type="button" className="btn sm add" onClick={() => setEdu([...edu, { school: '', degree: '', start: '', end: '', inProgress: false }])}>+ Add education</button>
          </div>
        </div>
        <div className="group"><div className="gh">Award inserts</div>
          <div className="rows">
            {certs.map((c, i) => (
              <div className="entry" key={i}>
                <div className="cert-row">
                  <input aria-label="Name" placeholder="Name" value={c.name} onChange={(e) => setCertAt(i, 'name', e.target.value)} />
                  <input aria-label="Issuer" placeholder="Issuer" value={c.issuer} onChange={(e) => setCertAt(i, 'issuer', e.target.value)} />
                  <input aria-label="Year" placeholder={c.inProgress ? '—' : 'Year'} inputMode="numeric" maxLength={4} value={c.inProgress ? '' : c.year} disabled={c.inProgress} onChange={(e) => setCertAt(i, 'year', e.target.value)} />
                  <button type="button" className="btn icon" title="Remove" aria-label="Remove this certification" onClick={() => setCerts(certs.filter((_, j) => j !== i))}>×</button>
                </div>
                <label className="inprog"><input type="checkbox" checked={c.inProgress} onChange={(e) => setCertAt(i, 'inProgress', e.target.checked)} /> In progress</label>
              </div>
            ))}
            <button type="button" className="btn sm add" onClick={() => setCerts([...certs, { name: '', issuer: '', year: '', inProgress: false }])}>+ Add certification</button>
          </div>
        </div>
        <div className="group"><div className="gh">Free agency</div>
        <label className="check"><input type="checkbox" checked={onMarket} onChange={(e) => { const v = e.target.checked; update((s) => ({ ...s, profile: { ...s.profile, looking: v ? undefined : false } })); flash(v ? 'Free agency is on.' : 'Free agency is off. Your pack is just your cards.'); }} /> I&apos;m looking for my next team</label>
        {onMarket
          ? <div className="field"><label htmlFor="p-targets">Open to (target roles)</label><TagInput id="p-targets" value={targets} onChange={setTargets} placeholder="Type a role and press Enter" /></div>
          : <span className="help">Retired, settled, or just here for the pack: with this off there is no free-agent card, pill or day count anywhere, your public page included. The job-hunt log stays under the Log tab if you ever need it.</span>}
        </div>
        <div className="group"><div className="gh">Contact</div>
        <div className="row2">
          <div className="field"><label htmlFor="p-email">Email</label><input id="p-email" name="email" type="email" defaultValue={p.email} /></div>
          <div className="field"><label htmlFor="p-linkedin">LinkedIn URL</label><input id="p-linkedin" name="linkedin" type="url" defaultValue={p.linkedin} /></div>
        </div>
        </div>
        <div className="form-foot"><button className="btn primary" type="submit">Save profile</button><span className="spacer" /><span className="status">{msg}</span></div>
      </form>

      <div className="gh" style={{ marginTop: 26 }}>Your page</div>
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
