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
            
            {/* Header - Premium Modern Design */}
            <header className="relative bg-black overflow-hidden">
              {/* Animated Background Gradient Mesh */}
              <div className="absolute inset-0">
                {/* Base gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/[0.08] via-black to-amber-500/[0.08]"></div>

                {/* Animated gradient orbs */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" style={{animationDuration: '4s'}}></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{animationDuration: '6s', animationDelay: '1s'}}></div>
              </div>

              {/* Noise texture overlay for depth */}
              <div className="absolute inset-0 opacity-[0.015]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
              }}></div>

              {/* Content */}
              <div className="relative">
                {/* Top gradient border */}
                <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent"></div>

                <div className="max-w-7xl mx-auto px-6 py-10">
                  {/* Logo - Large and Centered */}
                  <div className="flex items-center justify-center">
                    <div className="relative group">
                      {/* Premium glow effect - multiple layers */}
                      <div className="absolute -inset-8 bg-gradient-to-r from-yellow-500/0 via-yellow-500/20 to-yellow-500/0 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      <div className="absolute -inset-6 bg-gradient-to-r from-amber-500/0 via-amber-500/15 to-amber-500/0 blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-700"></div>

                      {/* Logo */}
                      <div className="relative">
                        <Image
                          src="/logomuz.png"
                          alt="SeersLeague"
                          width={800}
                          height={200}
                          priority
                          className="h-32 sm:h-36 md:h-40 w-auto object-contain relative z-10 transform group-hover:scale-[1.01] transition-all duration-700 ease-out"
                          style={{
                            filter: 'drop-shadow(0 10px 30px rgba(251, 191, 36, 0.3)) drop-shadow(0 0 60px rgba(251, 191, 36, 0.1))'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tagline - Elegant Typography */}
                  <div className="mt-4 text-center">
                    <p className="text-sm sm:text-base font-light tracking-wide text-gray-400/80">
                      <span className="text-yellow-400/90 font-medium">Daily Football Predictions</span>
                      <span className="mx-2 text-gray-600">•</span>
                      <span className="text-gray-500">Compete & Win</span>
                    </p>
                  </div>
                </div>

                {/* Bottom gradient border */}
                <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent"></div>
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