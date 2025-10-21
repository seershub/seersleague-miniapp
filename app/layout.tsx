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
            
            <header className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-xl border-b border-gold-500/20 shadow-lg">
              <div className="container mx-auto px-6 py-8">
                <div className="flex items-center justify-center">
                  <div className="relative group">
                    <Image
                      src="/logomuz.png"
                      alt="SeersLeague"
                      width={400}
                      height={120}
                      priority
                      className="h-24 w-auto object-contain animate-fade-in group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gold-gradient opacity-0 group-hover:opacity-10 rounded-2xl blur-xl transition-opacity duration-300"></div>
                  </div>
                </div>
                <div className="text-center mt-4">
                  <p className="text-gold-400 text-sm font-semibold tracking-wider uppercase">
                    Daily Football Predictions
                  </p>
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 pb-24">
              {children}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-xl border-t border-gold-500/20 shadow-lg">
              <div className="container mx-auto">
                <div className="flex items-center justify-around h-20">
                  <Link 
                    href="/"
                    className="flex flex-col items-center gap-2 px-6 py-4 text-surface-400 hover:text-gold-500 transition-all duration-300 group"
                  >
                    <div className="p-2 rounded-xl group-hover:bg-gold-500/10 transition-colors duration-300">
                      <Home className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <span className="text-xs font-semibold group-hover:text-gold-500 transition-colors duration-300">Home</span>
                  </Link>
                  <Link 
                    href="/leaderboard"
                    className="flex flex-col items-center gap-2 px-6 py-4 text-surface-400 hover:text-gold-500 transition-all duration-300 group"
                  >
                    <div className="p-2 rounded-xl group-hover:bg-gold-500/10 transition-colors duration-300">
                      <Trophy className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <span className="text-xs font-semibold group-hover:text-gold-500 transition-colors duration-300">Leaderboard</span>
                  </Link>
                  <Link 
                    href="/profile"
                    className="flex flex-col items-center gap-2 px-6 py-4 text-surface-400 hover:text-gold-500 transition-all duration-300 group"
                  >
                    <div className="p-2 rounded-xl group-hover:bg-gold-500/10 transition-colors duration-300">
                      <User className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <span className="text-xs font-semibold group-hover:text-gold-500 transition-colors duration-300">Profile</span>
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