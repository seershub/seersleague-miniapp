import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address') || '0x2f8b89f74c0540b638cf808515dfabe565796aaa';
    
    console.log(`Debug user predictions for: ${userAddress}`);
    
    // Get contract deployment block
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();
    
    // Fetch PredictionsSubmitted events for this user
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
      fromBlock: deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n,
      toBlock: 'latest',
      args: {
        user: userAddress as `0x${string}`
      }
    });

    console.log(`Found ${predictionEvents.length} prediction events for user`);

    // Get user's individual predictions from events
    const userPredictions = [];
    console.log('Raw prediction events:', JSON.stringify(predictionEvents, null, 2));
    
    for (const event of predictionEvents) {
      if (event.args) {
        console.log('Event args:', event.args);
        
        // Try different ways to get matchIds
        let matchIds = [];
        if (event.args.matchIds && Array.isArray(event.args.matchIds)) {
          matchIds = event.args.matchIds;
        } else if (event.args.matchId) {
          matchIds = [event.args.matchId];
        }
        
        const predictionsCount = Number(event.args.predictionsCount || 0);
        const freeUsed = Number(event.args.freeUsed || 0);
        const feePaid = Number(event.args.feePaid || 0);
        
        console.log(`Event: ${matchIds.length} matches, ${predictionsCount} predictions, free: ${freeUsed}, fee: ${feePaid}`);
        console.log('Match IDs:', matchIds);
        
        // For now, just show the match IDs from events
        for (const matchId of matchIds) {
          userPredictions.push({
            matchId: matchId.toString(),
            outcome: 'Unknown', // We'll need to get this differently
            timestamp: 'Unknown',
            outcomeText: 'Unknown'
          });
        }
      }
    }

    // Get user stats
    const userStats = await publicClient.readContract({
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

    // Get match results for these matches
    const matchResults = [];
    for (const prediction of userPredictions) {
      try {
        const matchResult = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getMatch',
          args: [BigInt(prediction.matchId)]
        }) as unknown as {
          result: bigint;
          recordedAt: bigint;
        };
        
        if (matchResult && matchResult.result > 0n) {
          const actualResult = Number(matchResult.result);
          
          matchResults.push({
            matchId: prediction.matchId,
            predicted: 'Unknown',
            actual: actualResult,
            isCorrect: null,
            predictedText: 'Unknown',
            actualText: actualResult === 1 ? 'Home Win' : 
                       actualResult === 2 ? 'Away Win' : 'Draw',
            recordedAt: Number(matchResult.recordedAt)
          });
        } else {
          matchResults.push({
            matchId: prediction.matchId,
            predicted: 'Unknown',
            actual: null,
            isCorrect: null,
            predictedText: 'Unknown',
            actualText: 'Not recorded yet',
            recordedAt: null
          });
        }
      } catch (error) {
        console.error(`Error fetching result for match ${prediction.matchId}:`, error);
        matchResults.push({
          matchId: prediction.matchId,
          predicted: 'Unknown',
          actual: null,
          isCorrect: null,
          predictedText: 'Unknown',
          actualText: 'Error fetching result',
          recordedAt: null
        });
      }
    }

    const correctCount = matchResults.filter(r => r.isCorrect === true).length;
    const totalWithResults = matchResults.filter(r => r.actual !== null).length;
    const accuracy = totalWithResults > 0 ? Math.round((correctCount / totalWithResults) * 100) : 0;

    return NextResponse.json({
      success: true,
      userAddress,
      userStats: {
        correctPredictions: Number(userStats.correctPredictions || 0),
        totalPredictions: Number(userStats.totalPredictions || 0),
        freePredictionsUsed: Number(userStats.freePredictionsUsed || 0),
        currentStreak: Number(userStats.currentStreak || 0),
        longestStreak: Number(userStats.longestStreak || 0)
      },
      predictions: userPredictions,
      matchResults,
      analysis: {
        totalPredictions: userPredictions.length,
        totalWithResults: totalWithResults,
        correctPredictions: correctCount,
        accuracy: accuracy,
        pendingResults: matchResults.filter(r => r.actual === null).length
      },
      debug: {
        eventsCount: predictionEvents.length,
        contractAddress: CONTRACTS.SEERSLEAGUE,
        currentBlock: currentBlock.toString()
      }
    });

  } catch (error) {
    console.error('Debug user predictions error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to debug user predictions', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
