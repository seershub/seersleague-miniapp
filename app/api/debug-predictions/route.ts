import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get finished matches from the last trigger
    const finishedMatches = [
      { matchId: '536883', outcome: 2 }, // DRAW
      { matchId: '551955', outcome: 1 }, // HOME
      { matchId: '536878', outcome: 3 }, // AWAY
      { matchId: '536879', outcome: 2 }, // DRAW
      { matchId: '536880', outcome: 1 }, // HOME
      { matchId: '536881', outcome: 1 }, // HOME
      { matchId: '536882', outcome: 2 }, // DRAW
      { matchId: '537863', outcome: 3 }, // AWAY
      { matchId: '542475', outcome: 1 }, // HOME
      { matchId: '540461', outcome: 2 }, // DRAW
      { matchId: '537864', outcome: 3 }, // AWAY
    ];

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

    console.log(`Total prediction events found: ${events.length}`);

    // Analyze each finished match
    const analysis = [];

    for (const match of finishedMatches) {
      const matchId = BigInt(match.matchId);
      const actualOutcome = match.outcome;

      // Find users who predicted this match
      const usersForMatch = new Set<string>();

      for (const event of events) {
        if (event.args?.matchIds && event.args?.user) {
          const matchIds = event.args.matchIds as bigint[];
          if (matchIds.some(id => id === matchId)) {
            usersForMatch.add(event.args.user.toLowerCase());
          }
        }
      }

      console.log(`Match ${match.matchId}: ${usersForMatch.size} users found`);

      // Check each user's prediction
      const predictions = [];
      for (const user of usersForMatch) {
        try {
          const prediction = await publicClient.readContract({
            address: CONTRACTS.SEERSLEAGUE,
            abi: SEERSLEAGUE_ABI,
            functionName: 'getUserPrediction',
            args: [user as `0x${string}`, matchId]
          }) as { matchId: bigint; outcome: number; timestamp: bigint };

          const isCorrect = prediction.outcome === actualOutcome;

          predictions.push({
            user: user,
            predicted: prediction.outcome,
            actual: actualOutcome,
            correct: isCorrect
          });
        } catch (error) {
          console.error(`Error reading prediction for ${user}:`, error);
        }
      }

      analysis.push({
        matchId: match.matchId,
        totalUsers: usersForMatch.size,
        predictions: predictions,
        correctCount: predictions.filter(p => p.correct).length,
        incorrectCount: predictions.filter(p => !p.correct).length
      });
    }

    // Summary
    const totalPredictions = analysis.reduce((sum, m) => sum + m.totalUsers, 0);
    const totalCorrect = analysis.reduce((sum, m) => sum + m.correctCount, 0);
    const totalIncorrect = analysis.reduce((sum, m) => sum + m.incorrectCount, 0);

    return NextResponse.json({
      summary: {
        totalMatches: finishedMatches.length,
        totalPredictions,
        totalCorrect,
        totalIncorrect,
        accuracyRate: totalPredictions > 0
          ? Math.round((totalCorrect / totalPredictions) * 100)
          : 0
      },
      matchAnalysis: analysis,
      note: 'This shows ALL predictions for finished matches, regardless of whether they were recorded on-chain'
    });

  } catch (error) {
    console.error('Error in debug-predictions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
