import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';

interface UserProfileData {
  address: string;
  baseName: string | null;
  stats: {
    correctPredictions: number;
    totalPredictions: number;
    freePredictionsUsed: number;
    currentStreak: number;
    longestStreak: number;
    accuracy: number;
    remainingFreePredictions: number;
  };
}

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address as `0x${string}`;

    // Validate address format
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Fetch user stats from contract
    const stats = await publicClient.readContract({
      address: CONTRACTS.SEERSLEAGUE,
      abi: SEERSLEAGUE_ABI,
      functionName: 'getUserStats',
      args: [address]
    }) as unknown as {
      correctPredictions: bigint;
      totalPredictions: bigint;
      freePredictionsUsed: bigint;
      currentStreak: bigint;
      longestStreak: bigint;
    };

    const correctPredictions = Number(stats.correctPredictions || 0);
    const totalPredictions = Number(stats.totalPredictions || 0);
    const freePredictionsUsed = Number(stats.freePredictionsUsed || 0);
    const accuracy = totalPredictions > 0
      ? Math.round((correctPredictions / totalPredictions) * 100)
      : 0;
    const remainingFreePredictions = Math.max(0, 5 - freePredictionsUsed);

    // Try to fetch Base Name (ENS on Base)
    let baseName: string | null = null;
    try {
      baseName = await publicClient.getEnsName({ address });
    } catch (error) {
      console.log('No Base Name found for address:', address);
    }

    const profileData: UserProfileData = {
      address,
      baseName,
      stats: {
        correctPredictions,
        totalPredictions,
        freePredictionsUsed,
        currentStreak: Number(stats.currentStreak || 0),
        longestStreak: Number(stats.longestStreak || 0),
        accuracy,
        remainingFreePredictions
      }
    };

    return NextResponse.json(profileData);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}
