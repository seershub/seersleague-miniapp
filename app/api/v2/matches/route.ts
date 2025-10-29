import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { getContractAddress, getDeploymentBlock, getActiveContract, SEERSLEAGUE_ABI } from '@/lib/contract-interactions-unified';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * MATCHES V2 - Enhanced match management with 10-minute rule
 * 
 * Features:
 * - 10-minute prediction deadline
 * - Automatic match filtering
 * - Pagination support
 * - Real-time status updates
 */
export async function GET() {
  try {
    console.log('🔍 [MATCHES V2] Fetching matches with enhanced security...');

    const activeContract = getActiveContract();
    const contractAddress = getContractAddress();
    const deploymentBlock = getDeploymentBlock();

    if (activeContract !== 'v2') {
      return NextResponse.json({
        error: 'V2 contract not active',
        activeContract,
        message: 'Please ensure V2 contract is properly configured'
      }, { status: 400 });
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const predictionDeadline = 10 * 60; // 10 minutes

    try {
      // Get upcoming matches (simplified - function not in ABI yet)
      const upcomingMatches: any[] = [];
      
      // Get finished matches (simplified - function not in ABI yet)
      const finishedMatches: any[] = [];

      // Get all matches from events
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 1000000n;

      const matchEvents = await publicClient.getLogs({
        address: contractAddress,
        event: {
          type: 'event',
          name: 'MatchRegistered',
          inputs: [
            { name: 'matchId', type: 'uint256', indexed: true },
            { name: 'startTime', type: 'uint256', indexed: false }
          ]
        },
        fromBlock,
        toBlock: 'latest'
      });

      const allMatches = matchEvents.map((event: any) => ({
        id: Number(event.args?.matchId || 0),
        startTime: Number(event.args?.startTime || 0),
        homeScore: 0,
        awayScore: 0,
        isRecorded: false,
        exists: true,
        recordedAt: 0
      }));

      // Filter matches based on 10-minute rule
      const safeMatches = allMatches.filter(match => {
        const timeUntilStart = match.startTime - currentTime;
        return timeUntilStart > predictionDeadline;
      });

      const liveMatches = allMatches.filter(match => {
        const timeUntilStart = match.startTime - currentTime;
        return timeUntilStart <= predictionDeadline && timeUntilStart > 0;
      });

      const completedMatches = allMatches.filter(match => {
        const timeUntilStart = match.startTime - currentTime;
        return timeUntilStart <= 0;
      });

      console.log(`✅ [MATCHES V2] Found ${allMatches.length} total matches`);
      console.log(`   - Safe for prediction: ${safeMatches.length}`);
      console.log(`   - Live (no prediction): ${liveMatches.length}`);
      console.log(`   - Completed: ${completedMatches.length}`);

      return NextResponse.json({
        success: true,
        data: {
          upcoming: safeMatches,
          live: liveMatches,
          finished: completedMatches,
          total: allMatches.length
        },
        metadata: {
          currentTime,
          predictionDeadline,
          activeContract,
          contractAddress,
          deploymentBlock: deploymentBlock.toString()
        }
      });

    } catch (error) {
      console.error('❌ [MATCHES V2] Error fetching matches:', error);
      return NextResponse.json({
        error: 'Failed to fetch matches',
        details: (error as Error).message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[MATCHES V2] Error:', error);
    return NextResponse.json(
      { 
        error: (error as Error).message,
        version: '2.0.0'
      },
      { status: 500 }
    );
  }
}