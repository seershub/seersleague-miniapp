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
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageUrl: 'https://league.seershub.com/og-image.png',
      button: {
        title: 'Open SeersLeague',
        action: {
          type: 'launch_frame',
          url: 'https://league.seershub.com'
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
      </head>
      <body className="bg-black text-white antialiased">
        <MiniKitProvider>
          <div className="min-h-screen flex flex-col">
            
            {/* Header - Seershub Style Adapted */}
            <header className="relative bg-black py-2 px-4">
              <div className="max-w-4xl mx-auto">
                {/* Main Container with Animated Border - Ultra Compact */}
                <div className="relative rounded-2xl overflow-hidden py-1.5 px-4">
                  {/* Animated Gradient Border - Brighter */}
                  <div
                    className="absolute inset-0 rounded-2xl animate-border-flow"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.5), rgba(245, 158, 11, 0.5), transparent) 0.6% 0% / 200% 100%'
                    }}
                  >
                    {/* Inner glassmorphism layer */}
                    <div className="absolute inset-[1px] rounded-2xl bg-white/[0.03] backdrop-blur-sm"></div>
                  </div>

                  {/* Subtle gradient overlay - Darker */}
                  <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/[0.12] to-transparent pointer-events-none"></div>

                  {/* Content */}
                  <div className="relative z-10 flex flex-col items-center">

                    {/* Logo Container - Large and Prominent */}
                    <div className="relative overflow-visible">
                      <Image
                        src="/logomuz.png"
                        alt="SeersLeague"
                        width={800}
                        height={200}
                        priority
                        className="h-40 md:h-44 lg:h-48 w-auto"
                        style={{
                          filter: 'brightness(1.2) contrast(1.08) drop-shadow(0 8px 24px rgba(251, 191, 36, 0.3))'
                        }}
                      />
                    </div>

                    {/* Decorative Line with Trophies - Premium Animation */}
                    <div className="flex items-center justify-center w-full max-w-md -mt-4">
                      <span
                        className="text-3xl animate-trophy-bounce-1"
                        style={{
                          filter: 'drop-shadow(0 4px 12px rgba(251, 191, 36, 0.6)) drop-shadow(0 0 20px rgba(251, 191, 36, 0.4))'
                        }}
                      >
                        🏆
                      </span>
                      <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent mx-4 relative">
                        {/* Animated shimmer line */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/60 to-transparent animate-shimmer-fast"></div>
                      </div>
                      <span
                        className="text-3xl animate-trophy-bounce-2"
                        style={{
                          filter: 'drop-shadow(0 4px 12px rgba(245, 158, 11, 0.6)) drop-shadow(0 0 20px rgba(245, 158, 11, 0.4))'
                        }}
                      >
                        🏆
                      </span>
                    </div>

                    {/* Tagline - Enhanced Readability */}
                    <p className="text-sm md:text-base text-white/70 font-normal tracking-wider text-center mt-0 leading-relaxed">
                      <span className="text-yellow-400/90">Decentralized</span> Football <span className="text-amber-400/90">Prediction</span> Platform
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