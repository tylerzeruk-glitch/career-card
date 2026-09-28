import type { Metadata } from 'next';
import './globals.css';
import '@/styles/card.css';
import { THEME_BOOT } from '@/lib/theme';

const DESC = 'Turn your resume into a pack of trading cards: one card per role, a shareable career page at your own address, a resume PDF, and a private job search tracker.';

export const metadata: Metadata = {
  metadataBase: new URL('https://careercards.app'),
  title: { default: 'CareerCards', template: '%s · CareerCards' },
  description: DESC,
  alternates: { canonical: '/' },
  openGraph: { title: 'CareerCards', description: DESC, url: 'https://careercards.app', siteName: 'CareerCards', type: 'website', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'CareerCards: every role you have played, on its own card.' }] },
  twitter: { card: 'summary_large_image', title: 'CareerCards', description: DESC, images: ['/og.png'] },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" data-cc-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Righteous&family=Lilita+One&family=Barlow+Condensed:wght@500;600;700&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
