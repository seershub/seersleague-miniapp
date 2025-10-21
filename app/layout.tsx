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
      <body className="bg-black text-white antialiased">
        <MiniKitProvider>
          <div className="min-h-screen flex flex-col">
            
            <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-yellow-500/20 relative overflow-hidden">
              {/* Animated Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-amber-600/5 to-orange-500/10 animate-pulse"></div>

              {/* PNG Effect Background */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'url(/logo-effect.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />

              {/* Radial Glow Effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-radial from-yellow-500/20 via-transparent to-transparent blur-2xl"></div>

              <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-center relative z-10">
                <div className="relative group">
                  {/* Enhanced Logo Glow - Multiple Layers */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-yellow-500/30 via-amber-500/30 to-yellow-500/30 blur-3xl opacity-75 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                  <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400/40 to-amber-400/40 blur-xl"></div>

                  <Image
                    src="/logomuz.png"
                    alt="SeersLeague"
                    width={600}
                    height={150}
                    priority
                    className="h-28 w-auto object-contain relative z-10 transform group-hover:scale-105 transition-transform duration-300"
                    style={{
                      filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6)) drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))'
                    }}
                  />
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 pb-24">
              {children}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-around h-16">
                  <Link 
                    href="/"
                    className="flex flex-col items-center gap-1 px-4 py-2 text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <Home className="w-5 h-5" />
                    <span className="text-xs font-medium">Home</span>
                  </Link>
                  <Link 
                    href="/leaderboard"
                    className="flex flex-col items-center gap-1 px-4 py-2 text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <Trophy className="w-5 h-5" />
                    <span className="text-xs font-medium">Leaderboard</span>
                  </Link>
                  <Link 
                    href="/profile"
                    className="flex flex-col items-center gap-1 px-4 py-2 text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <User className="w-5 h-5" />
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