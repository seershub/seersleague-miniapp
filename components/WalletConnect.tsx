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
          // Check if we have access to wallet provider
          if (sdk.wallet && sdk.wallet.ethProvider) {
            try {
              const accounts = await sdk.wallet.ethProvider.request({ 
                method: 'eth_accounts' 
              });
              if (accounts && accounts.length > 0) {
                setIsConnected(true);
                setUserAddress(accounts[0]);
                console.log('Wallet connected:', accounts[0]);
              } else {
                setIsConnected(false);
                setUserAddress(null);
              }
            } catch (error) {
              console.log('No wallet connection found');
              setIsConnected(false);
              setUserAddress(null);
            }
          } else {
            setIsConnected(false);
            setUserAddress(null);
          }
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
      if (sdk && sdk.wallet && sdk.wallet.ethProvider) {
        // Request account access
        const accounts = await sdk.wallet.ethProvider.request({ 
          method: 'eth_requestAccounts' 
        });
        if (accounts && accounts.length > 0) {
          setIsConnected(true);
          setUserAddress(accounts[0]);
          console.log('Wallet connected:', accounts[0]);
        }
      } else {
        alert('Wallet provider not available. Please open in Base App.');
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
      <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 rounded-xl p-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Wallet Connected</p>
              <p className="text-xs text-yellow-300 font-mono">
                {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Connected'}
              </p>
            </div>
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
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
          Connect your wallet to start making predictions and competing for prizes!
        </p>
      </div>
      
      <button
        onClick={handleConnect}
        className="btn-primary w-full py-3 text-lg"
      >
        Connect Wallet
      </button>
      
      <p className="text-xs text-gray-500 mt-3">
        Powered by Base & Farcaster Mini Apps
      </p>
    </div>
  );
}
