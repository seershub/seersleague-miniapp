import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

const COMPETITION_IDS = {
  PREMIER_LEAGUE: 'PL',
  LA_LIGA: 'PD',
  BUNDESLIGA: 'BL1',
  SERIE_A: 'SA',
  LIGUE_1: 'FL1',
  TURKISH_SUPER_LIG: 'TSL',
  CHAMPIONS_LEAGUE: 'CL',
  EUROPA_LEAGUE: 'EL',
  EREDIVISIE: 'DED',
  PRIMEIRA_LIGA: 'PPL',
};

interface MatchToRegister {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
}

/**
 * Fetch upcoming matches from Football-data.org for next N days
 */
async function fetchUpcomingMatches(days: number = 14): Promise<MatchToRegister[]> {
  const allMatches: MatchToRegister[] = [];

  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + days);

  const dateFrom = today.toISOString().split('T')[0];
  const dateTo = endDate.toISOString().split('T')[0];

  console.log(`Fetching matches from ${dateFrom} to ${dateTo}`);

  for (const [compName, compId] of Object.entries(COMPETITION_IDS)) {
    try {
      const url = `${FOOTBALL_DATA_BASE}/competitions/${compId}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`;

      console.log(`Fetching ${compName}...`);

      const response = await fetch(url, {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
        cache: 'no-store'
      });

      if (!response.ok) {
        console.error(`Failed to fetch ${compName}: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.matches && Array.isArray(data.matches)) {
        const matches = data.matches
          .filter((m: any) => m.status === 'SCHEDULED' || m.status === 'TIMED')
          .map((match: any) => ({
            id: match.id.toString(),
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            league: match.competition.name,
            kickoff: match.utcDate
          }));

        allMatches.push(...matches);
        console.log(`✅ ${compName}: ${matches.length} matches`);
      }

      // Rate limit: 10 req/min for free tier
      await new Promise(resolve => setTimeout(resolve, 6500));

    } catch (error) {
      console.error(`Error fetching ${compName}:`, error);
    }
  }

  return allMatches;
}

/**
 * Check which matches are already registered on blockchain
 */
async function filterUnregisteredMatches(matches: MatchToRegister[]): Promise<MatchToRegister[]> {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_URL)
  });

  const unregistered: MatchToRegister[] = [];

  for (const match of matches) {
    try {
      const matchId = BigInt(match.id);

      const matchInfo = await publicClient.readContract({
        address: CONTRACTS.SEERSLEAGUE,
        abi: SEERSLEAGUE_ABI,
        functionName: 'getMatch',
        args: [matchId]
      }) as { exists: boolean };

      if (!matchInfo.exists) {
        unregistered.push(match);
      }
    } catch (error) {
      // If read fails, assume not registered
      unregistered.push(match);
    }
  }

  return unregistered;
}

/**
 * Register matches in batches to avoid gas limits
 */
async function registerMatchesBatch(matches: MatchToRegister[]): Promise<string[]> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not configured');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(RPC_URL)
  });

  const BATCH_SIZE = 50; // Register 50 matches per transaction
  const txHashes: string[] = [];

  for (let i = 0; i < matches.length; i += BATCH_SIZE) {
    const batch = matches.slice(i, i + BATCH_SIZE);

    const matchIds = batch.map(m => BigInt(m.id));
    const startTimes = batch.map(m => BigInt(Math.floor(new Date(m.kickoff).getTime() / 1000)));

    console.log(`Registering batch ${i / BATCH_SIZE + 1}: ${batch.length} matches`);

    try {
      const txHash = await walletClient.writeContract({
        address: CONTRACTS.SEERSLEAGUE,
        abi: SEERSLEAGUE_ABI,
        functionName: 'registerMatches',
        args: [matchIds, startTimes]
      });

      txHashes.push(txHash);
      console.log(`✅ Batch registered: ${txHash}`);

      // Wait a bit between batches
      if (i + BATCH_SIZE < matches.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Failed to register batch:`, error);
      throw error;
    }
  }

  return txHashes;
}

/**
 * POST /api/batch-register-matches
 *
 * Registers upcoming matches for the next 1-2 weeks in one go.
 * This eliminates the need for manual ENABLE_AUTO_REGISTRATION toggling.
 *
 * Usage:
 * curl -X POST https://your-domain.com/api/batch-register-matches?days=14 \
 *   -H "Authorization: Bearer YOUR_ADMIN_SECRET"
 */
export async function POST(request: Request) {
  try {
    // Admin authentication
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Get days parameter (default 14)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '14', 10);

    if (days < 1 || days > 30) {
      return NextResponse.json(
        { error: 'Days must be between 1 and 30' },
        { status: 400 }
      );
    }

    console.log(`\n🚀 Starting batch registration for next ${days} days...\n`);

    // Step 1: Fetch upcoming matches
    console.log('📥 Step 1: Fetching matches from Football-data.org...');
    const allMatches = await fetchUpcomingMatches(days);
    console.log(`✅ Found ${allMatches.length} total matches\n`);

    if (allMatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No matches found for registration',
        matchesFetched: 0,
        matchesRegistered: 0
      });
    }

    // Step 2: Filter out already registered
    console.log('🔍 Step 2: Checking blockchain for already registered matches...');
    const unregistered = await filterUnregisteredMatches(allMatches);
    console.log(`✅ ${unregistered.length} matches need registration\n`);

    if (unregistered.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All matches already registered',
        matchesFetched: allMatches.length,
        matchesRegistered: 0,
        alreadyRegistered: allMatches.length
      });
    }

    // Step 3: Register in batches
    console.log('📝 Step 3: Registering matches to blockchain...');
    const txHashes = await registerMatchesBatch(unregistered);
    console.log(`✅ Registration complete!\n`);

    // Prepare response with match details
    const registeredMatches = unregistered.map(m => ({
      id: m.id,
      match: `${m.homeTeam} vs ${m.awayTeam}`,
      league: m.league,
      kickoff: m.kickoff
    }));

    return NextResponse.json({
      success: true,
      message: `Successfully registered ${unregistered.length} matches`,
      matchesFetched: allMatches.length,
      matchesRegistered: unregistered.length,
      alreadyRegistered: allMatches.length - unregistered.length,
      transactions: txHashes,
      matches: registeredMatches.slice(0, 20), // Show first 20 for brevity
      totalMatches: registeredMatches.length
    });

  } catch (error) {
    console.error('Batch registration error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for status/info
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'Batch Register Matches',
    description: 'Register upcoming matches for the next 1-2 weeks in one go',
    method: 'POST',
    authentication: 'Bearer token required (ADMIN_SECRET or CRON_SECRET)',
    parameters: {
      days: 'Number of days to fetch (1-30, default: 14)'
    },
    usage: 'POST /api/batch-register-matches?days=14',
    note: 'This eliminates the need for manual ENABLE_AUTO_REGISTRATION toggling'
  });
}
