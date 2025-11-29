import type { Metadata } from 'next';
import './globals.css';
import { MiniKitProvider } from '@/components/MiniKitProvider';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Home, Trophy, User } from 'lucide-react';
import Header from '@/components/Header';
import { OnboardingModal } from '@/components/OnboardingModal';

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
    'fc:frame:button:1': 'Launch SeersLeague',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': 'https://league.seershub.com',
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageUrl: 'https://league.seershub.com/og-image.png',
      button: {
        title: 'Launch SeersLeague',
        action: {
          type: 'launch_frame',
          name: 'SeersLeague',
          url: 'https://league.seershub.com',
          splashImageUrl: 'https://league.seershub.com/splash.png',
          splashBackgroundColor: '#0052FF'
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
            
            {/* Professional Header */}
            <Header />

            {/* Main content */}
            <main className="flex-1 pb-24">
              {children}
            </main>

            {/* Onboarding Modal */}
            <OnboardingModal />

            {/* Premium Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-2xl border-t border-gold-500/10 shadow-premium pb-safe">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-around h-16 sm:h-20">
                  <Link
                    href="/"
                    className="group flex flex-col items-center gap-1 px-4 py-2 transition-all duration-300 relative"
                  >
                    <Home className="w-6 h-6 text-gray-400 group-hover:text-gold-500 transition-colors" />
                    <span className="text-xs font-semibold text-gray-400 group-hover:text-gold-500 transition-colors">Home</span>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gold-gradient group-hover:w-12 transition-all duration-300 rounded-full"></div>
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="group flex flex-col items-center gap-1 px-4 py-2 transition-all duration-300 relative"
                  >
                    <Trophy className="w-6 h-6 text-gray-400 group-hover:text-gold-500 transition-colors" />
                    <span className="text-xs font-semibold text-gray-400 group-hover:text-gold-500 transition-colors">Leaderboard</span>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gold-gradient group-hover:w-12 transition-all duration-300 rounded-full"></div>
                  </Link>
                  <Link
                    href="/profile"
                    className="group flex flex-col items-center gap-1 px-4 py-2 transition-all duration-300 relative"
                  >
                    <User className="w-6 h-6 text-gray-400 group-hover:text-gold-500 transition-colors" />
                    <span className="text-xs font-semibold text-gray-400 group-hover:text-gold-500 transition-colors">Profile</span>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gold-gradient group-hover:w-12 transition-all duration-300 rounded-full"></div>
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