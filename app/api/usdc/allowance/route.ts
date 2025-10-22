import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, USDC_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/usdc/allowance?address=0x...
 * Returns USDC balance and allowance for user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address') as `0x${string}`;

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Fetch both balance and allowance in parallel
    const [balance, allowance] = await Promise.all([
      publicClient.readContract({
        address: CONTRACTS.USDC,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [address]
      }) as Promise<bigint>,
      publicClient.readContract({
        address: CONTRACTS.USDC,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [address, CONTRACTS.SEERSLEAGUE]
      }) as Promise<bigint>,
    ]);

    return NextResponse.json({
      balance: balance.toString(),
      allowance: allowance.toString()
    });

  } catch (error) {
    console.error('Error fetching USDC data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch USDC data' },
      { status: 500 }
    );
  }
}
