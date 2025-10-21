import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';

interface MatchResult {
  matchId: string;
  homeScore: number;
  awayScore: number;
  result: number; // 1=Home Win, 2=Away Win, 3=Draw
  status: string;
}

interface PredictionValidation {
  matchId: string;
  predicted: number;
  actual: number;
  isCorrect: boolean;
  homeTeam: string;
  awayTeam: string;
  score: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address') || '0x2f8b89f74c0540b638cf808515dfabe565796aaa';
    
    console.log(`Validating predictions for: ${userAddress}`);
    
    // Get user's prediction events
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
      fromBlock: 'earliest',
      toBlock: 'latest',
      args: {
        user: userAddress as `0x${string}`
      }
    });

    console.log(`Found ${predictionEvents.length} prediction events`);

    // Extract all match IDs
    const allMatchIds = new Set<string>();
    for (const event of predictionEvents) {
      if (event.args?.matchIds) {
        for (const matchId of event.args.matchIds) {
          allMatchIds.add(matchId.toString());
        }
      }
    }

    console.log(`Found ${allMatchIds.size} unique match IDs:`, Array.from(allMatchIds));

    // For each match, get the actual result from Sports API
    const validations: PredictionValidation[] = [];
    
    for (const matchId of allMatchIds) {
      try {
        // Get match info from contract
        const matchInfo = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getMatch',
          args: [BigInt(matchId)]
        }) as unknown as {
          homeTeam: string;
          awayTeam: string;
          startTime: bigint;
          result: bigint;
          recordedAt: bigint;
        };

        const homeTeam = matchInfo.homeTeam;
        const awayTeam = matchInfo.awayTeam;
        const result = Number(matchInfo.result || 0);
        const recordedAt = Number(matchInfo.recordedAt || 0);

        console.log(`Match ${matchId}: ${homeTeam} vs ${awayTeam}, result: ${result}, recorded: ${recordedAt}`);

        if (result > 0) {
          // Result is recorded, we can validate
          // For now, we'll need to get the user's prediction
          // This is a simplified version - in reality we'd need to store predictions differently
          
          validations.push({
            matchId,
            predicted: 0, // We need to get this from somewhere
            actual: result,
            isCorrect: false, // We can't determine without the actual prediction
            homeTeam,
            awayTeam,
            score: result === 1 ? 'Home Win' : result === 2 ? 'Away Win' : 'Draw'
          });
        } else {
          // Result not recorded yet
          validations.push({
            matchId,
            predicted: 0,
            actual: 0,
            isCorrect: false,
            homeTeam,
            awayTeam,
            score: 'Not recorded yet'
          });
        }
      } catch (error) {
        console.error(`Error processing match ${matchId}:`, error);
        validations.push({
          matchId,
          predicted: 0,
          actual: 0,
          isCorrect: false,
          homeTeam: 'Unknown',
          awayTeam: 'Unknown',
          score: 'Error'
        });
      }
    }

    // Calculate statistics
    const totalMatches = validations.length;
    const recordedMatches = validations.filter(v => v.actual > 0).length;
    const pendingMatches = validations.filter(v => v.actual === 0).length;

    return NextResponse.json({
      success: true,
      userAddress,
      summary: {
        totalMatches,
        recordedMatches,
        pendingMatches,
        validationRate: recordedMatches > 0 ? Math.round((recordedMatches / totalMatches) * 100) : 0
      },
      validations,
      debug: {
        eventsCount: predictionEvents.length,
        uniqueMatchIds: allMatchIds.size,
        contractAddress: CONTRACTS.SEERSLEAGUE
      }
    });

  } catch (error) {
    console.error('Validate predictions error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to validate predictions', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
