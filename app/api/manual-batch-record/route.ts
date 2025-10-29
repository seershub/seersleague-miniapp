import { NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';
import { publicClient, baseRpcUrl } from '@/lib/viem-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * EMERGENCY: Manual batch record for specific match
 *
 * Usage:
 * POST /api/manual-batch-record
 * Body: {
 *   "matchId": "537886",
 *   "users": ["0x...", "0x..."],
 *   "corrects": [true, false]
 * }
 */
export async function POST(request: Request) {
  try {
    // Auth
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { matchId, users, corrects } = body;

    if (!matchId || !users || !corrects) {
      return NextResponse.json({
        error: 'Missing required fields: matchId, users, corrects'
      }, { status: 400 });
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: 'PRIVATE_KEY not configured' }, { status: 500 });
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(baseRpcUrl)
    });

    // Prepare data
    const matchIdBigInt = BigInt(matchId);
    const matchIds = users.map(() => matchIdBigInt);

    console.log(`Manual batch record:`, {
      matchId,
      userCount: users.length,
      correctCount: corrects.filter((c: boolean) => c).length
    });

    // Send transaction
    const txHash = await walletClient.writeContract({
      account,
      address: CONTRACTS.SEERSLEAGUE,
      abi: SEERSLEAGUE_ABI,
      functionName: 'batchRecordResults',
      args: [
        users as `0x${string}`[],
        matchIds,
        corrects
      ]
    });

    return NextResponse.json({
      success: true,
      matchId,
      usersRecorded: users.length,
      correctPredictions: corrects.filter((c: boolean) => c).length,
      incorrectPredictions: corrects.filter((c: boolean) => !c).length,
      txHash
    });

  } catch (error) {
    console.error('Manual batch record error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Manual Batch Record',
    description: 'Manually record results for specific match and users',
    method: 'POST',
    authentication: 'Bearer token required (CRON_SECRET)',
    body: {
      matchId: 'string (e.g., "537886")',
      users: 'string[] (wallet addresses)',
      corrects: 'boolean[] (true for correct prediction)'
    }
  });
}
