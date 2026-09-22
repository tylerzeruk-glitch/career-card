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
      name: 'George Costanza',
      headline: 'Importer / Exporter',
      location: 'New York, NY',
      targets: ['Importing', 'Exporting'],
      email: 'george@example.com',
      linkedin: 'https://www.linkedin.com/in/george-costanza',
      summary:
        'Fifteen years across marine biology and latex sales, two fields that come up together less often than you would think. Steady under pressure, good in a room, and since a certain summer, doing the opposite of every instinct. The results speak for themselves.',
      education: [{ school: 'Queens College', degree: 'BA, Architecture', years: y - 20 + ' – ' + (y - 16) }],
      certs: [
        { name: 'Latex Handling Certificate', issuer: 'Vandelay', year: String(y - 9) },
        { name: 'Salesperson of the Year', issuer: 'Vandelay', year: String(y - 3) },
      ],
      skills: [],
    },
    roles: [
      { id: uid(), company: 'Acme Corp', title: 'Marine Biologist', code: 'MB', start: y - 16 + '-06', end: y - 13 + '-03', location: 'Boston, MA', reason: 'Promoted', bullets: ['Tagged and tracked 300 sea turtles across two field seasons.', 'Pulled a Titleist from the blowhole of a beached whale. The sea was angry that day.'], skills: ['Field research', 'Whale rescue', 'Diving', 'Reporting'] },
      { id: uid(), company: 'Acme Corp', title: 'Senior Marine Biologist', code: 'SMB', start: y - 13 + '-04', end: y - 11 + '-12', location: 'Boston, MA', reason: 'Left for Vandelay', bullets: ['Ran the coastal survey program for the Atlantic region.', 'Mentored six field researchers through their first season.'], skills: ['Coastal surveys', 'Mentoring', 'Field research', 'Grants'] },
      { id: uid(), company: 'Vandelay', title: 'Latex Salesman', code: 'LS', start: y - 10 + '-01', end: y - 7 + '-06', location: 'New York, NY', reason: 'Promoted', bullets: ['Opened 40 new accounts in the first year: latex and latex-related products.', 'Top seller in the Northeast two years running.'], skills: ['Latex', 'Prospecting', 'Cold calling', 'Negotiation'] },
      { id: uid(), company: 'Vandelay', title: 'Regional Latex Manager', code: 'RLM', start: y - 7 + '-07', end: y - 4 + '-02', location: 'New York, NY', reason: 'Promoted', bullets: ['Managed eight sales reps across four states.', 'Grew regional revenue by a third in three years.'], skills: ['Team leadership', 'Forecasting', 'Coaching', 'Territory planning'] },
      { id: uid(), company: 'Vandelay', title: 'Head of Importing & Exporting', code: 'HIE', start: y - 4 + '-03', end: d(58).slice(0, 7), location: 'New York, NY', reason: 'Company turned out not to exist', bullets: ['Built the import/export division from nothing, and mostly from an answering machine.', 'Owned supplier relationships on three continents.', 'Presented the quarterly numbers to the board, in an office with a door.'], skills: ['Importing', 'Exporting', 'Supplier management', 'Logistics', 'Budget', 'Board reporting'] },
    ],
    events: [
      { id: uid(), date: d(58), type: 'layoff', company: 'Vandelay', title: 'Laid off', notes: 'The whole company, it turns out, was a bit of a story.' },
      { id: uid(), date: d(50), type: 'milestone', company: '', title: 'Resume finalized', notes: '' },
      { id: uid(), date: d(41), type: 'application', company: 'Kruger Industrial Smoothing', title: 'Smoothing Manager', salary: '$130k', notes: 'Referred by a former teammate. Nobody there seems to care about anything.', status: 'Denied' },
      { id: uid(), date: d(39), type: 'application', company: 'Play Now', title: 'Sales Lead, Playground Equipment', status: 'Interview' },
      { id: uid(), date: d(33), type: 'application', company: 'Pendant Publishing', title: 'Reader', salary: '$115k', notes: 'Posting says hybrid.', status: 'In Progress' },
      { id: uid(), date: d(27), type: 'denial', company: 'Kruger Industrial Smoothing', title: 'Smoothing Manager', notes: 'Form rejection email.' },
      { id: uid(), date: d(22), type: 'interview', company: 'Play Now', title: 'Sales Lead, Playground Equipment', notes: 'Recruiter screen, 30 min.' },
      { id: uid(), date: d(20), type: 'application', company: 'Kramerica Industries', title: 'Head of Operations', status: 'In Progress' },
      { id: uid(), date: d(12), type: 'interview', company: 'Play Now', title: 'Sales Lead, Playground Equipment', notes: 'Hiring manager round. Brought up the Yankees.' },
      { id: uid(), date: d(6), type: 'application', company: 'Sanalac', title: 'Rest Stop Supply Manager', salary: '$125k', status: 'In Progress' },
    ],
    brand: { 'acme corp': 2, vandelay: 0 },
    settings: { group: 'role', view: 'cards' },
  };
}
