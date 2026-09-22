'use client';
import { useEffect, useRef, useState } from 'react';
import { useCard } from './store';
import type { ImportTab } from './ui';
import type { State } from '@/lib/types';
import { parseMonth, todayISO } from '@/lib/dates';
import { codeFor, hydrate, norm, sortedEvents, statusOf, uid } from '@/lib/derived';
import { FIELDS, guessMapping, heuristicResume, readLinkedIn, readTracker, resumeText, trackerEvents, type CareerImport, type ImportData, type Tracker } from '@/lib/imports';

/** A native <dialog> that opens and closes with `open`. */
function Modal({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return <dialog ref={ref} className={className} onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>{children}</dialog>;
}

export function download(name: string, text: string, mime: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
export const copyText = (t: string, flash: (m: string) => void) => (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => flash('Copied.'), () => flash('Copy failed; select the text and copy it.'));

// ---------- import ----------
function DropZone({ label, accept, multiple, onFiles }: { label: string; accept: string; multiple?: boolean; onFiles: (f: File[]) => void }) {
  const [over, setOver] = useState(false);
  return (
    <label className={'dropzone' + (over ? ' over' : '')} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]); }}>
      {label}<input type="file" accept={accept} multiple={multiple} onChange={(e) => { if (e.target.files?.length) onFiles([...e.target.files]); e.target.value = ''; }} />
    </label>
  );
}

