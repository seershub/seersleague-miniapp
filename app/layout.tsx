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
            
            {/* Header - Ultra Modern Professional Design */}
            <header className="relative overflow-hidden">
              {/* Animated Background with Parallax Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
                {/* Animated Grid Pattern */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(251,191,36,0.1)_50%,transparent_100%)] bg-[length:20px_20px] animate-pulse"></div>
                </div>
                
                {/* Floating Particles */}
                <div className="absolute inset-0">
                  <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400/30 rounded-full animate-float-1"></div>
                  <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-amber-400/40 rounded-full animate-float-2"></div>
                  <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-yellow-300/20 rounded-full animate-float-3"></div>
                  <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-amber-300/30 rounded-full animate-float-4"></div>
                </div>
              </div>

              {/* Main Header Container */}
              <div className="relative z-10 py-8 px-4">
                <div className="max-w-6xl mx-auto">
                  
                  {/* Premium Glass Container */}
                  <div className="relative rounded-3xl overflow-hidden backdrop-blur-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] shadow-2xl">
                    
                    {/* Animated Border Gradient */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-yellow-400/20 via-amber-400/30 to-yellow-400/20 animate-gradient-shift"></div>
                    <div className="absolute inset-[1px] rounded-3xl bg-gradient-to-br from-black/90 to-gray-900/90"></div>
                    
                    {/* Inner Glow Effect */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-yellow-400/5 to-transparent"></div>
                    
                    {/* Content Container */}
                    <div className="relative z-10 p-8 md:p-12">
                      
                      {/* Logo Section with Enhanced Effects */}
                      <div className="flex flex-col items-center space-y-6">
                        
                        {/* Logo with Advanced Animations */}
                        <div className="relative group">
                          {/* Logo Glow Ring */}
                          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-yellow-400/20 via-amber-400/30 to-yellow-400/20 blur-xl group-hover:blur-2xl transition-all duration-1000 animate-pulse"></div>
                          
                          {/* Logo Container */}
                          <div className="relative transform group-hover:scale-105 transition-all duration-700 ease-out">
                            <Image
                              src="/logomuz.png"
                              alt="SeersLeague"
                              width={800}
                              height={200}
                              priority
                              className="h-40 md:h-44 lg:h-48 w-auto relative z-10"
                              style={{
                                filter: 'brightness(1.1) contrast(1.1) drop-shadow(0 0 30px rgba(251, 191, 36, 0.4)) drop-shadow(0 0 60px rgba(245, 158, 11, 0.2))'
                              }}
                            />
                            
                            {/* Animated Shimmer Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer-slow opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                          </div>
                        </div>

                        {/* Premium Divider with Enhanced Effects */}
                        <div className="flex items-center justify-center w-full max-w-lg">
                          {/* Left Trophy */}
                          <div className="relative">
                            <div className="absolute -inset-2 bg-yellow-400/20 rounded-full blur-sm animate-pulse"></div>
                            <span className="relative text-4xl animate-bounce-slow" style={{
                              filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 40px rgba(245, 158, 11, 0.4))'
                            }}>
                              🏆
                            </span>
                          </div>
                          
                          {/* Animated Line */}
                          <div className="flex-1 mx-6 relative">
                            <div className="h-[3px] bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent rounded-full relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-fast"></div>
                            </div>
                            {/* Floating particles on line */}
                            <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-float-line-1"></div>
                            <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-amber-300 rounded-full animate-float-line-2"></div>
                          </div>
                          
                          {/* Right Trophy */}
                          <div className="relative">
                            <div className="absolute -inset-2 bg-amber-400/20 rounded-full blur-sm animate-pulse"></div>
                            <span className="relative text-4xl animate-bounce-slow" style={{
                              filter: 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.8)) drop-shadow(0 0 40px rgba(251, 191, 36, 0.4))'
                            }}>
                              🏆
                            </span>
                          </div>
                        </div>

                        {/* Enhanced Tagline */}
                        <div className="text-center space-y-2">
                          <p className="text-lg md:text-xl font-light tracking-wide text-white/90 leading-relaxed">
                            <span className="bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent font-semibold animate-text-shimmer">
                              Decentralized
                            </span>
                            <span className="text-white/80 mx-2">Football</span>
                            <span className="bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent font-semibold animate-text-shimmer">
                              Prediction
                            </span>
                            <span className="text-white/80 mx-2">Platform</span>
                          </p>
                          
                          {/* Subtitle with subtle animation */}
                          <p className="text-sm text-white/60 font-light tracking-wider animate-fade-in-up">
                            Predict • Compete • Win
                          </p>
                        </div>
                      </div>
                    </div>
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