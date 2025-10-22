import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * ULTRA DETAILED DEBUG - See what's taking so long!
 */
export async function GET() {
  const startTime = Date.now();
  const logs: string[] = [];

  try {
    // Step 1: Check RPC
    logs.push(`[${Date.now() - startTime}ms] Starting RPC check...`);
    const currentBlock = await publicClient.getBlockNumber();
    logs.push(`[${Date.now() - startTime}ms] ✅ Current block: ${currentBlock}`);

    // Step 2: Check deployment block
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    logs.push(`[${Date.now() - startTime}ms] Deployment block: ${deploymentBlock}`);

    const blockDiff = currentBlock - deploymentBlock;
    logs.push(`[${Date.now() - startTime}ms] Block range: ${blockDiff} blocks`);

    if (blockDiff > 1000000n) {
      logs.push(`[${Date.now() - startTime}ms] ⚠️ WARNING: Scanning ${blockDiff} blocks! This will be VERY slow!`);
    }

    // Step 3: Try to fetch events (with timer)
    logs.push(`[${Date.now() - startTime}ms] Fetching PredictionsSubmitted events...`);
    const eventsStart = Date.now();

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

    const eventsTime = Date.now() - eventsStart;
    logs.push(`[${Date.now() - startTime}ms] ✅ Found ${events.length} events in ${eventsTime}ms`);

    // Step 4: Extract unique users
    const uniqueUsers = new Set<string>();
    events.forEach(event => {
      if (event.args && event.args.user) {
        uniqueUsers.add(event.args.user.toLowerCase());
      }
    });
    logs.push(`[${Date.now() - startTime}ms] ✅ Unique users: ${uniqueUsers.size}`);

    // Step 5: Test fetching ONE user's stats
    if (uniqueUsers.size > 0) {
      logs.push(`[${Date.now() - startTime}ms] Testing getUserStats for 1 user...`);
      const testUser = Array.from(uniqueUsers)[0];
      const statsStart = Date.now();

      await publicClient.readContract({
        address: CONTRACTS.SEERSLEAGUE,
        abi: [{
          "inputs": [{"internalType": "address","name": "user","type": "address"}],
          "name": "getUserStats",
          "outputs": [
            {"internalType": "uint256","name": "correctPredictions","type": "uint256"},
            {"internalType": "uint256","name": "totalPredictions","type": "uint256"},
            {"internalType": "uint256","name": "freePredictionsUsed","type": "uint256"},
            {"internalType": "uint256","name": "currentStreak","type": "uint256"},
            {"internalType": "uint256","name": "longestStreak","type": "uint256"}
          ],
          "stateMutability": "view",
          "type": "function"
        }],
        functionName: 'getUserStats',
        args: [testUser as `0x${string}`]
      });

      const statsTime = Date.now() - statsStart;
      logs.push(`[${Date.now() - startTime}ms] ✅ getUserStats took ${statsTime}ms`);

      // Estimate total time
      const estimatedTotal = statsTime * uniqueUsers.size;
      logs.push(`[${Date.now() - startTime}ms] Estimated total for all users: ${estimatedTotal}ms (${(estimatedTotal/1000).toFixed(1)}s)`);
    }

    logs.push(`[${Date.now() - startTime}ms] Total time: ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      totalTime: `${Date.now() - startTime}ms`,
      logs,
      analysis: {
        currentBlock: currentBlock.toString(),
        deploymentBlock: deploymentBlock.toString(),
        blockRange: blockDiff.toString(),
        blockRangeTooLarge: blockDiff > 1000000n,
        eventCount: events.length,
        uniqueUsers: uniqueUsers.size,
        problem: blockDiff > 1000000n
          ? 'Block range is TOO LARGE! Scanning millions of blocks!'
          : blockDiff > 100000n
          ? 'Block range is large. May be slow on public RPC.'
          : 'Block range is reasonable. Problem might be elsewhere.'
      }
    });

  } catch (error) {
    logs.push(`[${Date.now() - startTime}ms] ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown'}`);

    return NextResponse.json({
      success: false,
      totalTime: `${Date.now() - startTime}ms`,
      logs,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
