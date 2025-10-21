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
            
            {/* Header - Seershub Style Adapted */}
            <header className="relative bg-black py-6 px-4">
              <div className="max-w-4xl mx-auto">
                {/* Main Container with Animated Border */}
                <div className="relative rounded-2xl overflow-hidden py-6 px-6">
                  {/* Animated Gradient Border */}
                  <div
                    className="absolute inset-0 rounded-2xl animate-border-flow"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.3), transparent) 0.6% 0% / 200% 100%'
                    }}
                  >
                    {/* Inner glassmorphism layer */}
                    <div className="absolute inset-[1px] rounded-2xl bg-white/[0.02] backdrop-blur-sm"></div>
                  </div>

                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/[0.02] to-transparent pointer-events-none"></div>

                  {/* Content */}
                  <div className="relative z-10 flex flex-col items-center">

                    {/* Logo Container - Fixed height to prevent cropping */}
                    <div className="relative overflow-visible py-2">
                      <Image
                        src="/logomuz.png"
                        alt="SeersLeague"
                        width={700}
                        height={180}
                        priority
                        className="h-24 md:h-28 lg:h-32 w-auto"
                        style={{
                          filter: 'brightness(1.15) contrast(1.05) drop-shadow(0 8px 24px rgba(0, 0, 0, 0.2))'
                        }}
                      />
                    </div>

                    {/* Decorative Line with Soccer Balls */}
                    <div className="flex items-center justify-center w-full max-w-md -mt-4">
                      <span
                        className="text-2xl opacity-35 animate-float-rotate-1"
                        style={{
                          filter: 'drop-shadow(0 2px 8px rgba(251, 191, 36, 0.2))'
                        }}
                      >
                        ⚽
                      </span>
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mx-4"></div>
                      <span
                        className="text-2xl opacity-35 animate-float-rotate-2"
                        style={{
                          filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.2))'
                        }}
                      >
                        ⚽
                      </span>
                    </div>

                    {/* Tagline */}
                    <p className="text-xs md:text-sm text-white/40 font-light tracking-wide text-center mt-2">
                      Decentralized Football Prediction Platform
                    </p>
                  </div>
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