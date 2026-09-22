// Entry for the single-file build: the app in local mode, no account, no server.
import { createRoot } from 'react-dom/client';
import { CareerCardApp } from '@/components/CareerCardApp';

createRoot(document.getElementById('root')!).render(<CareerCardApp user={null} cloud={null} />);
