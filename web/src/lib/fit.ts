/**
 * Fitting a line of text into a fixed box on a card without a browser to measure it: the width is estimated
 * from the character count and the face's average advance, the size scales down to a floor, and past the floor
 * the words themselves give way, the way a printed card would abbreviate a long position. Sizes are in cqw
 * (shares of the card's width), which the stylesheet turns into CSS variables.
 */

/** The abbreviations a card would use for a long position, tried in order until the line fits. */
const TITLE_ABBR: [RegExp, string][] = [
  [/\bExecutive Vice President\b/gi, 'EVP'], [/\bSenior Vice President\b/gi, 'SVP'], [/\bVice President\b/gi, 'VP'],
  [/\bChief Executive Officer\b/gi, 'CEO'], [/\bChief Operating Officer\b/gi, 'COO'], [/\bChief Financial Officer\b/gi, 'CFO'], [/\bChief Technology Officer\b/gi, 'CTO'], [/\bChief Marketing Officer\b/gi, 'CMO'], [/\bChief People Officer\b/gi, 'CPO'],
  [/\bInformation Technology\b/gi, 'IT'], [/\bHuman Resources\b/gi, 'HR'], [/\bQuality Assurance\b/gi, 'QA'], [/\bResearch and Development\b/gi, 'R&D'], [/\bBusiness Development\b/gi, 'Biz Dev'], [/\bUser Experience\b/gi, 'UX'], [/\bPublic Relations\b/gi, 'PR'],
  [/\s+and\s+/gi, ' & '], [/\bof the\b/gi, 'of'],
  [/\bSenior\b/gi, 'Sr.'], [/\bJunior\b/gi, 'Jr.'], [/\bManager\b/gi, 'Mgr.'], [/\bManagement\b/gi, 'Mgmt.'], [/\bDirector\b/gi, 'Dir.'], [/\bAssociate\b/gi, 'Assoc.'], [/\bAssistant\b/gi, 'Asst.'],
  [/\bEngineering\b/gi, 'Eng.'], [/\bEngineer\b/gi, 'Eng.'], [/\bDevelopment\b/gi, 'Dev.'], [/\bDeveloper\b/gi, 'Dev.'], [/\bOperations\b/gi, 'Ops'], [/\bAccount\b/gi, 'Acct.'], [/\bExecutive\b/gi, 'Exec.'],
  [/\bRepresentative\b/gi, 'Rep.'], [/\bSpecialist\b/gi, 'Spec.'], [/\bCoordinator\b/gi, 'Coord.'], [/\bAdministrator\b/gi, 'Admin.'], [/\bAdministration\b/gi, 'Admin.'], [/\bConsultant\b/gi, 'Consult.'], [/\bConsulting\b/gi, 'Consult.'],
  [/\bTechnician\b/gi, 'Tech.'], [/\bTechnical\b/gi, 'Tech.'], [/\bTechnology\b/gi, 'Tech.'], [/\bMarketing\b/gi, 'Mktg.'], [/\bCommunications\b/gi, 'Comms'], [/\bProduct\b/gi, 'Prod.'], [/\bProgramme\b/gi, 'Prog.'], [/\bProgram\b/gi, 'Prog.'], [/\bProject\b/gi, 'Proj.'],
  [/\bInternational\b/gi, 'Intl.'], [/\bNational\b/gi, 'Natl.'], [/\bRegional\b/gi, 'Reg.'], [/\bRelationship\b/gi, 'Rel.'], [/\bCustomer\b/gi, 'Cust.'], [/\bPerformance\b/gi, 'Perf.'], [/\bExcellence\b/gi, 'Excel.'],
  [/\bStrategy\b/gi, 'Strat.'], [/\bStrategic\b/gi, 'Strat.'], [/\bPrincipal\b/gi, 'Princ.'], [/\bProfessional\b/gi, 'Prof.'], [/\bDepartment\b/gi, 'Dept.'], [/\bGeneral\b/gi, 'Gen.'], [/\bFinancial\b/gi, 'Fin.'], [/\bFinance\b/gi, 'Fin.'],
  [/\bSolutions\b/gi, 'Sol.'], [/\bImplementation\b/gi, 'Impl.'], [/\bEnvironmental\b/gi, 'Env.'], [/\bCertified\b/gi, 'Cert.'], [/\bSupervisor\b/gi, 'Supv.'], [/\bApplication\b/gi, 'App.'], [/\bInfrastructure\b/gi, 'Infra.'], [/\bArchitecture\b/gi, 'Arch.'], [/\bArchitect\b/gi, 'Arch.'],
];

/** An estimate of a line's width in em for a face: characters times the face's average advance (uppercase, letter-spacing included). */
const em = (text: string, adv: number) => text.length * adv;

/**
 * A position for the role box: base size, scaled down to the floor; past the floor, trimmed of a parenthetical or a
 * trailing clause, then abbreviated a word at a time (the longest-established abbreviations first).
 */
export function fitTitle(title: string, width = 58, base = 5.4, min = 3.7, adv = 0.62): { text: string; size: number } {
  let text = (title || '').trim();
  const size = (t: string) => Math.min(base, width / Math.max(1, em(t, adv)));
  if (size(text) >= min) return { text, size: size(text) };
  // a parenthetical or a trailing clause goes first: "(North America)", "- Contract"
  const trimmed = text.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+[-–—/,|].*$/, '').trim();
  if (trimmed && trimmed !== text) { text = trimmed; if (size(text) >= min) return { text, size: size(text) }; }
  for (const [re, to] of TITLE_ABBR) {
    const next = text.replace(re, to);
    if (next === text) continue;
    text = next;
    if (size(text) >= min) return { text, size: size(text) };
  }
  return { text, size: min };
}

/**
 * A name for the plate: first name small, surname large, both scaled together down to the floor; past the floor,
 * middle names go, then the first name becomes an initial.
 */
export function fitName(name: string, width = 60, minScale = 0.68, advFn = 0.6, advLn = 0.62, fnSize = 4.6, lnSize = 6.8, gap = 1.8): { fn: string; ln: string; scale: number } {
  const words = (name || 'Your name').trim().split(/\s+/).filter(Boolean);
  const scale = (fn: string, ln: string) => Math.min(1, (width - (fn ? gap : 0)) / Math.max(1, em(fn, advFn) * fnSize + em(ln, advLn) * lnSize));
  const tries: [string, string][] = [];
  if (words.length === 1) tries.push(['', words[0]]);
  else {
    const first = words[0], last = words[words.length - 1];
    tries.push([words.slice(0, -1).join(' '), last]); // all given names
    if (words.length > 2) tries.push([first, last]); // first and last only
    tries.push([first[0] + '.', last]); // an initial
  }
  for (const [fn, ln] of tries) { const s = scale(fn, ln); if (s >= minScale) return { fn, ln, scale: s }; }
  const [fn, ln] = tries[tries.length - 1];
  return { fn, ln, scale: minScale };
}

/** The company as the maker's mark over the frame's corner: as large as the corner allows, scaled down for a long name; the stylesheet shortens what still will not fit. */
export function fitCompany(name: string, width = 70, base = 11.5, min = 6.5, adv = 0.52): number {
  return Math.max(min, Math.min(base, width / Math.max(1, em((name || '').trim(), adv))));
}
