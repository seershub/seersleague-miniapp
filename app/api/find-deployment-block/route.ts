import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { CONTRACTS } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://api.developer.coinbase.com/rpc/v1/base/DzCv9JnMZKpreOiukHveGNUBbW7NBYUa';

/**
 * Find contract deployment block using binary search
 */
async function findDeploymentBlock(publicClient: any, contractAddress: string): Promise<bigint> {
  console.log(`Finding deployment block for ${contractAddress}...`);

  const currentBlock = await publicClient.getBlockNumber();

  // Base mainnet launch was around block 0, but let's search from a reasonable starting point
  // Base mainnet launched in August 2023, so we can search from block 1
  let low = 1n;
  let high = currentBlock;
  let deploymentBlock = currentBlock;

  // Binary search to find the first block where contract has code
  while (low <= high) {
    const mid = (low + high) / 2n;

    try {
      const code = await publicClient.getBytecode({
        address: contractAddress as `0x${string}`,
        blockNumber: mid
      });

      if (code && code !== '0x' && code.length > 2) {
        // Contract exists at this block, search lower
        deploymentBlock = mid;
        high = mid - 1n;
      } else {
        // Contract doesn't exist yet, search higher
        low = mid + 1n;
      }
    } catch (error) {
      // If error, try searching higher
      low = mid + 1n;
    }

    // Progress indicator
    if ((high - low) % 100000n === 0n) {
      console.log(`Searching... Range: ${low} - ${high}`);
    }
  }

  console.log(`Found deployment block: ${deploymentBlock}`);
  return deploymentBlock;
}

/**
 * Alternative method: Find first MatchRegistered event
 * This is faster but less accurate (gives first usage, not deployment)
 */
async function findFirstEventBlock(publicClient: any): Promise<bigint | null> {
  try {
    console.log('Searching for first MatchRegistered event...');

    const currentBlock = await publicClient.getBlockNumber();

    // Search in chunks backwards from current block
    const chunkSize = 10000n;
    let searchBlock = currentBlock;
    let oldestEvent: bigint | null = null;

    for (let i = 0; i < 10; i++) {
      const fromBlock = searchBlock - chunkSize < 0n ? 0n : searchBlock - chunkSize;

      console.log(`Searching blocks ${fromBlock} - ${searchBlock}...`);

      const events = await publicClient.getLogs({
        address: CONTRACTS.SEERSLEAGUE,
        event: {
          type: 'event',
          name: 'MatchRegistered',
          inputs: [
            { name: 'matchId', type: 'uint256', indexed: true },
            { name: 'startTime', type: 'uint256', indexed: false }
          ]
        },
        fromBlock,
        toBlock: searchBlock
      });

      if (events.length > 0) {
        oldestEvent = events[0].blockNumber || null;
        console.log(`Found ${events.length} events, oldest at block ${oldestEvent}`);
      }

      if (events.length === 0 && oldestEvent !== null) {
        // No more events found, we've gone far enough
        break;
      }

      searchBlock = fromBlock - 1n;
      if (searchBlock < 0n) break;
    }

    return oldestEvent;
  } catch (error) {
    console.error('Error finding first event:', error);
    return null;
  }
}

/**
 * GET endpoint to find contract deployment block
 */
export async function GET() {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL)
    });

    const currentBlock = await publicClient.getBlockNumber();
    const contractAddress = CONTRACTS.SEERSLEAGUE;

    console.log(`Current block: ${currentBlock}`);
    console.log(`Contract address: ${contractAddress}`);

    // Method 1: Find first event (faster)
    const firstEventBlock = await findFirstEventBlock(publicClient);

    // Method 2: Check if contract has code at various recent blocks
    const blocksToCheck = [
      currentBlock - 10000n,
      currentBlock - 50000n,
      currentBlock - 100000n,
      currentBlock - 500000n,
      currentBlock - 1000000n,
    ];

    const codeChecks: { block: string; hasCode: boolean }[] = [];

    for (const block of blocksToCheck) {
      if (block < 0n) continue;

      try {
        const code = await publicClient.getBytecode({
          address: contractAddress,
          blockNumber: block
        });

        codeChecks.push({
          block: block.toString(),
          hasCode: !!(code && code !== '0x' && code.length > 2)
        });
      } catch (error) {
        codeChecks.push({
          block: block.toString(),
          hasCode: false
        });
      }
    }

    // Estimate deployment block
    let estimatedDeploymentBlock = firstEventBlock || currentBlock - 100000n;

    return NextResponse.json({
      success: true,
      contractAddress,
      currentBlock: currentBlock.toString(),
      estimatedDeploymentBlock: estimatedDeploymentBlock.toString(),
      firstEventBlock: firstEventBlock?.toString() || 'Not found',
      codeChecks,
      recommendation: {
        message: 'Set this value as NEXT_PUBLIC_DEPLOYMENT_BLOCK in Vercel',
        command: `vercel env add NEXT_PUBLIC_DEPLOYMENT_BLOCK ${estimatedDeploymentBlock.toString()} production`
      },
      note: 'This is an estimate. The actual deployment block might be earlier.'
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
