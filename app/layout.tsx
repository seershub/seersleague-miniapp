import type { Metadata } from 'next';
import './globals.css';
import { MiniKitProvider } from '@/components/MiniKitProvider';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { Home, Vault, Trophy, User } from 'lucide-react';
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
    'fc:miniapp': JSON.stringify({
      version: "1",
      imageUrl: 'https://league.seershub.com/og-image.png',
      aspectRatio: "3:2",
      button: {
        title: 'Open SeersLeague',
        action: {
          type: 'launch_miniapp',
          name: 'SeersLeague',
          url: 'https://league.seershub.com',
          splashImageUrl: 'https://league.seershub.com/splash.png',
          splashBackgroundColor: '#0052FF'
        }
      }
    }),
    'fc:frame': JSON.stringify({
      version: "1",
      imageUrl: 'https://league.seershub.com/og-image.png',
      aspectRatio: "3:2",
      button: {
        title: 'Open SeersLeague',
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
        <meta name="theme-color" content="#0A0A0B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
      </head>
      <body className="min-h-screen bg-[rgb(var(--bg-primary))]">
        <MiniKitProvider>
          <div className="min-h-screen flex flex-col">

            {/* Header */}
            <Header />

            {/* Main content */}
            <main className="flex-1 pb-20">
              {children}
            </main>

            {/* Onboarding Modal */}
            <OnboardingModal />

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50">
              {/* Top border gradient */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(245,158,11,0.2)] to-transparent" />

              <div className="glass">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-around h-16 px-2">
                    <NavItem href="/" icon={Home} label="Home" />
                    <NavItem href="/vault" icon={Vault} label="Vault" />
                    <NavItem href="/leaderboard" icon={Trophy} label="Rankings" />
                    <NavItem href="/profile" icon={User} label="Profile" />
                  </div>
                </div>
              </div>
            </nav>

          </div>

          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'rgba(24, 24, 30, 0.95)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                fontSize: '14px',
                fontFamily: 'Satoshi, system-ui, sans-serif',
              },
              success: {
                iconTheme: {
                  primary: '#22C55E',
                  secondary: '#000',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#000',
                },
              },
            }}
          />
        </MiniKitProvider>
      </body>
    </html>
  );
}

// Navigation Item Component
function NavItem({
  href,
  icon: Icon,
  label
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="relative flex flex-col items-center gap-1 px-4 py-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))] transition-colors duration-200 group"
    >
      <div className="relative">
        <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
        {/* Active indicator would be added via client component */}
      </div>
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </Link>
  );
}