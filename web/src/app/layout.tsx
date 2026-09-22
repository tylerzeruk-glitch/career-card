import type { Metadata } from 'next';
import './globals.css';
import '@/styles/card.css';

export const metadata: Metadata = {
  title: 'Career Card',
  description: 'Your career as a card set: one card per role, a free-agent card when you are between teams, and a timeline of the job hunt.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Righteous&family=Lilita+One&family=Barlow+Condensed:wght@500;600;700&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
