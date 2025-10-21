'use client';

import { useEffect, useState } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { PredictionForm } from '@/components/PredictionForm';
import { useMiniKit } from '@/components/MiniKitProvider';
import { sdk } from '@farcaster/miniapp-sdk';
import { Match } from '@/lib/matches';

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
    <div className="min-h-screen">
      {/* DRAMATIC HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 rounded-full text-black text-sm font-bold mb-8 animate-pulse">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
            🚀 FIRST DAY FREE • $1 USDC After
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-white via-gold-500 to-white bg-clip-text text-transparent animate-fade-in">
            SEERSLEAGUE
          </h1>
          
          <p className="text-2xl md:text-3xl font-bold text-gray-300 mb-4 animate-slide-up">
            Daily Football Predictions
          </p>
          
          <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto animate-slide-up">
            Predict 5 matches daily. Compete on accuracy. Build reputation. Win prizes on Base.
          </p>

          {/* DRAMATIC STATS */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-12">
            <div className="text-center">
              <div className="text-3xl font-black text-gold-500">5</div>
              <div className="text-sm text-gray-400">Daily Matches</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-gold-500">$1</div>
              <div className="text-sm text-gray-400">Entry Fee</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-gold-500">100%</div>
              <div className="text-sm text-gray-400">On-Chain</div>
            </div>
          </div>
        </div>
      </section>

      {/* WALLET STATUS - DRAMATIC */}
      <section className="py-8 bg-gradient-to-r from-gray-900 to-black">
        <div className="max-w-5xl mx-auto px-4">
          <WalletConnect />
        </div>
      </section>

      {/* MATCHES SECTION - DRAMATIC */}
      <section className="py-12 bg-black">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
              Today's Featured Matches
            </h2>
            <p className="text-xl text-gray-400">Select your predictions and compete for prizes</p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-surface/50 rounded-full border border-gold-500/20">
              <span className="w-2 h-2 bg-gold-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-gold-500">{matches.length} matches available</span>
            </div>
          </div>

          {/* MATCH LIST */}
          {loading ? (
            <div className="space-y-6">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-64 bg-surface/30 rounded-3xl animate-pulse border border-white/5" />
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-6 mb-8">
                {matches.map((match) => (
                  <PredictionForm key={match.id} matches={[match]} />
                ))}
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-4">
              <p className="text-red-400 text-sm">Error: {error}</p>
              <p className="text-xs text-gray-400 mt-1">
                Check console for details
              </p>
            </div>
          )}
          
          {!loading && !error && matches.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No matches found</p>
            </div>
          )}

          {/* Chain Warning */}
          {chainId && chainId !== '0x2105' && (
            <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
              <p className="text-yellow-200 text-sm">
                ⚠️ Not on Base Mainnet! Current chain: {chainId} (Expected: 0x2105)
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}