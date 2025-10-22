import { createPublicClient, http, fallback } from 'viem';
import { base } from 'viem/chains';

// RPC endpoints with Alchemy as primary (NEXT_PUBLIC_ vars are safe for client-side)
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const baseRpcUrls = [
  alchemyKey ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}` : null,
  process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org',
  'https://base-mainnet.public.blastapi.io',
  'https://base.blockpi.network/v1/rpc/public'
].filter((url): url is string => Boolean(url));

export const baseRpcUrl = baseRpcUrls[0];

export const publicClient = createPublicClient({
  chain: base,
  transport: fallback(
    baseRpcUrls.map(url => http(url, {
      retryCount: 3,
      retryDelay: 1000,
      timeout: 180000, // 3 minutes - enough for large getLogs() queries on 140K blocks
    })),
    {
      rank: false, // Try all endpoints
      retryCount: 2,
    }
  ),
});

export const chainId = '0x2105'; // Base Mainnet
export const chainName = 'Base';
