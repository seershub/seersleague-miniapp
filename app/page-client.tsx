'use client';

import { useEffect, useState, useRef } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { PredictionForm } from '@/components/PredictionForm';
import { SearchBox } from '@/components/SearchBox';
import { useMiniKit } from '@/components/MiniKitProvider';
import { sdk } from '@farcaster/miniapp-sdk';
import { Match } from '@/lib/matches';
import { Sparkles, Zap } from 'lucide-react';

interface HomeProps {
  initialMatches?: Match[];
}

export default function Home({ initialMatches = [] }: HomeProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { isReady } = useMiniKit();
  const lastFetchTimeRef = useRef<number>(Date.now());

  // SDK Initialization
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        await sdk.actions.ready();
        console.log('✅ Farcaster MiniApp SDK ready!');
      } catch (error) {
        console.error('❌ SDK initialization error:', error);
      }
    };

    initializeSDK();

    if (isReady) {
      console.log('✅ MiniKit ready!');
      if (typeof window !== 'undefined' && (window as any).base) {
        console.log('✅ Base SDK ready!');
      }
    }
  }, [isReady]);

  // Chain ID Check
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_chainId' })
        .then((id: string) => {
          setChainId(id);
          console.log('Current chain ID:', id);
          if (id !== '0x2105') {
            console.warn('⚠️ Not on Base Mainnet! Current:', id, 'Expected: 0x2105');
          }
        })
        .catch(console.error);
    }
  }, []);

  // Matches Fetch
  useEffect(() => {
    console.log(`\n=== [CLIENT] Component Mounted ===`);
    console.log(`[CLIENT] initialMatches received: ${initialMatches.length}`);
    if (initialMatches.length > 0) {
      console.log(`[CLIENT] Sample match IDs:`, initialMatches.slice(0, 3).map(m => m.id));
    }

    if (initialMatches.length > 0) {
      console.log(`✅ [CLIENT] Using ${initialMatches.length} SSR matches (STABLE)`);
      lastFetchTimeRef.current = Date.now();

      // Background enrichment
      console.log(`[CLIENT] Background: Enriching with team names from API...`);
      fetch('/api/matches?limit=50', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.matches && Array.isArray(data.matches) && data.matches.length > 0) {
            console.log(`✅ [CLIENT] API returned ${data.matches.length} enriched matches`);

            const enrichedMap = new Map<string, Match>();
            data.matches.forEach((match: Match) => {
              enrichedMap.set(match.id, match);
            });

            const mergedMatches = initialMatches.map(ssrMatch => {
              const enrichedMatch = enrichedMap.get(ssrMatch.id);
              if (enrichedMatch) {
                console.log(`[CLIENT] ✓ Enriched: ${enrichedMatch.homeTeam} vs ${enrichedMatch.awayTeam}`);
                return enrichedMatch;
              } else {
                console.log(`[CLIENT] ○ Keeping SSR data for match ${ssrMatch.id}`);
                return ssrMatch;
              }
            });

            console.log(`✅ [CLIENT] Merged ${mergedMatches.length} matches`);
            setMatches(mergedMatches);
          }
        })
        .catch(err => {
          console.warn('[CLIENT] Background enrichment failed:', err);
        });

      return;
    }

    console.log('⚠️ [CLIENT] No SSR matches - fetching from API...');
    setLoading(true);

    fetch('/api/matches?limit=50', { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const matchesArray: Match[] = data.matches || [];
        console.log(`✅ Fetched ${matchesArray.length} matches`);
        setMatches(matchesArray);
        setError(null);
        lastFetchTimeRef.current = Date.now();
      })
      .catch(err => {
        console.error('❌ Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Wallet Status */}
        <section className="mb-6 animate-fade-up">
          <WalletConnect />
        </section>

        {/* Flexible Predictions Info */}
        <section className="mb-8 animate-fade-up-delay-1">
          <div className="glass-card p-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[rgba(245,158,11,0.2)] to-[rgba(245,158,11,0.05)] flex items-center justify-center border border-[rgba(245,158,11,0.2)]">
                <Sparkles className="w-5 h-5 text-[rgb(var(--brand-gold))]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white mb-1">Flexible Predictions</h3>
                <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">
                  Select any matches you want to predict.{' '}
                  <span className="text-[rgb(var(--brand-green))] font-medium">First 5 free</span>, then{' '}
                  <span className="text-[rgb(var(--brand-gold))] font-medium">0.5 USDC</span> per match.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Matches Section */}
        <section className="mb-8 animate-fade-up-delay-2">
          {/* Section Header */}
          <div className="text-center mb-8">
            <div className="badge-gold mb-4 inline-flex">
              <div className="w-2 h-2 rounded-full bg-[rgb(var(--brand-gold))] animate-pulse" />
              <span>Live Competitions</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-white">
              <span className="gradient-gold-text">Today's</span> Matches
            </h2>
            <p className="text-[rgb(var(--text-secondary))] text-sm max-w-md mx-auto">
              Make predictions, compete with others, win USDC rewards on-chain.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-8">
            <SearchBox
              matches={matches}
              onSearchResults={setFilteredMatches}
            />
          </div>

          {/* Matches Grid */}
          {loading ? (
            <div className="grid gap-4 max-w-4xl mx-auto">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="h-52 rounded-2xl animate-pulse"
                  style={{
                    background: 'linear-gradient(145deg, rgba(24,24,30,0.6) 0%, rgba(17,17,21,0.8) 100%)',
                    border: '1px solid rgba(55,55,65,0.3)'
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 max-w-4xl mx-auto">
              {(showAll ? filteredMatches : filteredMatches.slice(0, 5)).map((match, index) => (
                <div
                  key={match.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <PredictionForm matches={[match]} />
                </div>
              ))}

              {filteredMatches.length > 5 && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="btn-secondary"
                  >
                    {showAll ? 'Show Less' : `Show All ${filteredMatches.length} Matches`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="glass-card p-6 border-[rgba(239,68,68,0.3)]">
              <p className="text-[rgb(var(--brand-red))] font-medium mb-1">Error: {error}</p>
              <p className="text-[rgb(var(--text-muted))] text-sm">
                Please check your connection and try again.
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredMatches.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[rgba(24,24,30,0.8)] border border-[rgba(55,55,65,0.5)] flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-[rgb(var(--text-muted))]" />
              </div>
              <p className="text-white font-medium mb-1">No matches found</p>
              <p className="text-[rgb(var(--text-muted))] text-sm">Try adjusting your search or check back later</p>
            </div>
          )}
        </section>

        {/* Chain Warning */}
        {chainId && chainId !== '0x2105' && (
          <div className="glass-card p-4 border-[rgba(245,158,11,0.3)] animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[rgba(245,158,11,0.15)] flex items-center justify-center">
                <span className="text-[rgb(var(--brand-gold))] text-sm font-bold">!</span>
              </div>
              <div>
                <p className="text-[rgb(var(--brand-gold))] font-medium text-sm">Network Warning</p>
                <p className="text-[rgb(var(--text-muted))] text-xs">
                  Not on Base Mainnet. Current: {chainId}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}