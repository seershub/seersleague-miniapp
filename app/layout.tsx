import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SeersLeague - Daily Football Predictions on Base',
  description: 'First day free! Predict 5 matches daily, compete for prizes. Build your on-chain reputation.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-512.png',
    apple: '/icon-512.png',
  },
  openGraph: {
    title: 'SeersLeague - Daily Football Predictions',
    description: 'First day free! Daily predictions, skill-based competition.',
    images: ['/og-image.png'],
    url: 'https://league.seershub.com',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SeersLeague - Daily Football Predictions on Base',
    description: 'First day free! Predict 5 matches daily, compete for prizes. Build your on-chain prediction reputation.',
    images: ['/og-image.png'],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://league.seershub.com/og-image.png',
    'fc:frame:button:1': 'Launch App',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': 'https://league.seershub.com',
    'fc:miniapp': JSON.stringify({
      "version": "next",
      "imageUrl": "https://league.seershub.com/og-image.png",
      "button": {
        "title": "Launch SeersLeague",
        "action": {
          "type": "launch_frame",
          "name": "SeersLeague",
          "url": "https://league.seershub.com",
          "splashImageUrl": "https://league.seershub.com/splash.png",
          "splashBackgroundColor": "#0052FF"
        }
      }
    }),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