export function ImportDialog({ open, tab, onClose }: { open: boolean; tab: ImportTab; onClose: () => void }) {
  const { S, sampleMode, replace, update, flash, user } = useCard();
  const [t, setT] = useState<ImportTab>(tab);
  const [data, setData] = useState<ImportData | null>(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [mapping, setMapping] = useState<{ hi: number; headers: string[]; map: Record<string, number> } | null>(null);
  const [opts, setOpts] = useState({ replace: false, profile: true, edu: true, certs: true, skipDupes: true });
  const [keep, setKeep] = useState<Set<number>>(new Set());

  useEffect(() => { if (open) { setT(tab); reset(); } }, [open, tab]);
  const reset = () => { setData(null); setBusy(''); setNote(''); setTracker(null); setMapping(null); };
  const fail = (e: unknown) => { setBusy(''); setNote((e as Error)?.message || 'Could not read that.'); };
  const preview = (d: CareerImport) => { setData(d); setKeep(new Set(d.roles.map((_, i) => i))); setNote(d.roles.length ? '' : 'Nothing to import from the roles.'); };

  const onLinkedIn = async (files: File[]) => { try { setBusy('Reading files…'); preview(await readLinkedIn(files)); setBusy(''); } catch (e) { fail(e); } };
  const onResume = async (files: File[]) => {
    const f = files[0];
    try {
      // Signed in: Claude reads the file on the server. Otherwise, or if that is unavailable, the date-pattern parser has a go.
      let why = user ? '' : 'Sign in and Claude reads the resume for you; for now the simple parser had a go.';
      if (user) {
        setBusy('Asking Claude to read ' + f.name + '…');
        const fd = new FormData(); fd.append('file', f);
        const res = await fetch('/api/resume', { method: 'POST', body: fd });
        if (res.ok) { preview(await res.json() as CareerImport); setBusy(''); return; }
        const err = await res.json().catch(() => ({})) as { error?: string; message?: string };
        why = err.error === 'not-configured' ? 'Claude extraction is not set up here; the simple parser had a go.' : (err.message || 'Claude could not read it') + ' The simple parser had a go instead.';
      }
      setBusy('Reading ' + f.name + '…');
      const d = heuristicResume(await resumeText(f));
      preview(d); setBusy(''); if (why) setNote(why);
    } catch (e) { fail(e); }
  };
  const onTracker = async (files: File[]) => { try { setBusy('Reading ' + files[0].name + '…'); const tr = await readTracker(files[0]); setTracker(tr); const m = guessMapping(tr.sheets[tr.current]); setMapping(m); setData(trackerEvents(tr.sheets[tr.current], m.hi, m.map)); setBusy(''); } catch (e) { fail(e); } };
  const remap = (k: string, v: number) => { if (!tracker || !mapping) return; const map = { ...mapping.map, [k]: v }; setMapping({ ...mapping, map }); setData(trackerEvents(tracker.sheets[tracker.current], mapping.hi, map)); };
  const pickSheet = (name: string) => { if (!tracker) return; const tr = { ...tracker, current: name }; setTracker(tr); const m = guessMapping(tr.sheets[name]); setMapping(m); setData(trackerEvents(tr.sheets[name], m.hi, m.map)); };
  const editRole = (i: number, k: 'company' | 'title' | 'start' | 'end', v: string) => { if (!data || data.kind !== 'career') return; const roles = data.roles.slice(); roles[i] = { ...roles[i], [k]: v }; setData({ ...data, roles }); };

  const go = () => {
    if (!data) return;
    if (data.kind === 'career') {
      const roles = data.roles.filter((_, i) => keep.has(i)).map((r) => ({ id: uid(), company: r.company, title: r.title, code: codeFor(r.title), start: parseMonth(r.start) || '', end: r.end ? parseMonth(r.end) : null, location: r.location || '', reason: '', bullets: r.bullets || [], skills: r.skills || [] })).filter((r) => r.company && r.title && r.start);
      let dupes = 0, eduDupes = 0, certDupes = 0;
      update((s0) => {
        const s: State = sampleMode ? { ...hydrate(null), settings: s0.settings } : { ...s0 };
        let rs = opts.replace ? roles : s.roles.slice();
        if (!opts.replace) roles.forEach((r) => { if (rs.some((x) => norm(x.company) === norm(r.company) && norm(x.title) === norm(r.title) && x.start === r.start)) dupes++; else rs = [...rs, r]; });
        const p = { ...s.profile };
        if (opts.profile) (['name', 'headline', 'location', 'summary', 'email', 'linkedin'] as const).forEach((k) => { const v = data.profile[k]; if (v) p[k] = String(v).trim(); });
        // Education and certifications merge like roles: replace outright, or add only what is not already there.
        // "University of Connecticut" and "University of Connecticut School of Business" are the same school; "B.S., MIS" and "MIS" the same degree.
        const alike = (a: string, b: string) => { const x = norm(a), y = norm(b); return !x || !y || x === y || x.includes(y) || y.includes(x); };
        const sameEdu = (a: { school: string; degree: string }, b: { school: string; degree: string }) => norm(a.school) !== '' && alike(a.school, b.school) && alike(a.degree, b.degree);
        if (opts.edu) {
          const have = opts.replace ? [] : (p.education || []).slice();
          data.education.forEach((e) => { if (have.some((x) => sameEdu(x, e))) eduDupes++; else have.push(e); });
          p.education = have;
        }
        if (opts.certs) {
          const have = opts.replace ? [] : (p.certs || []).slice();
          data.certs.forEach((c) => { if (have.some((x) => norm(x.name) !== '' && alike(x.name, c.name))) certDupes++; else have.push(c); });
          p.certs = have;
        }
        if (data.skills.length) { const have = opts.replace ? [] : (p.skills || []).slice(); data.skills.forEach((k) => { if (!have.some((x) => norm(x) === norm(k))) have.push(k); }); p.skills = have; }
        return { ...s, roles: rs, profile: p };
      });
      const skipped = [[dupes, 'role'], [eduDupes, 'school'], [certDupes, 'certification']].filter(([n]) => n).map(([n, k]) => `${n} ${k}${n === 1 ? '' : 's'}`).join(', ');
      flash(`Imported ${roles.length} role${roles.length === 1 ? '' : 's'}.` + (skipped ? ` Already there, skipped: ${skipped}.` : '')); onClose();
    } else {
      let added = 0, dupes = 0;
      update((s0) => {
        const s: State = sampleMode ? { ...s0, events: [] } : { ...s0 };
        const events = s.events.slice();
        data.events.forEach((e) => { const key = e.date + '|' + norm(e.company) + '|' + norm(e.title); if (opts.skipDupes && events.some((b) => b.type === 'application' && b.date + '|' + norm(b.company) + '|' + norm(b.title) === key)) { dupes++; return; } events.push(e); added++; });
        return { ...s, events };
      });
      flash(`Imported ${added} application${added === 1 ? '' : 's'}${dupes ? `, ${dupes} duplicate${dupes === 1 ? '' : 's'} skipped` : ''}.`); onClose();
    }
  };
  void replace; void S;

  const canGo = data && (data.kind === 'career' ? data.roles.length > 0 || !!(data.profile.name || data.profile.summary) || data.education.length > 0 : data.ok && data.events.length > 0);
  return (
    <Modal open={open} onClose={onClose}>
      <div className="dlg">
        <h3>Import</h3>
        <div className="tabs">
          {([['linkedin', 'LinkedIn export'], ['resume', 'Resume'], ['tracker', 'Job-hunt tracker']] as [ImportTab, string][]).map(([k, l]) => <button key={k} className={'tab' + (t === k ? ' on' : '')} onClick={() => { reset(); setT(k); }}>{l}</button>)}
        </div>
        {t === 'linkedin' && <div><p>On LinkedIn: Settings → Data privacy → <b>Get a copy of your data</b> → the full archive. Drop the zip here, or just Positions.csv (plus Education.csv, Skills.csv, Certifications.csv, Profile.csv if you have them).</p><DropZone label="Drop the LinkedIn zip or CSV files here, or click to choose" accept=".zip,.csv" multiple onFiles={onLinkedIn} /></div>}
        {t === 'resume' && <div><p>PDF, Word (.docx) or plain text. {user ? 'Claude reads it and pulls out the roles, dates, highlights, education and contact details; you check the result before anything is saved.' : 'A date-pattern parser finds the roles; sign in and Claude reads the resume properly instead.'}</p><DropZone label="Drop a resume here, or click to choose" accept=".pdf,.docx,.txt,.md" onFiles={onResume} /></div>}
        {t === 'tracker' && (
          <div>
            <p>Excel or CSV of applications. Columns are matched by header (the Application Tracker layout maps automatically) and each row becomes an application event on the timeline.</p>
            <DropZone label="Drop a spreadsheet here, or click to choose" accept=".xlsx,.xls,.xlsm,.csv,.tsv" onFiles={onTracker} />
            {tracker && mapping && (
              <div>
                <div className="maprow"><span>Sheet</span><select value={tracker.current} onChange={(e) => pickSheet(e.target.value)}>{Object.keys(tracker.sheets).map((n) => <option key={n}>{n}</option>)}</select></div>
                {FIELDS.map(([k, label]) => (
                  <div className="maprow" key={k}><span>{label}</span>
                    <select value={mapping.map[k]} onChange={(e) => remap(k, +e.target.value)}><option value={-1}>— not in this sheet —</option>{mapping.headers.map((h, i) => <option key={i} value={i}>{h || '(column ' + (i + 1) + ')'}</option>)}</select>
                  </div>
                ))}
                <div className="opts"><label><input type="checkbox" checked={opts.skipDupes} onChange={(e) => setOpts({ ...opts, skipDupes: e.target.checked })} /> Skip rows that already exist</label></div>
              </div>
            )}
          </div>
        )}
        {busy && <div className="prog"><i /><span>{busy}</span></div>}
        {data && data.kind === 'career' && (
          <div>
            <p style={{ marginTop: 10 }}><b>{data.roles.length} role{data.roles.length === 1 ? '' : 's'}</b>{data.education.length ? `, ${data.education.length} education` : ''}{data.certs.length ? `, ${data.certs.length} certs` : ''}{data.skills.length ? `, ${data.skills.length} skills` : ''} · {data.source}. Untick what you don&apos;t want; edit anything that&apos;s off.</p>
            <div className="preview">
              <div className="prow" style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}><span /><span>Company</span><span>Title</span><span>Start</span><span>End</span></div>
              {data.roles.length ? data.roles.map((r, i) => (
                <div className="prow" key={i}>
                  <input type="checkbox" checked={keep.has(i)} onChange={(e) => { const k = new Set(keep); if (e.target.checked) k.add(i); else k.delete(i); setKeep(k); }} />
                  <input type="text" value={r.company} onChange={(e) => editRole(i, 'company', e.target.value)} />
                  <input type="text" value={r.title} onChange={(e) => editRole(i, 'title', e.target.value)} />
                  <input type="text" value={r.start || ''} placeholder="YYYY-MM" onChange={(e) => editRole(i, 'start', e.target.value)} />
                  <input type="text" value={r.end || ''} placeholder="now" onChange={(e) => editRole(i, 'end', e.target.value)} />
                </div>
              )) : <div style={{ padding: 8, color: 'var(--muted)' }}>No roles found. Add them by hand from + Add.</div>}
            </div>
            <div className="opts">
              <label><input type="checkbox" checked={opts.replace} onChange={(e) => setOpts({ ...opts, replace: e.target.checked })} /> Replace what I already have (roles, education, certifications)</label>
              {(data.profile.name || data.profile.headline || data.profile.summary) && <label><input type="checkbox" checked={opts.profile} onChange={(e) => setOpts({ ...opts, profile: e.target.checked })} /> Update profile ({[data.profile.name, data.profile.headline].filter(Boolean).join(', ') || 'summary'})</label>}
              {data.education.length > 0 && <label><input type="checkbox" checked={opts.edu} onChange={(e) => setOpts({ ...opts, edu: e.target.checked })} /> Education</label>}
              {data.certs.length > 0 && <label><input type="checkbox" checked={opts.certs} onChange={(e) => setOpts({ ...opts, certs: e.target.checked })} /> Certifications</label>}
            </div>
          </div>
        )}
        {data && data.kind === 'events' && (
          <div>
            <p style={{ marginTop: 10 }}><b>{data.events.length} application{data.events.length === 1 ? '' : 's'}</b> ready{data.skipped ? `, ${data.skipped} rows skipped for unreadable dates` : ''}.</p>
            <div className="preview">
              {data.events.slice(0, 12).map((e) => <div className="prow" key={e.id} style={{ gridTemplateColumns: '84px 1.2fr 1.4fr 1fr' }}><span className="m">{e.date}</span><span>{e.company}</span><span>{e.title}</span><span className="m">{e.status || ''}</span></div>)}
              {data.events.length > 12 && <div style={{ padding: 6, color: 'var(--muted)' }}>… and {data.events.length - 12} more</div>}
            </div>
            {!data.ok && <p style={{ color: 'var(--muted)' }}>Pick at least a date column and a company or title column.</p>}
          </div>
        )}
        <div className="dlg-foot"><span className="note">{note}</span><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!canGo} onClick={go}>Import</button></div>
      </div>
    </Modal>
  );
}

