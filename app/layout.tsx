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
            
            {/* DRAMATIC HEADER */}
            <header className="sticky top-0 z-50 bg-gradient-to-r from-black via-gray-900 to-black backdrop-blur-2xl border-b border-gold-500/20">
              <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex items-center justify-center">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-gold-500/20 to-gold-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <Image
                      src="/logomuz.png"
                      alt="SeersLeague"
                      width={280}
                      height={90}
                      priority
                      className="relative h-20 w-auto drop-shadow-2xl"
                    />
                  </div>
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 pb-24">
              {children}
            </main>

            {/* DRAMATIC BOTTOM NAVIGATION */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-black via-gray-900 to-black backdrop-blur-2xl border-t border-gold-500/20">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-around h-20">
                  <Link href="/" className="group flex flex-col items-center gap-2 py-4 px-8 text-gray-400 hover:text-gold-500 transition-all duration-300 hover:scale-110">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 group-hover:from-gold-500/20 group-hover:to-gold-600/20 border border-white/10 group-hover:border-gold-500/30 transition-all">
                      <Home className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">Home</span>
                  </Link>
                  <Link href="/leaderboard" className="group flex flex-col items-center gap-2 py-4 px-8 text-gray-400 hover:text-gold-500 transition-all duration-300 hover:scale-110">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 group-hover:from-gold-500/20 group-hover:to-gold-600/20 border border-white/10 group-hover:border-gold-500/30 transition-all">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">Leaderboard</span>
                  </Link>
                  <Link href="/profile" className="group flex flex-col items-center gap-2 py-4 px-8 text-gray-400 hover:text-gold-500 transition-all duration-300 hover:scale-110">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 group-hover:from-gold-500/20 group-hover:to-gold-600/20 border border-white/10 group-hover:border-gold-500/30 transition-all">
                      <User className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">Profile</span>
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