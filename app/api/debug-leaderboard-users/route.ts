import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Debug endpoint to see why total users is wrong
 * Shows exactly what's happening with event fetching
 */
export async function GET() {
  try {
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();

    console.log(`[Debug] Deployment block from env: ${deploymentBlock}`);
    console.log(`[Debug] Current block: ${currentBlock}`);

    const results: any = {
      deploymentBlockSet: deploymentBlock > 0n,
      deploymentBlock: deploymentBlock.toString(),
      currentBlock: currentBlock.toString(),
      blockRange: deploymentBlock > 0n ? (currentBlock - deploymentBlock).toString() : 'Using fallback',
      attempts: [],
      finalResult: null
    };

    // Try to fetch PredictionSubmitted events
    const maxRetries = 3;
    let success = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const attemptResult: any = {
        attempt,
        startTime: new Date().toISOString(),
        success: false,
        error: null,
        eventCount: 0,
        uniqueUsers: 0,
        duration: 0
      };

      try {
        const startMs = Date.now();

        const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 1000000n;

        const predictionEvents = await publicClient.getLogs({
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
          fromBlock,
          toBlock: 'latest'
        });

        const uniqueUsers = new Set<string>();
        predictionEvents.forEach(event => {
          if (event.args && event.args.user) {
            uniqueUsers.add(event.args.user.toLowerCase());
          }
        });

        attemptResult.success = true;
        attemptResult.eventCount = predictionEvents.length;
        attemptResult.uniqueUsers = uniqueUsers.size;
        attemptResult.duration = Date.now() - startMs;
        attemptResult.sampleUsers = Array.from(uniqueUsers).slice(0, 5);

        results.attempts.push(attemptResult);
        results.finalResult = {
          totalEvents: predictionEvents.length,
          totalUniqueUsers: uniqueUsers.size,
          message: uniqueUsers.size < 48
            ? `⚠️ Only found ${uniqueUsers.size} users. Expected ~48. RPC might be timing out or truncating results.`
            : `✅ Found all ${uniqueUsers.size} users`
        };

        success = true;
        break;

      } catch (error) {
        attemptResult.success = false;
        attemptResult.error = error instanceof Error ? error.message : String(error);
        attemptResult.duration = Date.now() - Date.now();
        results.attempts.push(attemptResult);

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    if (!success) {
      results.finalResult = {
        error: '❌ All attempts failed. RPC connection issue or timeout.',
        recommendation: 'Check Vercel logs for detailed error messages'
      };
    }

    return NextResponse.json(results);

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
