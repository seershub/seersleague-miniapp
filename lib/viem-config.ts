import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

export const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';

export const publicClient = createPublicClient({
  chain: base,
  transport: http(baseRpcUrl),
});

export const chainId = '0x2105'; // Base Mainnet
export const chainName = 'Base';
