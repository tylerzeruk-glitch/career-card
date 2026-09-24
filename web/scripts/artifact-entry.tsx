// Entry for the single-file build: the front door, the app in local mode and the public page, with a
// preview-only switcher at the bottom. No account, no server.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CareerCardApp } from '@/components/CareerCardApp';
import { Landing } from '@/components/Landing';
import { PublicCard } from '@/components/PublicCard';
import { sampleState } from '@/lib/sample';

type Page = 'landing' | 'app' | 'public';
const PAGES: [Page, string][] = [['landing', 'Landing'], ['app', 'App'], ['public', 'Public page']];

function Preview() {
  const [page, setPage] = useState<Page>('landing');
  const [pub] = useState(sampleState);
  const body = page === 'app' ? <CareerCardApp user={null} cloud={null} />
    : page === 'public' ? <PublicCard S={pub} slug="george" resumeHref="https://careercards.app/share-card/resume" />
    : <Landing onTry={() => { (window as unknown as { __EXAMPLE__?: boolean }).__EXAMPLE__ = true; setPage('app'); }} signInHref="https://careercards.app/login" />;
  return (
    <>
      {body}
      <div className="pv-bar" aria-label="Preview pages">
        {PAGES.map(([id, label]) => <button key={id} className={page === id ? 'on' : ''} onClick={() => setPage(id)}>{label}</button>)}
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
