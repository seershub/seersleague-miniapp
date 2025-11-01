import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { formatUnits } from 'viem';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// USDC contract on Base Mainnet
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const VAULT_ADDRESS = '0x2cab9667c6e3ab9549c128c9f50f5103c627a575'; // seershub.base.eth

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

/**
 * GET /api/vault/balance
 * Returns USDC balance of the vault (seershub.base.eth)
 */
export async function GET() {
  try {
    console.log('[Vault] Fetching USDC balance for vault:', VAULT_ADDRESS);

    // Read USDC balance
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [VAULT_ADDRESS as `0x${string}`]
    });

    // USDC has 6 decimals
    const formattedBalance = formatUnits(balance, 6);
    const numericBalance = parseFloat(formattedBalance);

    console.log(`✅ Vault balance: ${formattedBalance} USDC`);

    return NextResponse.json({
      success: true,
      vault: {
        address: VAULT_ADDRESS,
        ensName: 'seershub.base.eth'
      },
      usdc: {
        balance: numericBalance,
        formatted: formattedBalance,
        raw: balance.toString(),
        decimals: 6,
        symbol: 'USDC',
        contractAddress: USDC_ADDRESS
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Vault] Error fetching balance:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch balance'
      },
      { status: 500 }
    );
  }
}
