'use client';

import { useConnect, useAccount } from 'wagmi';

export function WalletConnect() {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  const handleConnect = () => {
    try {
      // Use the first available connector (usually injected wallet)
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  if (isConnected) {
    return null;
  }

  return (
    <div className="card text-center">
      <div className="mb-4">
        <div className="text-4xl mb-2">🔗</div>
        <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400 mb-4">
          Connect your wallet to start making predictions and compete for prizes!
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
