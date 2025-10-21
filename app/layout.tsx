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
            
            <header className="sticky top-0 z-50 relative overflow-hidden border-b border-yellow-500/30">
              {/* Animated Mesh Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-black via-yellow-950/20 to-black">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent"></div>
              </div>

              {/* Geometric Pattern Overlay */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fbbf24' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v6h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '30px 30px'
              }}></div>

              {/* PNG Effect - Positioned Left */}
              <div className="absolute left-0 top-0 bottom-0 w-2/3 opacity-15 blur-sm"
                style={{
                  backgroundImage: 'url(/logo-effect.png)',
                  backgroundSize: 'contain',
                  backgroundPosition: 'left center',
                  backgroundRepeat: 'no-repeat'
                }}
              />

              {/* Floating Particles */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-4 left-[15%] w-2 h-2 bg-yellow-400/40 rounded-full blur-sm animate-pulse"></div>
                <div className="absolute top-8 right-[20%] w-3 h-3 bg-amber-400/30 rounded-full blur-sm animate-pulse" style={{animationDelay: '0.5s'}}></div>
                <div className="absolute bottom-6 left-[40%] w-2 h-2 bg-orange-400/40 rounded-full blur-sm animate-pulse" style={{animationDelay: '1s'}}></div>
                <div className="absolute top-12 left-[60%] w-1.5 h-1.5 bg-yellow-300/50 rounded-full blur-sm animate-pulse" style={{animationDelay: '1.5s'}}></div>
              </div>

              {/* Glass Morphism Effect */}
              <div className="absolute inset-0 backdrop-blur-xl bg-black/60"></div>

              {/* Main Content Container */}
              <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                <div className="flex items-center justify-between py-4 gap-6">

                  {/* Left Side - Logo in Glass Card */}
                  <div className="flex items-center">
                    <div className="relative group">
                      {/* Glass Card Background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-amber-600/5 rounded-2xl backdrop-blur-sm border border-yellow-500/20"></div>

                      {/* Animated Border Glow */}
                      <div className="absolute -inset-[2px] bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500 bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite]"></div>

                      {/* Logo Container */}
                      <div className="relative px-6 py-4">
                        <Image
                          src="/logomuz.png"
                          alt="SeersLeague"
                          width={600}
                          height={150}
                          priority
                          className="h-20 sm:h-24 w-auto object-contain transform group-hover:scale-105 transition-all duration-300"
                          style={{
                            filter: 'drop-shadow(0 0 15px rgba(251, 191, 36, 0.4))'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Animated Info Cards */}
                  <div className="hidden md:flex items-center gap-4">

                    {/* Live Matches Indicator */}
                    <div className="relative group cursor-pointer">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-600/5 rounded-xl backdrop-blur-sm border border-green-500/20"></div>
                      <div className="relative px-4 py-2 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Live Now</p>
                          <p className="text-sm font-bold text-green-400">5 Matches</p>
                        </div>
                      </div>
                    </div>

                    {/* Prize Pool Card */}
                    <div className="relative group cursor-pointer">
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-amber-600/5 rounded-xl backdrop-blur-sm border border-yellow-500/20"></div>
                      <div className="absolute -inset-[1px] bg-gradient-to-r from-yellow-400 to-amber-400 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity"></div>
                      <div className="relative px-4 py-2">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Prize Pool</p>
                        <p className="text-sm font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">1000 USDC</p>
                      </div>
                    </div>

                    {/* Daily Predictions Card */}
                    <div className="relative group cursor-pointer">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-600/5 rounded-xl backdrop-blur-sm border border-purple-500/20"></div>
                      <div className="relative px-4 py-2">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Today</p>
                        <p className="text-sm font-bold text-purple-400">Predict & Win</p>
                      </div>
                    </div>

                  </div>

                  {/* Mobile - Compact Version */}
                  <div className="md:hidden flex items-center gap-2">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-amber-600/5 rounded-lg backdrop-blur-sm border border-yellow-500/20"></div>
                      <div className="relative px-3 py-2">
                        <span className="relative flex h-1.5 w-1.5 inline-flex">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                        </span>
                        <p className="text-xs font-bold text-green-400 ml-2 inline">Live</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Bottom Accent Line */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>

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