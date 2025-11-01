import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Sample avatars for demo
const SAMPLE_AVATARS = [
  'https://www.seershub.com/avatar/b35e3ae275ce74427ca3e8690d55b945.png',
  'https://www.seershub.com/avatar/0a16668c89dfc9920789891b2c13891c.png',
  'https://www.seershub.com/avatar/79e0ce7f58179293cc2dc4f061e4444a.png'
];

/**
 * GET /api/vault/activity
 * Returns recent prediction submissions (real + mock for UI demo)
 */
export async function GET() {
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - 50000n; // Last ~12 hours on Base

    console.log(`[Activity] Scanning blocks ${fromBlock} to ${currentBlock}`);

    // Fetch recent PredictionSubmitted events
    const events = await publicClient.getLogs({
      address: CONTRACTS.SEERSLEAGUE,
      event: {
        type: 'event',
        name: 'PredictionSubmitted',
        inputs: [
          { name: 'user', type: 'address', indexed: true },
          { name: 'matchId', type: 'uint256', indexed: true },
          { name: 'prediction', type: 'uint8', indexed: false }
        ]
      },
      fromBlock,
      toBlock: 'latest'
    });

    console.log(`[Activity] Found ${events.length} recent predictions`);

    // Transform events to activity items
    const recentActivity = events
      .slice(-20) // Last 20
      .reverse() // Most recent first
      .map((event, idx) => {
        const userAddress = event.args?.user || '0x0';

        // Mask address for privacy (show last 4 chars)
        const maskedAddress = `****${userAddress.slice(-4)}`;

        return {
          id: `${event.transactionHash}-${idx}`,
          user: {
            address: userAddress.toString(),
            maskedAddress,
            ensName: idx % 3 === 0 ? `${maskedAddress}.base.eth` : null,
            avatar: SAMPLE_AVATARS[idx % SAMPLE_AVATARS.length]
          },
          action: 'Submitted prediction',
          amount: '0.5 USDC',
          timestamp: new Date().getTime() - (idx * 30000), // Stagger times
          txHash: event.transactionHash
        };
      });

    return NextResponse.json({
      success: true,
      activity: recentActivity,
      total: events.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Activity] Error fetching activity:', error);

    // Return mock data for demo if blockchain fetch fails
    const mockActivity = Array.from({ length: 10 }, (_, i) => ({
      id: `mock-${i}`,
      user: {
        address: `0x${Math.random().toString(16).slice(2, 42)}`,
        maskedAddress: `****${Math.random().toString(16).slice(2, 6)}`,
        ensName: i % 3 === 0 ? `****${Math.random().toString(16).slice(2, 6)}.base.eth` : null,
        avatar: SAMPLE_AVATARS[i % SAMPLE_AVATARS.length]
      },
      action: 'Submitted prediction',
      amount: '0.5 USDC',
      timestamp: Date.now() - (i * 45000),
      txHash: `0x${Math.random().toString(16).slice(2)}`
    }));

    return NextResponse.json({
      success: true,
      activity: mockActivity,
      total: mockActivity.length,
      mock: true,
      timestamp: new Date().toISOString()
    });
  }
}
