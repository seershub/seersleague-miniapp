'use client';

import { useEffect, useState } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { useSDK } from '@coinbase/onchainkit';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const { sdk } = useSDK();
  
  // Check chain ID and fetch matches
  useEffect(() => {
    // Initialize Base SDK
    if (sdk) {
      sdk.actions.ready({ disableNativeGestures: true });
      console.log('Base SDK ready!');
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

    async function fetchMatches() {
      try {
        setLoading(true);
        console.log('Fetching matches...');
        
        const response = await fetch('/api/matches');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Matches received:', data);
        
        setMatches(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching matches:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchMatches();
  }, []);
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-blue-900 text-white p-4">
      <div className="container mx-auto max-w-2xl">
        
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">⚽ SeersLeague</h1>
          <p className="text-gray-300">Daily Football Predictions on Base</p>
          {chainId && chainId !== '0x2105' && (
            <div className="mt-4 p-3 bg-yellow-900 border border-yellow-600 rounded-lg">
              <p className="text-yellow-200 text-sm">
                ⚠️ Not on Base Mainnet! Current chain: {chainId} (Expected: 0x2105)
              </p>
            </div>
          )}
        </header>

        {/* Wallet Status */}
        <div className="mb-6 p-4 bg-blue-900/30 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">Mini App Mode</p>
            <WalletConnect />
          </div>
        </div>

        {/* Matches Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Today's Matches</h2>
          
          {loading && (
            <p className="text-center text-gray-400">Loading matches...</p>
          )}
          
          {error && (
            <div className="bg-red-900/30 border border-red-500 rounded p-4 mb-4">
              <p className="text-red-400">Error: {error}</p>
              <p className="text-sm text-gray-400 mt-2">
                Check console for details
              </p>
            </div>
          )}
          
          {!loading && !error && matches.length === 0 && (
            <p className="text-center text-gray-400">No matches found</p>
          )}
          
          {!loading && matches.length > 0 && (
            <div className="space-y-4">
              {matches.map((match) => (
                <div 
                  key={match.id} 
                  className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition"
                >
                  <div className="text-sm text-gray-400 mb-2">
                    {match.league}
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">{match.homeTeam}</span>
                    <span className="text-gray-400">vs</span>
                    <span className="font-semibold">{match.awayTeam}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(match.kickoff).toLocaleString()}
                  </div>
                  
                  {/* Prediction Buttons */}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <button className="bg-green-600 hover:bg-green-700 py-2 rounded text-sm">
                      Home
                    </button>
                    <button className="bg-yellow-600 hover:bg-yellow-700 py-2 rounded text-sm">
                      Draw
                    </button>
                    <button className="bg-red-600 hover:bg-red-700 py-2 rounded text-sm">
                      Away
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Debug Info */}
        <div className="mt-8 p-4 bg-gray-900 rounded text-xs">
          <p className="text-gray-400 mb-1">Debug Info:</p>
          <p>Matches: {matches.length}</p>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
          <p>Error: {error || 'None'}</p>
        </div>

      </div>
    </main>
  );
}
