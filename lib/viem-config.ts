import { createPublicClient, http, fallback } from 'viem';
import { base } from 'viem/chains';

// Multiple RPC endpoints for better reliability and rate limit handling
const baseRpcUrls = [
  process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org',
  'https://base-mainnet.g.alchemy.com/v2/demo', // Alchemy backup
  'https://base-mainnet.public.blastapi.io', // Blast API backup
  'https://base.blockpi.network/v1/rpc/public', // BlockPI backup
];

export const baseRpcUrl = baseRpcUrls[0];

export const publicClient = createPublicClient({
  chain: base,
  transport: fallback(
    baseRpcUrls.map(url => http(url, {
      retryCount: 3,
      retryDelay: 1000,
      timeout: 10000,
    })),
    {
      rank: false, // Try all endpoints
      retryCount: 2,
    }
  ),
});

export const chainId = '0x2105'; // Base Mainnet
export const chainName = 'Base';
