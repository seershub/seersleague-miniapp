import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Use ONLY Alchemy for reliability
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

if (!alchemyKey) {
  throw new Error('NEXT_PUBLIC_ALCHEMY_API_KEY is required!');
}

const alchemyUrl = `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`;

export const baseRpcUrl = alchemyUrl;

export const publicClient = createPublicClient({
  chain: base,
  transport: http(alchemyUrl, {
    timeout: 180000, // 3 minutes - enough for large getLogs() queries
    retryCount: 5,
    retryDelay: 2000,
  }),
});

export const chainId = '0x2105'; // Base Mainnet
export const chainName = 'Base';
