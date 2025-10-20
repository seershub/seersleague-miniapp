import type { Metadata } from 'next';
import './globals.css';
import { MiniKitProvider } from '@/components/MiniKitProvider';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Home, Trophy, User } from 'lucide-react';

export const metadata: Metadata = {
  title: 'SeersLeague - Daily Football Predictions',
  description: 'Predict 5 featured football matches daily on Base Mainnet and compete for prizes!',
  icons: {
    icon: '/icon-512.png',
    apple: '/icon-512.png',
  },
  openGraph: {
    title: 'SeersLeague - Daily Football Predictions',
    description: 'Predict 5 featured football matches daily on Base Mainnet and compete for prizes!',
    images: ['/og-image.png'],
    type: 'website',
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': '/og-image.png',
    'fc:frame:button:1': 'Start Predicting',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': 'https://league.seershub.com',
    'fc:miniapp': 'https://league.seershub.com',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-dark text-white">
        <MiniKitProvider>
          {/* Header with logo */}
          <header className="sticky top-0 z-40 bg-[#0b0b0c]/80 backdrop-blur border-b border-gray-800">
            <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center gap-3">
              <Image src="/logomuz.png" alt="SeersLeague" width={120} height={32} priority />
              <div className="ml-auto text-sm text-gray-400">Daily Football Predictions</div>
            </div>
          </header>

          {/* Page content */}
          <main className="max-w-screen-sm mx-auto w-full px-4 pb-20">
            {children}
          </main>

          {/* Fixed Footer Navigation */}
          <footer className="fixed bottom-0 left-0 right-0 bg-[#0b0b0c]/95 border-t border-gray-800">
            <nav className="max-w-screen-sm mx-auto px-6 py-2 flex items-center justify-between">
              <Link href="/" className="flex flex-col items-center gap-1 text-gray-300 hover:text-primary transition-colors">
                <Home className="w-5 h-5" />
                <span className="text-xs">Home</span>
              </Link>
              <Link href="/leaderboard" className="flex flex-col items-center gap-1 text-gray-300 hover:text-primary transition-colors">
                <Trophy className="w-5 h-5" />
                <span className="text-xs">Leaderboard</span>
              </Link>
              <Link href="/profile" className="flex flex-col items-center gap-1 text-gray-300 hover:text-primary transition-colors">
                <User className="w-5 h-5" />
                <span className="text-xs">Profile</span>
              </Link>
            </nav>
          </footer>

          <Toaster position="top-center" />
        </MiniKitProvider>
      </body>
    </html>
  );
}