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
    <div className="min-h-screen bg-[#04000A]">
      <div className="max-w-screen-sm mx-auto px-6 py-8">
        
        {/* HERO SECTION */}
        <section className="text-center mb-8">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full text-black text-sm font-bold mb-6 shadow-lg shadow-yellow-500/30">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>First 5 Predictions FREE</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
            Today's Matches
          </h1>
          <p className="text-[#A8A8A8] text-lg max-w-2xl mx-auto">
            Make your predictions and compete for accuracy. Build your reputation in the community.
          </p>
        </section>

        {/* WALLET STATUS */}
        <section className="mb-8">
          <WalletConnect />
        </section>

        {/* MATCHES SECTION */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Featured Matches</h2>
              <p className="text-[#A8A8A8]">Select your predictions</p>
            </div>
            <div className="px-4 py-2 bg-[#1B1A1A] rounded-xl border border-[#252525] shadow-lg">
              <span className="text-yellow-400 font-bold text-lg">{matches.length}</span>
              <span className="text-[#A8A8A8] text-sm ml-2">matches</span>
            </div>
          </div>

          {/* MATCHES GRID */}
          {loading ? (
            <div className="space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-48 bg-[#1B1A1A] rounded-2xl animate-pulse border border-[#252525]" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <PredictionForm key={match.id} matches={[match]} />
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 mb-4">
              <p className="text-red-400 font-semibold">Error: {error}</p>
              <p className="text-[#A8A8A8] text-sm mt-2">
                Please check your connection and try again
              </p>
            </div>
          )}
          
          {!loading && !error && matches.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-[#1B1A1A] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚽</span>
              </div>
              <p className="text-[#A8A8A8] text-lg">No matches available today</p>
              <p className="text-[#8F8F8F] text-sm mt-2">Check back later for new matches</p>
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