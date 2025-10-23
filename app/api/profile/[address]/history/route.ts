import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel Pro max: 5 minutes for full history processing

interface PredictionHistoryEntry {
  matchId: number;
  matchName: string;
  userPrediction: number;
  actualResult: number | null;
  isCorrect: boolean | null;
  timestamp: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
}

interface MatchInfo {
  id: bigint;
  startTime: bigint;
  homeScore: bigint;
  awayScore: bigint;
  isRecorded: boolean;
  exists: boolean;
}

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address.toLowerCase() as `0x${string}`;

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    console.log(`[History] Fetching for ${address}`);

    // Get user stats first
    const stats = await publicClient.readContract({
      address: CONTRACTS.SEERSLEAGUE,
      abi: SEERSLEAGUE_ABI,
      functionName: 'getUserStats',
      args: [address]
    }) as unknown as {
      correctPredictions: bigint;
      totalPredictions: bigint;
      freePredictionsUsed: bigint;
      currentStreak: bigint;
      longestStreak: bigint;
    };

    const totalPredictions = Number(stats.totalPredictions);
    console.log(`[History] User has ${totalPredictions} total predictions`);

    if (totalPredictions === 0) {
      return NextResponse.json({
        history: [],
        cached: false,
        lastUpdated: new Date().toISOString()
      });
    }

    // FAST FETCH: Use deployment block or last 5K blocks
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 5000n;

    console.log(`[History] Fetching from block ${fromBlock} to ${currentBlock}`);

    // Single fetch - indexed user parameter makes this very fast
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
      args: { user: address }, // INDEXED parameter - very fast!
      fromBlock,
      toBlock: 'latest'
    });

    console.log(`[History] Found ${predictionEvents.length} prediction events`);

    // Build history with OPTIMIZED batch fetching
    const history: PredictionHistoryEntry[] = [];
    const processedMatches = new Set<string>(); // Avoid duplicates

    // Step 1: Collect all unique matches and blocks (dedup first)
    const matchesToFetch: Array<{ matchId: bigint; blockNumber: bigint }> = [];

    for (const event of predictionEvents) {
      if (!event.args || !event.args.matchIds) continue;
      const matchIds = event.args.matchIds as bigint[];

      for (const matchId of matchIds) {
        const matchIdStr = `${matchId}-${event.blockNumber}`;
        if (!processedMatches.has(matchIdStr)) {
          processedMatches.add(matchIdStr);
          matchesToFetch.push({ matchId, blockNumber: event.blockNumber });
        }
      }
    }

    console.log(`[History] Processing ${matchesToFetch.length} unique matches`);

    // Step 2: Fetch blocks in parallel (batch)
    const uniqueBlocks = [...new Set(matchesToFetch.map(m => m.blockNumber))];
    const blockPromises = uniqueBlocks.map(blockNumber =>
      publicClient.getBlock({ blockNumber }).catch(() => null)
    );
    const blocks = await Promise.all(blockPromises);
    const blockMap = new Map<bigint, typeof blocks[0]>();
    uniqueBlocks.forEach((blockNumber, idx) => {
      if (blocks[idx]) blockMap.set(blockNumber, blocks[idx]);
    });

    // Step 3: Fetch all match data in parallel (contract + football-data API)
    const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
    const matchDataPromises = matchesToFetch.map(async ({ matchId, blockNumber }) => {
      try {
        // Parallel fetch for each match: contract data + API data
        const [userPredictionResult, matchInfoResult, apiData] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.SEERSLEAGUE,
            abi: SEERSLEAGUE_ABI,
            functionName: 'getUserPrediction',
            args: [address, matchId]
          }),
          publicClient.readContract({
            address: CONTRACTS.SEERSLEAGUE,
            abi: SEERSLEAGUE_ABI,
            functionName: 'getMatch',
            args: [matchId]
          }),
          // Fetch team names from football-data API (same format as matches endpoint)
          fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
            headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
            next: { revalidate: 3600 } // Cache 1 hour
          }).then(async r => {
            if (!r.ok) {
              console.log(`[History] Match ${matchId} not in API (${r.status})`);
              return null;
            }
            const json = await r.json();
            return json.match || json; // Handle both formats
          }).catch(err => {
            console.error(`[History] API error for match ${matchId}:`, err.message);
            return null;
          })
        ]);

        // CRITICAL FIX: getUserPrediction returns a STRUCT, not a number!
        // struct Prediction { uint256 matchId; uint8 outcome; uint256 timestamp; }
        const userPrediction = userPredictionResult as unknown as {
          matchId: bigint;
          outcome: bigint;
          timestamp: bigint;
        };
        const matchInfo = matchInfoResult as unknown as MatchInfo;

        const predictionNum = Number(userPrediction.outcome); // Get outcome from struct!

        console.log(`[History] Match ${matchId} - userPrediction.outcome: ${predictionNum}`);

        // Calculate outcome from scores (1=Home Win, 2=Draw, 3=Away Win)
        let outcomeNum: number | null = null;
        if (matchInfo.isRecorded) {
          const homeScore = Number(matchInfo.homeScore);
          const awayScore = Number(matchInfo.awayScore);
          if (homeScore > awayScore) {
            outcomeNum = 1;
          } else if (homeScore === awayScore) {
            outcomeNum = 2;
          } else {
            outcomeNum = 3;
          }
        }

        // Determine correctness
        let isCorrect: boolean | null = null;
        if (matchInfo.isRecorded && predictionNum > 0 && outcomeNum !== null) {
          isCorrect = predictionNum === outcomeNum;
        }

        const block = blockMap.get(blockNumber);
        const timestamp = block ? Number(block.timestamp) : Math.floor(Date.now() / 1000);

        // Extract team names from API (same as matches endpoint)
        const homeTeam = apiData?.homeTeam?.name || apiData?.homeTeam?.shortName || apiData?.homeTeam || `Home Team`;
        const awayTeam = apiData?.awayTeam?.name || apiData?.awayTeam?.shortName || apiData?.awayTeam || `Away Team`;
        const league = apiData?.competition?.name || 'Football';

        console.log(`[History] Match ${matchId}: ${homeTeam} vs ${awayTeam} (API: ${apiData ? 'OK' : 'FALLBACK'})`);

        return {
          matchId: Number(matchId),
          matchName: `${homeTeam} vs ${awayTeam}`,
          homeTeam,
          awayTeam,
          league,
          userPrediction: predictionNum,
          actualResult: outcomeNum,
          isCorrect,
          timestamp
        };

      } catch (error) {
        console.error(`[History] Error fetching match ${matchId}:`, error);

        // CRITICAL FIX: Even on error, fetch userPrediction from contract!
        // Otherwise checkmarks won't show (userPrediction = 0)
        try {
          const userPredictionResult = await publicClient.readContract({
            address: CONTRACTS.SEERSLEAGUE,
            abi: SEERSLEAGUE_ABI,
            functionName: 'getUserPrediction',
            args: [address, matchId]
          });
          // CRITICAL FIX: getUserPrediction returns a STRUCT!
          const userPrediction = userPredictionResult as unknown as {
            matchId: bigint;
            outcome: bigint;
            timestamp: bigint;
          };
          const predictionNum = Number(userPrediction.outcome);

          const block = blockMap.get(blockNumber);
          return {
            matchId: Number(matchId),
            matchName: `Match #${matchId}`,
            homeTeam: 'Unknown',
            awayTeam: 'Unknown',
            league: 'Football',
            userPrediction: predictionNum, // Use real prediction!
            actualResult: null,
            isCorrect: null,
            timestamp: block ? Number(block.timestamp) : Math.floor(Date.now() / 1000)
          };
        } catch (innerError) {
          console.error(`[History] Failed to fetch userPrediction for match ${matchId}:`, innerError);

          const block = blockMap.get(blockNumber);
          return {
            matchId: Number(matchId),
            matchName: `Match #${matchId}`,
            homeTeam: 'Unknown',
            awayTeam: 'Unknown',
            league: 'Football',
            userPrediction: 0, // Last resort fallback
            actualResult: null,
            isCorrect: null,
            timestamp: block ? Number(block.timestamp) : Math.floor(Date.now() / 1000)
          };
        }
      }
    });

    // Wait for all match data to be fetched
    const allMatchData = await Promise.all(matchDataPromises);
    history.push(...allMatchData);

    // Sort by timestamp (newest first)
    history.sort((a, b) => b.timestamp - a.timestamp);

    console.log(`[History] Returning ${history.length} predictions`);

    return NextResponse.json({
      history: history.slice(0, 50), // Return last 50 predictions
      total: history.length,
      cached: false,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching prediction history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prediction history', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
