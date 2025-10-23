'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMiniKit } from '@/components/MiniKitProvider';
import { sdk } from '@farcaster/miniapp-sdk';

export default function Header() {
  const { isReady, address, balance } = useMiniKit();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: string | undefined) => {
    if (!bal) return '$0.00';
    const num = parseFloat(bal);
    return `$${num.toFixed(2)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-gray-950/70 backdrop-blur-md border-b border-white/10">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          
          {/* Logo Section */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logomuz.png"
              alt="SeersLeague"
              width={200}
              height={50}
              priority
              className="h-9 w-auto transition-all duration-300 hover:scale-105"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(252, 211, 77, 0.3))'
              }}
            />
          </Link>
          
          {/* User Info Section */}
          <div className="flex items-center gap-3">
            {/* Balance */}
            {isReady && balance && (
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">
                  {formatBalance(balance)}
                </span>
              </div>
            )}
            
            {/* Add Funds Button */}
            {isReady && (
              <button 
                onClick={() => {
                  // Base yönlendirmesi için Farcaster SDK kullan
                  if (typeof window !== 'undefined' && (window as any).base) {
                    (window as any).base.openWallet();
                  } else {
                    // Fallback: Base web sitesine yönlendir
                    window.open('https://base.org', '_blank');
                  }
                }}
                className="
                  rounded-full 
                  bg-blue-600 
                  px-3 py-1.5 
                  text-xs 
                  font-medium 
                  text-white 
                  transition-colors 
                  hover:bg-blue-500
                  active:bg-blue-700
                "
              >
                Add Funds
              </button>
            )}
            
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-4 ml-4">
              <Link 
                href="/leaderboard" 
                className="text-white/80 hover:text-yellow-400 transition-colors duration-200 text-sm font-medium"
              >
                Leaderboard
              </Link>
              <Link 
                href="/profile" 
                className="text-white/80 hover:text-yellow-400 transition-colors duration-200 text-sm font-medium"
              >
                Profile
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
