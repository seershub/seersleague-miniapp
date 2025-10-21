'use client';

import { useEffect, useState } from 'react';
import { useMiniKit } from './MiniKitProvider';

export function WalletConnect() {
  const { isReady, sdk, error } = useMiniKit();
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log('WalletConnect: Checking connection...', { isReady, sdk: !!sdk, error });
        
        if (isReady && sdk) {
          // Check if we have access to wallet provider
          if (sdk.wallet && sdk.wallet.ethProvider) {
            try {
              console.log('WalletConnect: Requesting accounts...');
              const accounts = await sdk.wallet.ethProvider.request({ 
                method: 'eth_accounts' 
              });
              console.log('WalletConnect: Accounts received:', accounts);
              
              if (accounts && accounts.length > 0) {
                setIsConnected(true);
                setUserAddress(accounts[0]);
                console.log('Wallet connected:', accounts[0]);
              } else {
                setIsConnected(false);
                setUserAddress(null);
                console.log('No accounts found');
              }
            } catch (error) {
              console.log('No wallet connection found:', error);
              setIsConnected(false);
              setUserAddress(null);
            }
          } else {
            console.log('Wallet provider not available');
            setIsConnected(false);
            setUserAddress(null);
          }
        } else {
          console.log('SDK not ready or available');
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
      // Add a small delay to ensure wallet is ready
      const timer = setTimeout(checkConnection, 500);
      return () => clearTimeout(timer);
    }
  }, [isReady, sdk, error]);

  const handleConnect = async () => {
    try {
      console.log('WalletConnect: Attempting to connect...');
      setLoading(true);
      
      if (sdk && sdk.wallet && sdk.wallet.ethProvider) {
        console.log('WalletConnect: Requesting account access...');
        // Request account access
        const accounts = await sdk.wallet.ethProvider.request({ 
          method: 'eth_requestAccounts' 
        });
        console.log('WalletConnect: Connection response:', accounts);
        
        if (accounts && accounts.length > 0) {
          setIsConnected(true);
          setUserAddress(accounts[0]);
          console.log('Wallet connected successfully:', accounts[0]);
        } else {
          console.log('No accounts returned from wallet');
        }
      } else {
        console.log('Wallet provider not available');
        alert('Wallet provider not available. Please open in Base App or Farcaster.');
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      if (error.message?.includes('User rejected') || error.message?.includes('User denied')) {
        alert('Connection was rejected by user.');
      } else {
        alert('Connection failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isReady) {
    return (
      <div className="card text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-gray-400">
          {!isReady ? 'Initializing Mini App...' : 'Loading user data...'}
        </p>
        {error && (
          <p className="text-red-400 text-sm mt-2">
            SDK Error: {error}
          </p>
        )}
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
