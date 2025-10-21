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
    <html lang="en" className="dark">
      <body className="bg-black text-white antialiased">
        <MiniKitProvider>
          <div className="min-h-screen flex flex-col">
            
            {/* NEW DESIGN: Clean header with centered logo */}
            <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5">
              <div className="max-w-5xl mx-auto px-4 py-5">
                <div className="flex items-center justify-center">
                  <Image
                    src="/logomuz.png"
                    alt="SeersLeague"
                    width={240}
                    height={75}
                    priority
                    className="h-16 w-auto"
                  />
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 pb-24">
              {children}
            </main>

            {/* NEW DESIGN: Bottom navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/98 backdrop-blur-xl border-t border-white/5">
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-around h-18">
                  <Link href="/" className="flex flex-col items-center gap-1.5 py-3 px-6 text-gray-500 hover:text-gold-500 transition-colors">
                    <Home className="w-6 h-6" />
                    <span className="text-xs font-medium">Home</span>
                  </Link>
                  <Link href="/leaderboard" className="flex flex-col items-center gap-1.5 py-3 px-6 text-gray-500 hover:text-gold-500 transition-colors">
                    <Trophy className="w-6 h-6" />
                    <span className="text-xs font-medium">Leaderboard</span>
                  </Link>
                  <Link href="/profile" className="flex flex-col items-center gap-1.5 py-3 px-6 text-gray-500 hover:text-gold-500 transition-colors">
                    <User className="w-6 h-6" />
                    <span className="text-xs font-medium">Profile</span>
                  </Link>
                </div>
              </div>
            </nav>

          </div>

          <Toaster position="top-center" />
        </MiniKitProvider>
      </body>
    </html>
  );
}