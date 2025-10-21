'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface FarcasterUser {
  fid: number;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
}

interface MiniKitContextType {
  isReady: boolean;
  sdk: typeof sdk | null;
  error: string | null;
  user: FarcasterUser | null;
}

const MiniKitContext = createContext<MiniKitContextType | undefined>(undefined);

export function MiniKitProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<FarcasterUser | null>(null);

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
        
        // Get Farcaster user context
        const context = await sdk.context;
        console.log('MiniKitProvider: SDK context:', context);
        
        // Extract user information from context
        if (context?.user) {
          const farcasterUser: FarcasterUser = {
            fid: context.user.fid || 0,
            username: context.user.username || null,
            displayName: context.user.displayName || null,
            pfpUrl: context.user.pfpUrl || null
          };
          setUser(farcasterUser);
          console.log('MiniKitProvider: Farcaster user loaded:', farcasterUser);
        }
        
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
    <MiniKitContext.Provider value={{ isReady, sdk, error, user }}>
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
