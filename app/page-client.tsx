'use client';

import { useEffect, useState } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { PredictionForm } from '@/components/PredictionForm';
import { useMiniKit } from '@/components/MiniKitProvider';
import { sdk } from '@farcaster/miniapp-sdk';
import { Match } from '@/lib/matches';
import { Wallet } from 'lucide-react';

interface HomeProps {
  initialMatches?: Match[];
}

export default function Home({ initialMatches = [] }: HomeProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [loading, setLoading] = useState(initialMatches.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const { isReady } = useMiniKit();
  
  // Check chain ID and fetch matches
  useEffect(() => {
    // Initialize Farcaster MiniApp SDK
    const initializeSDK = async () => {
      try {
        await sdk.actions.ready();
        console.log('Farcaster MiniApp SDK ready!');
      } catch (error) {
        console.error('SDK initialization error:', error);
      }
    };

    initializeSDK();

    // Initialize Base SDK when MiniKit is ready
    if (isReady) {
      console.log('MiniKit ready!');
      if (typeof window !== 'undefined' && (window as any).base) {
        console.log('Base SDK ready!');
      }
    }

    // Check if we're in Base App context
    if (typeof window !== 'undefined') {
      // Check for Base App context
      if ((window as any).ethereum) {
        (window as any).ethereum.request({ method: 'eth_chainId' })
          .then((id: string) => {
            setChainId(id);
            console.log('Current chain ID:', id);
            if (id !== '0x2105') {
              console.warn('Not on Base Mainnet! Current chain:', id, 'Expected: 0x2105');
            }
          })
          .catch(console.error);
      }
    }

    // Always fetch matches and keep them fresh
    const fetchMatches = async () => {
      try {
        const isInitial = matches.length === 0 && initialMatches.length === 0;
        if (isInitial) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        console.log('Fetching matches...');
        const response = await fetch(`/api/matches?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Match[] = await response.json();
        console.log('Matches received:', data);
        setMatches(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching matches:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    };

    // Initial fetch (even if SSR provided matches)
    fetchMatches();

    // Poll every 30s to keep list updated and circulating
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="min-h-screen bg-black">
        <div className="max-w-4xl mx-auto px-4 py-8">
          
          {/* WALLET STATUS - MINIMAL */}
          <section className="mb-8">
            <WalletConnect />
          </section>

          {/* FLEXIBLE PREDICTIONS INFO - SINGLE INSTANCE */}
          <section className="mb-8">
            <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 rounded-xl p-5">
              <div className="flex flex-col space-y-3">
                {/* Title Row */}
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🎯</span>
                  <span className="text-lg font-bold text-white">Flexible Predictions</span>
                </div>

                {/* Description */}
                <p className="text-sm md:text-base text-gray-300 leading-relaxed pl-9">
                  Select any matches you want to predict.
                  <span className="block mt-1">
                    <span className="text-green-400 font-semibold">First 5 predictions are free</span>, then <span className="text-yellow-400 font-semibold">0.5 USDC</span> per match.
                  </span>
                </p>
              </div>
            </div>
          </section>

        {/* MATCHES SECTION */}
        <section className="mb-8">
          <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 glass-effect px-4 py-2 rounded-full mb-6 border border-yellow-400/20">
                <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-yellow-400">Live Competitions</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                <strong className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-3 py-1 rounded mr-2">Today</strong>
                Matches
              </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Join live prediction competitions. Make your picks, compete with others, win USDC rewards instantly.
            </p>
          </div>

          {/* MATCHES GRID */}
          {loading ? (
            <div className="grid gap-4 sm:gap-6 max-w-4xl mx-auto">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-48 bg-gray-800 rounded-2xl animate-pulse border border-gray-700" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 max-w-4xl mx-auto">
              {matches.map((match) => (
                <PredictionForm key={match.id} matches={[match]} />
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 mb-4">
              <p className="text-red-400 font-semibold">Error: {error}</p>
              <p className="text-gray-400 text-sm mt-2">
                Please check your connection and try again
              </p>
            </div>
          )}
          
          {!loading && !error && matches.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚽</span>
              </div>
              <p className="text-gray-400 text-lg">No matches available today</p>
              <p className="text-gray-500 text-sm mt-2">Check back later for new matches</p>
            </div>
          )}
        </section>

        {/* CHAIN WARNING */}
        {chainId && chainId !== '0x2105' && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-black text-sm font-bold">!</span>
              </div>
              <div>
                <p className="text-yellow-200 font-semibold">Network Warning</p>
                <p className="text-yellow-300 text-sm">
                  You're not on Base Mainnet. Current: {chainId} (Expected: 0x2105)
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}