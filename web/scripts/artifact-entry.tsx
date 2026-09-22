// Entry for the single-file build: the front door, then the app in local mode. No account, no server.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CareerCardApp } from '@/components/CareerCardApp';
import { Landing } from '@/components/Landing';

function Preview() {
  const [page, setPage] = useState<'landing' | 'app'>('landing');
  if (page === 'app') return <CareerCardApp user={null} cloud={null} />;
  return <Landing onTry={() => setPage('app')} signInHref="https://careercards.app/login" />;
}

createRoot(document.getElementById('root')!).render(<Preview />);
