import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();

    // Get all prediction events
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
      fromBlock: deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n,
      toBlock: 'latest'
    });

    console.log(`Found ${events.length} prediction events`);

    // Extract unique users
    const uniqueUsers = new Set<string>();
    events.forEach(event => {
      if (event.args && event.args.user) {
        uniqueUsers.add(event.args.user.toLowerCase());
      }
    });

    console.log(`Found ${uniqueUsers.size} unique users`);

    // Analyze each user
    const userAnalysis = [];

    for (const userAddress of uniqueUsers) {
      try {
        const stats = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getUserStats',
          args: [userAddress as `0x${string}`]
        }) as unknown as {
          correctPredictions: bigint;
          totalPredictions: bigint;
          freePredictionsUsed: bigint;
          currentStreak: bigint;
          longestStreak: bigint;
        };

        const freePredictionsUsed = Number(stats.freePredictionsUsed || 0);
        const totalPredictions = Number(stats.totalPredictions || 0);

        // Get all transactions for this user
        const userEvents = events.filter(e =>
          e.args?.user?.toLowerCase() === userAddress
        );

        const transactions = userEvents.map(e => ({
          txHash: e.transactionHash,
          blockNumber: e.blockNumber.toString(),
          matchCount: Array.isArray(e.args?.matchIds) ? e.args.matchIds.length : 0,
          freeUsed: Number(e.args?.freeUsed || 0),
          feePaid: e.args?.feePaid ? (Number(e.args.feePaid) / 1e6).toFixed(2) : '0'
        }));

        userAnalysis.push({
          address: userAddress,
          totalPredictions,
          freePredictionsUsed,
          paidPredictions: totalPredictions - freePredictionsUsed,
          hasBug: freePredictionsUsed > 5, // BUG if more than 5 free predictions
          transactions
        });
      } catch (error) {
        console.error(`Error fetching stats for ${userAddress}:`, error);
      }
    }

    // Sort by freePredictionsUsed descending
    userAnalysis.sort((a, b) => b.freePredictionsUsed - a.freePredictionsUsed);

    // Find users with bug
    const usersWithBug = userAnalysis.filter(u => u.hasBug);

    return NextResponse.json({
      summary: {
        totalUsers: userAnalysis.length,
        usersWithBug: usersWithBug.length,
        maxFreeUsed: Math.max(...userAnalysis.map(u => u.freePredictionsUsed), 0)
      },
      usersWithBug,
      allUsers: userAnalysis
    });

  } catch (error) {
    console.error('Error in check-free-predictions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
