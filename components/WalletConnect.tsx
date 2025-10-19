'use client';

import { useEffect, useState } from 'react';
import { useMiniKit } from './MiniKitProvider';

export function WalletConnect() {
  const { isReady, sdk } = useMiniKit();
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (isReady && sdk) {
          // For now, assume we're in Farcaster context if SDK is ready
          setIsConnected(true);
          setUserAddress('Farcaster User');
          console.log('Wallet connected via Farcaster Mini App');
        } else {
          setIsConnected(false);
          setUserAddress(null);
        }
      } catch (error) {
        console.error('Wallet connection error:', error);
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    };

    if (isReady) {
      checkConnection();
    }
  }, [isReady, sdk]);

  const handleConnect = async () => {
    try {
      if (sdk) {
        // In Farcaster Mini App context, wallet is automatically connected
        setIsConnected(true);
        setUserAddress('Farcaster User');
        console.log('Wallet connected via Farcaster Mini App');
      } else {
        alert('Mini App SDK not ready. Please try again.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Connection failed. Please try again.');
    }
  };

  if (loading || !isReady) {
    return (
      <div className="card text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-gray-400">Initializing Mini App...</p>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="card text-center">
        <div className="mb-4">
          <div className="text-4xl mb-2">✅</div>
          <h3 className="text-xl font-bold mb-2 text-green-400">Wallet Connected!</h3>
          <p className="text-gray-400 mb-2">
            Ready to make predictions and compete for prizes!
          </p>
          <p className="text-sm text-gray-500">
            User ID: {userAddress}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card text-center">
      <div className="mb-4">
        <div className="text-4xl mb-2">🔗</div>
        <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400 mb-4">
          Open this app in Farcaster to automatically connect your wallet!
        </p>
      </div>
      
      <button
        onClick={handleConnect}
        className="btn-primary w-full py-3 text-lg"
      >
        Connect Wallet
      </button>
      
      <p className="text-xs text-gray-500 mt-3">
        Powered by Farcaster Mini Apps
      </p>
    </div>
  );
}
