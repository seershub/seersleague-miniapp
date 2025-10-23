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
          // Get USDC balance using eth_call
          const balance = await wallet.ethProvider.request({
            method: 'eth_call',
            params: [
              {
                to: USDC_CONTRACT_ADDRESS,
                data: `0x70a08231000000000000000000000000${address.slice(2)}` // balanceOf(address)
              },
              'latest'
            ]
          });
          
          // Convert from wei to USDC (6 decimals)
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
    <header className="sticky top-0 z-50 w-full bg-gray-950/70 backdrop-blur-lg border-b border-white/10 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          
          {/* Sol Taraf - Logo + Live Etiketi */}
          <div className="flex items-center gap-3">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/logomuz.png"
                alt="SeersLeague"
                width={200}
                height={50}
                priority
                className="h-10 w-auto transition-all duration-300 hover:scale-105"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(252, 211, 77, 0.3))'
                }}
              />
            </Link>
            
            {/* Live Etiketi */}
            <div className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              LIVE
            </div>
          </div>
          
          {/* Sağ Taraf - USDC Bakiyesi */}
          <div className="flex items-center gap-2">
            {isLoading && (
              <span className="text-lg font-medium text-gray-500 animate-pulse">
                $....
              </span>
            )}

            {!isLoading && (
              <span className="text-lg font-medium text-white">
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
      </div>
    </header>
  );
}
