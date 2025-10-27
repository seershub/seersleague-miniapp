import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://api.developer.coinbase.com/rpc/v1/base/DzCv9JnMZKpreOiukHveGNUBbW7NBYUa';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address');

    if (!userAddress) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL)
    });

    // Get current block
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');

    // Fetch PredictionsSubmitted events for this user
    const events = await publicClient.getLogs({
      address: CONTRACTS.SEERSLEAGUE,
      event: {
        type: 'event',
        name: 'PredictionsSubmitted',
        inputs: [
          { name: 'user', type: 'address', indexed: true },
          { name: 'matchIds', type: 'uint256[]', indexed: false },
          { name: 'predictionsCount', type: 'uint256', indexed: false },
          { name: 'freeUsed', type: 'uint256', indexed: false },
          { name: 'feePaid', type: 'uint256', indexed: false }
        ]
      },
      args: {
        user: userAddress as `0x${string}`
      },
      fromBlock: deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n,
      toBlock: 'latest'
    });

    // Collect all unique match IDs
    const allMatchIds = new Set<string>();

    for (const event of events) {
      if (event.args?.matchIds) {
        const matchIds = event.args.matchIds as bigint[];
        matchIds.forEach(id => allMatchIds.add(id.toString()));
      }
    }

    // Check each match
    const matches = [];

    for (const matchIdStr of allMatchIds) {
      const matchId = BigInt(matchIdStr);

      // Get match info from contract
      const matchInfo = await publicClient.readContract({
        address: CONTRACTS.SEERSLEAGUE,
        abi: SEERSLEAGUE_ABI,
        functionName: 'getMatch',
        args: [matchId]
      }) as { id: bigint; startTime: bigint; homeScore: bigint; awayScore: bigint; isRecorded: boolean; exists: boolean };

      // Get user's prediction
      const prediction = await publicClient.readContract({
        address: CONTRACTS.SEERSLEAGUE,
        abi: SEERSLEAGUE_ABI,
        functionName: 'getUserPrediction',
        args: [userAddress as `0x${string}`, matchId]
      }) as { matchId: bigint; outcome: number; timestamp: bigint };

      const outcomeStr = prediction.outcome === 1 ? 'HOME' :
                         prediction.outcome === 2 ? 'DRAW' :
                         prediction.outcome === 3 ? 'AWAY' : 'NONE';

      matches.push({
        matchId: matchIdStr,
        startTime: new Date(Number(matchInfo.startTime) * 1000).toISOString(),
        exists: matchInfo.exists,
        isRecorded: matchInfo.isRecorded,
        score: matchInfo.isRecorded ? `${matchInfo.homeScore}-${matchInfo.awayScore}` : 'Not recorded',
        userPrediction: outcomeStr,
        predictionValue: prediction.outcome,
        predictionTime: new Date(Number(prediction.timestamp) * 1000).toISOString()
      });
    }

    // Get user stats
    const stats = await publicClient.readContract({
      address: CONTRACTS.SEERSLEAGUE,
      abi: SEERSLEAGUE_ABI,
      functionName: 'getUserStats',
      args: [userAddress as `0x${string}`]
    }) as {
      correctPredictions: bigint;
      totalPredictions: bigint;
      freePredictionsUsed: bigint;
      currentStreak: bigint;
      longestStreak: bigint;
    };

    const accuracy = Number(stats.totalPredictions) > 0
      ? Math.round(Number(stats.correctPredictions * 100n / stats.totalPredictions))
      : 0;

    return NextResponse.json({
      userAddress,
      totalEvents: events.length,
      uniqueMatches: allMatchIds.size,
      matches,
      stats: {
        totalPredictions: Number(stats.totalPredictions),
        correctPredictions: Number(stats.correctPredictions),
        accuracy: `${accuracy}%`,
        currentStreak: Number(stats.currentStreak),
        longestStreak: Number(stats.longestStreak),
        freePredictionsUsed: Number(stats.freePredictionsUsed)
      },
      blockInfo: {
        current: currentBlock.toString(),
        deployment: deploymentBlock.toString()
      }
    });

  } catch (error) {
    console.error('Debug user error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
