import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { CONTRACTS, SEERSLEAGUE_ABI } from '../lib/contract-interactions';

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';
const USER_ADDRESS = '0x2f8b89f74c0540b638cf808515dfabe565796aaa';

async function checkUserPredictions() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_URL)
  });

  console.log(`Checking predictions for: ${USER_ADDRESS}\n`);

  // Get current block
  const currentBlock = await publicClient.getBlockNumber();
  const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');

  console.log(`Current block: ${currentBlock}`);
  console.log(`Deployment block: ${deploymentBlock}\n`);

  // Fetch PredictionsSubmitted events for this user
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
    args: {
      user: USER_ADDRESS as `0x${string}`
    },
    fromBlock: deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n,
    toBlock: 'latest'
  });

  console.log(`Found ${events.length} prediction submission events\n`);

  // Collect all unique match IDs
  const allMatchIds = new Set<string>();

  for (const event of events) {
    if (event.args?.matchIds) {
      const matchIds = event.args.matchIds as bigint[];
      matchIds.forEach(id => allMatchIds.add(id.toString()));
    }
  }

  console.log(`User predicted on ${allMatchIds.size} unique matches\n`);
  console.log('Match IDs:', Array.from(allMatchIds).join(', '), '\n');

  // Check each match
  for (const matchIdStr of allMatchIds) {
    const matchId = BigInt(matchIdStr);

    console.log(`\n=== Match ${matchId} ===`);

    // Get match info from contract
    const matchInfo = await publicClient.readContract({
      address: CONTRACTS.SEERSLEAGUE,
      abi: SEERSLEAGUE_ABI,
      functionName: 'getMatch',
      args: [matchId]
    }) as { id: bigint; startTime: bigint; homeScore: bigint; awayScore: bigint; isRecorded: boolean; exists: boolean };

    const startTime = new Date(Number(matchInfo.startTime) * 1000);
    console.log(`Start time: ${startTime.toISOString()}`);
    console.log(`Exists: ${matchInfo.exists}`);
    console.log(`Is recorded: ${matchInfo.isRecorded}`);

    if (matchInfo.isRecorded) {
      console.log(`Score: ${matchInfo.homeScore}-${matchInfo.awayScore}`);
    }

    // Get user's prediction
    const prediction = await publicClient.readContract({
      address: CONTRACTS.SEERSLEAGUE,
      abi: SEERSLEAGUE_ABI,
      functionName: 'getUserPrediction',
      args: [USER_ADDRESS as `0x${string}`, matchId]
    }) as { matchId: bigint; outcome: number; timestamp: bigint };

    const outcomeStr = prediction.outcome === 1 ? 'HOME WIN' :
                       prediction.outcome === 2 ? 'DRAW' :
                       prediction.outcome === 3 ? 'AWAY WIN' : 'NONE';

    console.log(`User prediction: ${outcomeStr} (${prediction.outcome})`);
    console.log(`Prediction time: ${new Date(Number(prediction.timestamp) * 1000).toISOString()}`);
  }

  // Get user stats
  console.log('\n\n=== USER STATS ===');
  const stats = await publicClient.readContract({
    address: CONTRACTS.SEERSLEAGUE,
    abi: SEERSLEAGUE_ABI,
    functionName: 'getUserStats',
    args: [USER_ADDRESS as `0x${string}`]
  }) as {
    correctPredictions: bigint;
    totalPredictions: bigint;
    freePredictionsUsed: bigint;
    currentStreak: bigint;
    longestStreak: bigint;
  };

  console.log(`Total predictions: ${stats.totalPredictions}`);
  console.log(`Correct predictions: ${stats.correctPredictions}`);
  console.log(`Accuracy: ${stats.totalPredictions > 0n ? Math.round(Number(stats.correctPredictions * 100n / stats.totalPredictions)) : 0}%`);
  console.log(`Current streak: ${stats.currentStreak}`);
  console.log(`Longest streak: ${stats.longestStreak}`);
  console.log(`Free predictions used: ${stats.freePredictionsUsed}`);
}

checkUserPredictions().catch(console.error);
