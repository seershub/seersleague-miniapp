'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniKitContextType {
  isReady: boolean;
  sdk: typeof sdk | null;
}

const MiniKitContext = createContext<MiniKitContextType | undefined>(undefined);

export function MiniKitProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeMiniKit = async () => {
      try {
        await sdk.actions.ready();
        setIsReady(true);
        console.log('MiniKitProvider: SDK initialized and ready.');
      } catch (error) {
        console.error('MiniKitProvider: SDK initialization failed:', error);
      }
    };

    initializeMiniKit();
  }, []);

  return (
    <MiniKitContext.Provider value={{ isReady, sdk }}>
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