// ---------- backup ----------
export function BackupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { S, replace, reset, flash, user } = useCard();
  const json = () => JSON.stringify({ ...S, exportedAt: new Date().toISOString(), app: 'career-card' }, null, 2);
  const csv = () => { const cols = ['date', 'type', 'company', 'title', 'status', 'salary', 'link', 'notes'] as const; const q = (v: unknown) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }; return [cols.join(',')].concat(sortedEvents(S).map((e) => cols.map((c) => q(c === 'status' && e.type === 'application' ? statusOf(S, e).label : e[c])).join(','))).join('\n'); };
  const restore = async (f: File) => { try { const o = JSON.parse(await f.text()); if (!o || !Array.isArray(o.roles)) throw 0; if (!confirm('Replace everything here with this backup?')) return; replace(hydrate(o)); onClose(); flash('Restored.'); } catch { flash('That is not a backup from this page.'); } };
  return (
    <Modal open={open} onClose={onClose}>
      <div className="dlg">
        <h3>Backup / restore</h3>
        <p>{user ? 'Your card is saved to your account. A backup file is still handy for moving between tools.' : 'Everything lives in this browser. Download a JSON backup now and then; restore it here on another device.'}</p>
        <div className="actions" style={{ marginBottom: 10 }}>
          <button className="btn primary" onClick={() => download('careercards-backup-' + todayISO() + '.json', json(), 'application/json')}>Download backup</button>
          <button className="btn" onClick={() => copyText(json(), flash)}>Copy JSON</button>
          <label className="btn" style={{ cursor: 'pointer' }}>Restore from file…<input type="file" accept=".json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ''; }} /></label>
          <button className="btn" onClick={() => download('job-hunt-' + todayISO() + '.csv', csv(), 'text/csv')}>Download job-hunt CSV</button>
        </div>
        <textarea className="code" readOnly value={open ? json() : ''} />
        <div className="dlg-foot"><button className="btn danger" onClick={() => { if (confirm('Erase everything? Download a backup first if you want to keep it.')) { reset(); onClose(); } }}>Erase everything</button><span className="note" /><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </Modal>
  );
}

