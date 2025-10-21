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
            
            <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/10">
              <div className="container mx-auto px-4 py-6">
                <div className="flex items-center justify-center">
                  <Image
                    src="/logomuz.png"
                    alt="SeersLeague"
                    width={280}
                    height={90}
                    priority
                    className="h-20 w-auto object-contain"
                  />
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 pb-24">
              {children}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10">
              <div className="container mx-auto">
                <div className="flex items-center justify-around h-20">
                  <Link 
                    href="/"
                    className="flex flex-col items-center gap-2 px-8 py-3 text-gray-400 hover:text-gold-500 transition-all"
                  >
                    <Home className="w-7 h-7" />
                    <span className="text-xs font-semibold">Home</span>
                  </Link>
                  <Link 
                    href="/leaderboard"
                    className="flex flex-col items-center gap-2 px-8 py-3 text-gray-400 hover:text-gold-500 transition-all"
                  >
                    <Trophy className="w-7 h-7" />
                    <span className="text-xs font-semibold">Leaderboard</span>
                  </Link>
                  <Link 
                    href="/profile"
                    className="flex flex-col items-center gap-2 px-8 py-3 text-gray-400 hover:text-gold-500 transition-all"
                  >
                    <User className="w-7 h-7" />
                    <span className="text-xs font-semibold">Profile</span>
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