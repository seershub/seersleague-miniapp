'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export function WalletConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if we're in Base App context
        if (typeof window !== 'undefined' && (window as any).base) {
          // In Base App, wallet is automatically connected
          setIsConnected(true);
          setUserAddress('Base App User');
          console.log('Wallet connected via Base App');
        } else {
          // Not in Base App context
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

    checkConnection();
  }, []);

  const handleConnect = async () => {
    try {
      // In Base App context, wallet is already connected
      if (typeof window !== 'undefined' && (window as any).base) {
        setIsConnected(true);
        setUserAddress('Base App User');
        console.log('Wallet connected via Base App');
      } else {
        alert('Please open this app in Base App to connect your wallet!');
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Connection failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="card text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-gray-400">Checking wallet connection...</p>
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
            {userAddress}
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
          Open this app in Base App to automatically connect your wallet!
        </p>
      </div>
      
      <button
        onClick={handleConnect}
        className="btn-primary w-full py-3 text-lg"
      >
        Connect Wallet
      </button>
      
      <p className="text-xs text-gray-500 mt-3">
        Powered by Farcaster & Base
      </p>
    </div>
  );
}