// ---------- help ----------
export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="dlg">
        <h3>How this works</h3>
        <p><b>Cards.</b> One card per role, oldest to newest, like a career in a card set. Click a card to open it large, back side up so the details are right there; click again to turn it over. &quot;By team&quot; gathers consecutive roles at one company into a stack; click a stack to spread it.</p>
        <p><b>Free agent.</b> When no role is current you&apos;re a free agent. The day count in the Free agency row runs from your layoff event if you&apos;ve added one, otherwise from the end of your last role. Add a job-hunt event (<i>+ Add → Event</i>) as you apply and interview; the free-agent card and the timeline pick them up.</p>
        <p><b>Timeline.</b> Company spans sit above the line, job-hunt events sit on it. Drag to pan; pinch, <kbd>Ctrl</kbd>+scroll or double-click to zoom. &quot;Career&quot; fits everything, &quot;Free agency&quot; fits the job hunt.</p>
        <p><b>Import.</b> LinkedIn&apos;s data export (zip or CSVs), a resume (PDF, Word, text), or the job-hunt tracker spreadsheet. Every import shows a preview you can correct before saving.</p>
        <p><b>Your page.</b> Sign in and give your card an address. It shows the career and never the job hunt, and it is private until you say otherwise.</p>
        <p><b>Saving.</b> Automatic: in this browser, or in your account once you sign in.</p>
        <div className="dlg-foot"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </Modal>
  );
}
