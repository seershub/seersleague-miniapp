import { createPublicClient, http, fallback } from 'viem';
import { base } from 'viem/chains';

// Priority 1: Alchemy (fastest, most reliable)
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const alchemyUrl = alchemyKey
  ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : null;

// Priority 2: Custom RPC (if user provides one)
const customRpc = process.env.NEXT_PUBLIC_BASE_RPC;

// Priority 3: Public RPC (fallback, can be slow)
const publicRpc = 'https://mainnet.base.org';

// Build RPC list with priority order
const rpcUrls = [
  alchemyUrl,
  customRpc,
  publicRpc
].filter(Boolean) as string[];

console.log('[RPC Config] Using RPC endpoints:', {
  primary: rpcUrls[0],
  fallbacks: rpcUrls.slice(1),
  alchemyConfigured: !!alchemyKey,
  customRpcConfigured: !!customRpc
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
