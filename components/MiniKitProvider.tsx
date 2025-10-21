'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniKitContextType {
  isReady: boolean;
  sdk: typeof sdk | null;
  error: string | null;
}

const MiniKitContext = createContext<MiniKitContextType | undefined>(undefined);

export function MiniKitProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeMiniKit = async () => {
      try {
        console.log('MiniKitProvider: Starting SDK initialization...');
        
        // Check if we're in a mini app environment
        const isInMiniApp = await sdk.isInMiniApp();
        console.log('MiniKitProvider: Is in mini app:', isInMiniApp);
        
        if (!isInMiniApp) {
          console.log('MiniKitProvider: Not in mini app environment, but continuing...');
        }
        
        // Initialize SDK with proper error handling
        await sdk.actions.ready();
        
        // Additional verification
        const context = await sdk.context;
        console.log('MiniKitProvider: SDK context:', context);
        
        setIsReady(true);
        setError(null);
        console.log('MiniKitProvider: SDK initialized and ready.');
      } catch (error: any) {
        console.error('MiniKitProvider: SDK initialization failed:', error);
        setError(error.message || 'SDK initialization failed');
        
        // Still set as ready for fallback behavior
        setIsReady(true);
      }
    };

    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(initializeMiniKit, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <MiniKitContext.Provider value={{ isReady, sdk, error }}>
      {children}
    </MiniKitContext.Provider>
  );
}

export function useMiniKit() {
  const context = useContext(MiniKitContext);
  if (context === undefined) {
    throw new Error('useMiniKit must be used within a MiniKitProvider');
  }
  return context;
}
