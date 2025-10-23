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
            
            {/* Header */}
            <header className="relative bg-black/80 backdrop-blur-sm border-b border-gray-800 overflow-hidden">
              {/* Animated background lines */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent animate-pulse"></div>
                <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent animate-pulse" style={{animationDelay: '1s'}}></div>
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent animate-pulse" style={{animationDelay: '2s'}}></div>
              </div>
              
              <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
                <div className="flex items-center justify-center">
                  <Link href="/" className="flex items-center">
                    <Image
                      src="/logomuz.png"
                      alt="SeersLeague"
                      width={500}
                      height={125}
                      priority
                      className="h-30 w-auto transition-all duration-300 hover:scale-105"
                    />
                  </Link>
                </div>
                
                {/* Navigation below logo */}
                <nav className="flex items-center justify-center space-x-8 mt-4">
                  <Link href="/" className="text-white/80 hover:text-yellow-400 transition-colors duration-200">
                    Home
                  </Link>
                  <Link href="/leaderboard" className="text-white/80 hover:text-yellow-400 transition-colors duration-200">
                    Leaderboard
                  </Link>
                  <Link href="/profile" className="text-white/80 hover:text-yellow-400 transition-colors duration-200">
                    Profile
                  </Link>
                </nav>
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