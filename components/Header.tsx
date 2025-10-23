'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';

export default function Header() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address: address,
  });
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return '$0.00';
    const formatted = formatEther(balance);
    const num = parseFloat(formatted);
    return `$${num.toFixed(2)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          
          {/* Logo Section */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logomuz.png"
              alt="SeersLeague"
              width={120}
              height={30}
              priority
              className="h-10 w-auto transition-all duration-300 hover:scale-105"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(252, 211, 77, 0.3))'
              }}
            />
          </Link>
          
          {/* User Info Section */}
          <div className="flex items-center gap-3">
            {/* Balance */}
            {isConnected && balance && (
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-semibold text-sm">
                  {formatBalance(balance.value)}
                </span>
              </div>
            )}
            
            {/* Wallet Address */}
            {isConnected && address && (
              <div className="flex items-center gap-2 rounded-full bg-gray-800 px-3 py-1.5 text-sm font-medium text-white">
                <span>{formatAddress(address)}</span>
              </div>
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
