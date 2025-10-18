'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface MiniKitContextType {
  isReady: boolean;
  user?: any;
  wallet?: any;
}

const MiniKitContext = createContext<MiniKitContextType>({
  isReady: false,
});

export const useMiniKit = () => useContext(MiniKitContext);

export function MiniKitProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    // Check if we're in Base App context
    if (typeof window !== 'undefined') {
      // Simulate MiniKit initialization
      setTimeout(() => {
        setIsReady(true);
        console.log('MiniKit Provider initialized');
        
        // Check for Base App context
        if ((window as any).base) {
          console.log('Base App context detected');
        }
      }, 100);
    }
  }, []);

  return (
    <MiniKitContext.Provider value={{ isReady, user, wallet }}>
      {children}
    </MiniKitContext.Provider>
  );
}
