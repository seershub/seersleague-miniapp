'use client';

import { useEffect, useState } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { PredictionForm } from '@/components/PredictionForm';
import { useMiniKit } from '@/components/MiniKitProvider';
import { sdk } from '@farcaster/miniapp-sdk';
import { Match } from '@/lib/matches';
import { useAccount } from 'wagmi';
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
  const { address, isConnected } = useAccount();
  
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
    <div className="container mx-auto px-4 py-6 pb-24">
      
      {/* COMPACT WALLET STATUS */}
      {isConnected && address ? (
        <div className="mb-6 flex items-center justify-between px-5 py-4 rounded-2xl bg-zinc-900/50 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-400 font-mono tracking-wider">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-xl font-black text-gold-500">68%</div>
              <div className="text-xs text-gray-500 mt-0.5">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black">🔥 7</div>
              <div className="text-xs text-gray-500 mt-0.5">Streak</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-gold-500">#42</div>
              <div className="text-xs text-gray-500 mt-0.5">Rank</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-10 bg-zinc-900/30 rounded-3xl p-10 border border-white/10 text-center">
          <div className="w-20 h-20 bg-gold-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-gold-500/20">
            <Wallet className="w-10 h-10 text-gold-500" />
          </div>
          <h3 className="text-2xl font-black mb-3">Connect to Start</h3>
          <p className="text-gray-400 mb-6">First 5 predictions FREE</p>
          <button className="px-10 py-4 bg-gold-gradient rounded-2xl font-black text-black text-lg hover:shadow-gold-glow transition-all transform hover:scale-105">
            Connect Wallet
          </button>
        </div>
      )}

      {/* MATCHES SECTION */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Today's Matches
            </h2>
            <p className="text-gray-500">Make your predictions</p>
          </div>
          <div className="px-5 py-2.5 rounded-xl bg-zinc-900/50 border border-white/10">
            <span className="text-gold-500 font-bold text-lg">{matches.length}</span>
            <span className="text-gray-500 text-sm ml-2">matches</span>
          </div>
        </div>
      </div>

      {/* MATCH LIST */}
      {loading ? (
        <div className="space-y-6">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-64 bg-zinc-900/30 rounded-3xl animate-pulse border border-white/5" />
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
  );
}