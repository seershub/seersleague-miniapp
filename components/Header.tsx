'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMiniKit } from '@/components/MiniKitProvider';
import { sdk } from '@farcaster/miniapp-sdk';

// Base Mainnet USDC Contract Address
const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export default function Header() {
  const { isReady, address, balance } = useMiniKit();
  const [mounted, setMounted] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch USDC balance using Farcaster SDK
  useEffect(() => {
    const fetchUSDCBalance = async () => {
      if (!isReady || !address) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const wallet = await sdk.wallet;
        if (wallet?.ethProvider) {
          const balance = await wallet.ethProvider.request({
            method: 'eth_call',
            params: [
              {
                to: USDC_CONTRACT_ADDRESS,
                data: `0x70a08231000000000000000000000000${address.slice(2)}`
              },
              'latest'
            ]
          });

          const balanceInUSDC = parseInt(balance, 16) / Math.pow(10, 6);
          setUsdcBalance(balanceInUSDC.toFixed(2));
        }
      } catch (error) {
        console.log('Error fetching USDC balance:', error);
        setUsdcBalance('0.00');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUSDCBalance();
  }, [isReady, address]);

  if (!mounted) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Gradient border bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(245,158,11,0.3)] to-transparent" />

      <div className="h-16 flex items-center justify-between px-4 glass">
        {/* Left - Logo + Live Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <Image
              src="/logomuz.png"
              alt="SeersLeague"
              width={180}
              height={45}
              priority
              className="h-9 w-auto transition-transform duration-300 hover:scale-105"
            />
          </Link>

          {/* Live Badge - No emoji */}
          <div className="badge-live">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[rgb(var(--brand-green))] opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(var(--brand-green))]" />
            </span>
            <span className="font-semibold tracking-wide">LIVE</span>
          </div>
        </div>

        {/* Right - USDC Balance */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(24,24,30,0.8)] border border-[rgba(55,55,65,0.6)]">
          {isLoading ? (
            <span className="text-base font-semibold text-[rgb(var(--text-muted))] animate-pulse">
              $...
            </span>
          ) : (
            <span className="text-base font-semibold text-white">
              ${usdcBalance}
            </span>
          )}
          <img
            src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png"
            alt="USDC"
            className="h-5 w-5 rounded-full"
          />
        </div>
      </div>
    </header>
  );
}
