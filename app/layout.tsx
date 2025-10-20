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
      <body className="bg-dark-500 text-white min-h-screen">
        <MiniKitProvider>
          {/* Clean Centered Header */}
          <header className="sticky top-0 z-40 bg-gradient-dark backdrop-blur-md border-b border-surface-light/20">
            <div className="max-w-screen-sm mx-auto px-6 py-4 flex items-center justify-center">
              <Image 
                src="/logomuz.png" 
                alt="SeersLeague" 
                width={140} 
                height={36} 
                priority 
                className="animate-fade-in"
              />
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-screen-sm mx-auto w-full px-6 pb-24">
            {children}
          </main>

          {/* Bottom Navigation */}
          <footer className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-surface-light/20">
            <nav className="max-w-screen-sm mx-auto px-6 py-3 flex items-center justify-around">
              <Link href="/" className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-primary-500 transition-all duration-200 group">
                <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium">Home</span>
              </Link>
              <Link href="/leaderboard" className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-primary-500 transition-all duration-200 group">
                <Trophy className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium">Leaderboard</span>
              </Link>
              <Link href="/profile" className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-primary-500 transition-all duration-200 group">
                <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium">Profile</span>
              </Link>
            </nav>
          </footer>

          <Toaster position="top-center" />
        </MiniKitProvider>
      </body>
    </html>
  );
}