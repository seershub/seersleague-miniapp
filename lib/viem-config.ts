import { createPublicClient, http, fallback } from 'viem';
import { base } from 'viem/chains';

// Priority 1: Alchemy (fastest, most reliable) - ALWAYS FIRST if available
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const alchemyUrl = alchemyKey
  ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : null;

// Priority 2: Custom RPC (only if different from mainnet.base.org and Alchemy not available)
const customRpc = process.env.NEXT_PUBLIC_BASE_RPC;
const useCustomRpc = customRpc && customRpc !== 'https://mainnet.base.org' && !alchemyUrl
  ? customRpc
  : null;

// Priority 3: Public RPC (fallback, can be slow)
const publicRpc = 'https://mainnet.base.org';

// Build RPC list with priority order - Alchemy ALWAYS first
const rpcUrls = [
  alchemyUrl,        // Priority 1
  useCustomRpc,      // Priority 2 (only if not mainnet.base.org)
  publicRpc          // Priority 3 (fallback)
].filter(Boolean) as string[];

console.log('[RPC Config] Using RPC endpoints:', {
  primary: rpcUrls[0],
  primaryType: alchemyUrl ? 'Alchemy' : useCustomRpc ? 'Custom' : 'Public',
  fallbacks: rpcUrls.slice(1),
  alchemyConfigured: !!alchemyKey,
  customRpcConfigured: !!useCustomRpc
});

// Export for use in other files
export const baseRpcUrl = rpcUrls[0];

// Create client with fallback support
export const publicClient = createPublicClient({
  chain: base,
  transport: rpcUrls.length > 1
    ? fallback(
        rpcUrls.map(url => http(url, {
          timeout: 180000, // 3 minutes for large queries
          retryCount: 3,
          retryDelay: 1000,
        }))
      )
    : http(rpcUrls[0], {
        timeout: 180000,
        retryCount: 5,
        retryDelay: 2000,
      }),
});

export const chainId = '0x2105'; // Base Mainnet
export const chainName = 'Base';
