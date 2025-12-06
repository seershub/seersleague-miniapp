'use client';

import { useEffect, useState } from 'react';
import { useMiniKit } from './MiniKitProvider';
import { Wallet, Check, Loader2, Link2 } from 'lucide-react';

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
      <div className="glass-card p-4">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 text-[rgb(var(--brand-gold))] animate-spin" />
          <span className="text-[rgb(var(--text-muted))] text-sm">
            {!isReady ? 'Initializing...' : 'Loading...'}
          </span>
        </div>
        {error && (
          <p className="text-[rgb(var(--brand-red))] text-xs text-center mt-2">
            SDK Error: {error}
          </p>
        )}
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="glass-card p-3 border-[rgba(34,197,94,0.15)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(34,197,94,0.15)] flex items-center justify-center border border-[rgba(34,197,94,0.2)]">
              <Check className="w-4 h-4 text-[rgb(var(--brand-green))]" strokeWidth={3} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Wallet Connected</p>
              <p className="text-xs text-[rgb(var(--text-muted))] font-mono">
                {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Connected'}
              </p>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-[rgb(var(--brand-green))] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.15)] flex items-center justify-center mx-auto mb-4">
        <Link2 className="w-6 h-6 text-[rgb(var(--brand-cyan))]" />
      </div>

      <h3 className="text-lg font-semibold text-white mb-1">Connect Your Wallet</h3>
      <p className="text-[rgb(var(--text-muted))] text-sm mb-4">
        Connect to start making predictions and win USDC
      </p>

      <button
        onClick={handleConnect}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>

      <p className="text-xs text-[rgb(var(--text-muted))] mt-3">
        Powered by Base & Farcaster
      </p>
    </div>
  );
}
