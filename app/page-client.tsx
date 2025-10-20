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
    <div className="min-h-screen bg-dark-500">
      {/* Hero Section */}
      <section className="pt-8 pb-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-gold rounded-full text-black text-sm font-semibold mb-4 animate-fade-in">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          First Day FREE • $1 USDC After
        </div>
        
        <h1 className="text-3xl font-bold mb-2 animate-slide-up">
          Daily Football Predictions
        </h1>
        
        <p className="text-gray-400 text-lg animate-slide-up">
          Compete on accuracy. Build reputation. Win prizes.
        </p>
      </section>

      {/* Wallet Status - COMPACT VERSION */}
      <section className="mb-8">
        <WalletConnect />
      </section>

      {/* Today's Matches */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Today's Matches</h2>
            <p className="text-gray-400 text-sm">Select your predictions</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
            {matches.length}
          </div>
        </div>

        {/* KEEP existing loading/error/matches logic */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-surface rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-surface-light rounded mb-4"></div>
                <div className="h-8 bg-surface-light rounded mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-10 bg-surface-light rounded flex-1"></div>
                  <div className="h-10 bg-surface-light rounded flex-1"></div>
                  <div className="h-10 bg-surface-light rounded flex-1"></div>
                </div>
              </div>
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
      </section>

      {/* Chain Warning */}
      {chainId && chainId !== '0x2105' && (
        <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
          <p className="text-yellow-200 text-sm">
            ⚠️ Not on Base Mainnet! Current chain: {chainId} (Expected: 0x2105)
          </p>
        </div>
      )}
    </div>
  );
}
