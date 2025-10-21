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
            
            <header className="sticky top-0 z-50 bg-black/98 backdrop-blur-2xl border-b border-yellow-500/30 shadow-2xl">
              <div className="container mx-auto px-4 py-6">
                <div className="flex items-center justify-center">
                  <div className="relative group">
                    {/* Logo with enhanced effects */}
                    <div className="relative">
                      <Image
                        src="/logomuz.png"
                        alt="SeersLeague"
                        width={500}
                        height={150}
                        priority
                        className="h-28 w-auto object-contain animate-fade-in group-hover:scale-110 transition-all duration-500 filter drop-shadow-2xl"
                      />
                      {/* Animated glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 opacity-0 group-hover:opacity-20 rounded-3xl blur-2xl transition-all duration-500 animate-pulse-glow"></div>
                      {/* Pulsing border */}
                      <div className="absolute inset-0 border-2 border-yellow-500/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-500 animate-ping"></div>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 pb-24">
              {children}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/98 backdrop-blur-2xl border-t border-yellow-500/30 shadow-2xl">
              <div className="container mx-auto">
                <div className="flex items-center justify-around h-20">
                  <Link 
                    href="/"
                    className="flex flex-col items-center gap-2 px-6 py-4 text-gray-400 hover:text-yellow-500 transition-all duration-500 group"
                  >
                    <div className="p-3 rounded-2xl group-hover:bg-yellow-500/20 transition-all duration-500 group-hover:shadow-yellow-500/30 group-hover:shadow-lg">
                      <Home className="w-7 h-7 group-hover:scale-125 transition-all duration-500 group-hover:drop-shadow-lg" />
                    </div>
                    <span className="text-xs font-bold group-hover:text-yellow-500 transition-colors duration-500 tracking-wider">HOME</span>
                  </Link>
                  <Link 
                    href="/leaderboard"
                    className="flex flex-col items-center gap-2 px-6 py-4 text-gray-400 hover:text-yellow-500 transition-all duration-500 group"
                  >
                    <div className="p-3 rounded-2xl group-hover:bg-yellow-500/20 transition-all duration-500 group-hover:shadow-yellow-500/30 group-hover:shadow-lg">
                      <Trophy className="w-7 h-7 group-hover:scale-125 transition-all duration-500 group-hover:drop-shadow-lg" />
                    </div>
                    <span className="text-xs font-bold group-hover:text-yellow-500 transition-colors duration-500 tracking-wider">LEADERBOARD</span>
                  </Link>
                  <Link 
                    href="/profile"
                    className="flex flex-col items-center gap-2 px-6 py-4 text-gray-400 hover:text-yellow-500 transition-all duration-500 group"
                  >
                    <div className="p-3 rounded-2xl group-hover:bg-yellow-500/20 transition-all duration-500 group-hover:shadow-yellow-500/30 group-hover:shadow-lg">
                      <User className="w-7 h-7 group-hover:scale-125 transition-all duration-500 group-hover:drop-shadow-lg" />
                    </div>
                    <span className="text-xs font-bold group-hover:text-yellow-500 transition-colors duration-500 tracking-wider">PROFILE</span>
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