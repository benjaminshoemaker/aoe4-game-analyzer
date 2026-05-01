import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { buildWebVitalsScript } from '../lib/webVitals';

export const metadata: Metadata = {
  title: 'AoE4 Match Web',
  description: 'Web view for AoE4 post-match analysis',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          id="web-vitals-monitor"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: buildWebVitalsScript('/api/web-vitals') }}
        />
      </body>
    </html>
  );
}
