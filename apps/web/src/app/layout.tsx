import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Lemonhead',
  description:
    'Enter any nursery price list, answer a few questions, and see what you will really pay with your funded hours and support applied.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <header className="site">
          <h1>Lemonhead</h1>
          <p>Childcare costs, freshly squeezed.</p>
        </header>
        <main>
          <p className="note">
            Covers England&apos;s childcare funding rules. Every number links to your price list or
            to the gov.uk rule that produced it.
          </p>
          {children}
        </main>
      </body>
    </html>
  );
}
