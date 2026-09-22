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
      name: 'Jordyn Smith',
      headline: 'Importer / Exporter',
      location: 'New York, NY',
      targets: ['Importing', 'Exporting'],
      email: 'jordyn@example.com',
      linkedin: 'https://www.linkedin.com/in/jordyn-smith',
      summary:
        'Fifteen years across marine biology and latex sales, two fields that come up together less often than you would think. Steady under pressure, good with clients, and better with a clipboard than a pitch deck.',
      education: [{ school: 'State University', degree: 'BS, Marine Biology', years: y - 20 + ' – ' + (y - 16) }],
      certs: [
        { name: 'Certified Sales Professional', issuer: 'Sales Institute', year: String(y - 9) },
        { name: 'Salesperson of the Year', issuer: 'Vandelay', year: String(y - 3) },
      ],
      skills: [],
    },
    roles: [
      { id: uid(), company: 'Acme Corp', title: 'Marine Biologist', code: 'MB', start: y - 16 + '-06', end: y - 13 + '-03', location: 'Boston, MA', reason: 'Promoted', bullets: ['Tagged and tracked 300 sea turtles across two field seasons.', 'Cleared an obstruction from a beached whale. The sea was angry that day.'], skills: ['Field research', 'Data collection', 'Diving', 'Reporting'] },
      { id: uid(), company: 'Acme Corp', title: 'Senior Marine Biologist', code: 'SMB', start: y - 13 + '-04', end: y - 11 + '-12', location: 'Boston, MA', reason: 'Left for Vandelay', bullets: ['Ran the coastal survey program for the Atlantic region.', 'Mentored six field researchers through their first season.'], skills: ['Program management', 'Mentoring', 'Field research', 'Grants'] },
      { id: uid(), company: 'Vandelay', title: 'Latex Salesman', code: 'LS', start: y - 10 + '-01', end: y - 7 + '-06', location: 'New York, NY', reason: 'Promoted', bullets: ['Opened 40 new accounts in the first year.', 'Top seller in the Northeast two years running.'], skills: ['Sales', 'Prospecting', 'Negotiation', 'CRM'] },
      { id: uid(), company: 'Vandelay', title: 'Regional Latex Manager', code: 'RLM', start: y - 7 + '-07', end: y - 4 + '-02', location: 'New York, NY', reason: 'Promoted', bullets: ['Managed eight sales reps across four states.', 'Grew regional revenue by a third in three years.'], skills: ['Team leadership', 'Forecasting', 'Coaching', 'Territory planning'] },
      { id: uid(), company: 'Vandelay', title: 'Head of Importing & Exporting', code: 'HIE', start: y - 4 + '-03', end: d(58).slice(0, 7), location: 'New York, NY', reason: 'Role eliminated in a reorg', bullets: ['Built the import/export division from nothing.', 'Owned supplier relationships on three continents.', 'Presented the quarterly numbers to the board.'], skills: ['Importing', 'Exporting', 'Supplier management', 'Logistics', 'Budget', 'Board reporting'] },
    ],
    events: [
      { id: uid(), date: d(58), type: 'layoff', company: 'Vandelay', title: 'Laid off', notes: 'Role eliminated in a reorg.' },
      { id: uid(), date: d(50), type: 'milestone', company: '', title: 'Resume finalized', notes: '' },
      { id: uid(), date: d(41), type: 'application', company: 'Globex', title: 'Import Manager', salary: '$130k', notes: 'Referred by a former teammate.', status: 'Denied' },
      { id: uid(), date: d(39), type: 'application', company: 'Initech', title: 'Export Lead', status: 'Interview' },
      { id: uid(), date: d(33), type: 'application', company: 'Oceanic Labs', title: 'Marine Biologist', salary: '$115k', notes: 'Posting says hybrid.', status: 'In Progress' },
      { id: uid(), date: d(27), type: 'denial', company: 'Globex', title: 'Import Manager', notes: 'Form rejection email.' },
      { id: uid(), date: d(22), type: 'interview', company: 'Initech', title: 'Export Lead', notes: 'Recruiter screen, 30 min.' },
      { id: uid(), date: d(20), type: 'application', company: 'Northwind Traders', title: 'Trade Manager', status: 'In Progress' },
      { id: uid(), date: d(12), type: 'interview', company: 'Initech', title: 'Export Lead', notes: 'Hiring manager round.' },
      { id: uid(), date: d(6), type: 'application', company: 'Contoso', title: 'Head of Logistics', salary: '$125k', status: 'In Progress' },
    ],
    brand: { 'acme corp': 2, vandelay: 0 },
    settings: { group: 'role', view: 'cards' },
  };
}
