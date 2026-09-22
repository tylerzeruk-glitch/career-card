import type { State } from './types';
import { dayNum, isoFromDay, todayISO } from './dates';
import { uid } from './derived';

/** A fictional career so the page has something on the shelf before you add your own. */
export function sampleState(): State {
  const t = dayNum(todayISO());
  const d = (n: number) => isoFromDay(t - n);
  const y = new Date().getFullYear();
  return {
    profile: {
      name: 'Jordan Avery',
      headline: 'Program Delivery Lead',
      location: 'Chicago, IL',
      targets: ['Delivery', 'Program', 'Client services'],
      email: 'jordan@example.com',
      linkedin: 'https://www.linkedin.com/in/jordan-avery',
      summary:
        'Delivery lead with twenty years in benefits-administration technology, from programmer to running a client portfolio. Steady under escalation, fluent in requirements and UAT, and better at keeping a release honest than at selling one.',
      education: [{ school: 'Illinois State University', degree: 'BS, Computer Science', years: y - 28 + ' – ' + (y - 24) }],
      certs: [
        { name: 'PMP', issuer: 'PMI', year: String(y - 9) },
        { name: 'Delivery Excellence Award', issuer: 'Alight', year: String(y - 3) },
      ],
      skills: [],
    },
    roles: [
      { id: uid(), company: 'Aon Hewitt', title: 'Programmer Analyst', code: 'PA', start: y - 23 + '-06', end: y - 19 + '-03', location: 'Lincolnshire, IL', reason: 'Promoted', bullets: ['Built and maintained benefits-calculation batch jobs for three Fortune 500 clients.', 'Cut nightly cycle time by a third by reworking the eligibility pass.'], skills: ['COBOL', 'SQL', 'Batch', 'Eligibility'] },
      { id: uid(), company: 'Aon Hewitt', title: 'Team Lead', code: 'TL', start: y - 19 + '-04', end: y - 14 + '-12', location: 'Lincolnshire, IL', reason: 'Company became Alight', bullets: ['Led a team of six analysts across two client accounts.', 'Owned release planning and the defect triage call.'], skills: ['Team leadership', 'Release planning', 'Triage', 'SQL'] },
      { id: uid(), company: 'Alight', title: 'Control Account Manager', code: 'CAM', start: y - 13 + '-01', end: y - 8 + '-06', location: 'Lincolnshire, IL', reason: 'Promoted', bullets: ['Accountable for scope, schedule and budget on a $4M annual account.', 'Ran quarterly business reviews with client HR leadership.'], skills: ['Account management', 'Budget', 'Client relationship', 'Scope control'] },
      { id: uid(), company: 'Alight', title: 'Performance Excellence Consultant', code: 'PEC', start: y - 8 + '-07', end: y - 5 + '-02', location: 'Lincolnshire, IL', reason: 'Promoted', bullets: ['Standardised intake and UAT across a 40-person delivery group.', 'Coached team leads on requirements reviews.'], skills: ['Process design', 'UAT', 'Requirements', 'Coaching'] },
      { id: uid(), company: 'Alight', title: 'Program Delivery Lead', code: 'PDL', start: y - 5 + '-03', end: d(58).slice(0, 7), location: 'Lincolnshire, IL', reason: 'Role eliminated in a reorg', bullets: ['Led delivery for a portfolio of benefits-administration clients.', 'Ran intake, triage and UAT across product releases.', 'Owned the client escalation path; mentored four team leads.'], skills: ['Program management', 'UAT', 'Client delivery', 'Requirements', 'Escalations', 'Mentoring'] },
    ],
    events: [
      { id: uid(), date: d(58), type: 'layoff', company: 'Alight', title: 'Laid off', notes: 'Role eliminated in a reorg.' },
      { id: uid(), date: d(50), type: 'milestone', company: '', title: 'Resume finalized', notes: '' },
      { id: uid(), date: d(41), type: 'application', company: 'Acme Corp', title: 'Program Manager', salary: '$130k', notes: 'Referred by a former teammate.', status: 'Denied' },
      { id: uid(), date: d(39), type: 'application', company: 'Beta Corp', title: 'Delivery Lead', status: 'Interview' },
      { id: uid(), date: d(33), type: 'application', company: 'Gamma Health', title: 'Product Owner', salary: '$115k', notes: 'Posting says hybrid.', status: 'In Progress' },
      { id: uid(), date: d(27), type: 'denial', company: 'Acme Corp', title: 'Program Manager', notes: 'Form rejection email.' },
      { id: uid(), date: d(22), type: 'interview', company: 'Beta Corp', title: 'Delivery Lead', notes: 'Recruiter screen, 30 min.' },
      { id: uid(), date: d(20), type: 'application', company: 'Delta Software', title: 'Implementation Manager', status: 'In Progress' },
      { id: uid(), date: d(12), type: 'interview', company: 'Beta Corp', title: 'Delivery Lead', notes: 'Hiring manager round.' },
      { id: uid(), date: d(6), type: 'application', company: 'Epsilon Benefits', title: 'Client Services Manager', salary: '$125k', status: 'In Progress' },
    ],
    brand: { 'aon hewitt': 2, alight: 0 },
    settings: { group: 'role', view: 'cards' },
  };
}
