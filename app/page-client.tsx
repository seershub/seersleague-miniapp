'use client';

import { useEffect, useState } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { PredictionForm } from '@/components/PredictionForm';
import { SearchBox } from '@/components/SearchBox';
import { useMiniKit } from '@/components/MiniKitProvider';
import { sdk } from '@farcaster/miniapp-sdk';
import { Match } from '@/lib/matches';
import { Wallet } from 'lucide-react';

interface HomeProps {
  initialMatches?: Match[];
}

export default function Home({ initialMatches = [] }: HomeProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>(initialMatches);
  const [loading, setLoading] = useState(initialMatches.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
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
    const fetchMatches = async (isBackgroundRefresh = false) => {
      try {
        const isInitial = matches.length === 0 && initialMatches.length === 0;
        if (isInitial) {
          setLoading(true);
        } else if (!isBackgroundRefresh) {
          setRefreshing(true);
        }
        console.log('Fetching matches...');
        const response = await fetch(`/api/matches?limit=50&t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Matches API response:', data);

        // Extract matches array from response object
        const matchesArray: Match[] = data.matches || [];
        console.log('Matches received:', matchesArray);
        
        // Only update if there are actual changes to avoid unnecessary re-renders
        setMatches(prevMatches => {
          if (JSON.stringify(prevMatches) !== JSON.stringify(matchesArray)) {
            return matchesArray;
          }
          return prevMatches;
        });

        setFilteredMatches(matchesArray);

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

    // Poll every 5 minutes to keep list updated (less frequent for better UX)
    const interval = setInterval(() => fetchMatches(true), 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black">
        <div className="max-w-4xl mx-auto px-4 py-8">
          
          {/* WALLET STATUS - MINIMAL */}
          <section className="mb-8">
            <WalletConnect />
          </section>

          {/* PREMIUM FLEXIBLE PREDICTIONS INFO */}
          <section className="mb-8">
            <div className="glass-card p-6 border border-gold-500/20">
              <div className="flex flex-col space-y-3">
                {/* Title Row */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center">
                    <span className="text-xl">🎯</span>
                  </div>
                  <span className="text-xl font-bold text-white">Flexible Predictions</span>
                </div>

                {/* Description */}
                <p className="text-sm md:text-base text-white/70 leading-relaxed">
                  Select any matches you want to predict.
                  <span className="block mt-2">
                    <span className="text-accent-success font-bold">First 5 predictions are FREE</span>, then <span className="gold-text font-bold">0.5 USDC</span> per match.
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* PREMIUM MATCHES SECTION */}
        <section className="mb-8">
          <div className="text-center mb-8">
              {/* Live Badge */}
              <div className="inline-flex items-center gap-2 glass-effect px-4 py-2.5 rounded-full mb-6 border border-accent-info/20">
                <div className="w-3 h-3 bg-accent-info rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-accent-info uppercase tracking-wide">Live Competitions</span>
              </div>

              {/* Hero Title */}
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-white tracking-tight">
                <span className="gold-text">Today's</span> Matches
              </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
              Join live prediction competitions. Make your picks, compete with others, win USDC rewards instantly.
            </p>

            {/* SEARCH SECTION */}
            <div className="max-w-2xl mx-auto mb-8">
              <SearchBox
                matches={matches}
                onSearchResults={setFilteredMatches}
              />
            </div>
          </div>

          {/* MATCHES GRID */}
          {loading ? (
            <div className="grid gap-4 sm:gap-6 max-w-4xl mx-auto">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-48 glass-card skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 max-w-4xl mx-auto">
              {(showAll ? filteredMatches : filteredMatches.slice(0, 5)).map((match) => (
                <PredictionForm key={match.id} matches={[match]} />
              ))}

              {filteredMatches.length > 5 && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="btn-primary hover:scale-105 transition-transform duration-300"
                  >
                    {showAll ? 'Show Less' : `Show All ${filteredMatches.length} Matches`}
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="glass-card border-accent-error/30 p-6 mb-4">
              <p className="text-accent-error font-bold">⚠️ Error: {error}</p>
              <p className="text-white/60 text-sm mt-2">
                Please check your connection and try again
              </p>
            </div>
          )}

          {!loading && !error && filteredMatches.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 glass-card rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚽</span>
              </div>
              <p className="text-white/60 text-lg font-semibold">No matches found</p>
              <p className="text-white/40 text-sm mt-2">Try adjusting your search or check back later</p>
            </div>
          )}
        </section>

        {/* CHAIN WARNING */}
        {chainId && chainId !== '0x2105' && (
          <div className="glass-card border-accent-warning/30 p-6 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent-warning rounded-full flex items-center justify-center">
                <span className="text-black text-lg font-bold">!</span>
              </div>
              <div>
                <p className="text-accent-warning font-bold">⚠️ Network Warning</p>
                <p className="text-white/60 text-sm mt-1">
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