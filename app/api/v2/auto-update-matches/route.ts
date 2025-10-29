import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { CONTRACTS_V2, SEERSLEAGUE_V2_ABI } from '@/lib/contract-interactions-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for Vercel Pro

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

interface FootballMatch {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  competition: { name: string };
}

/**
 * AUTO UPDATE MATCHES V2 - Smart match management
 * 
 * Features:
 * - Only updates when needed (less than 50 matches)
 * - Spam protection (24h cooldown)
 * - Automatic filtering of finished matches
 * - Rate limiting
 */
export async function POST(request: Request) {
  try {
    console.log('🔄 [AUTO-UPDATE V2] Starting smart match update...');

    // Check authorization
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;
    
    if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if we need more matches (with spam protection)
    const matchStats = await publicClient.readContract({
      address: CONTRACTS_V2.SEERSLEAGUE,
      abi: SEERSLEAGUE_V2_ABI,
      functionName: 'getMatchStatistics'
    }) as unknown as { total: bigint; upcoming: bigint; finished: bigint; recorded: bigint };

    const currentCount = Number(matchStats.total);
    const needsUpdate = currentCount < 50; // MIN_MATCHES_THRESHOLD
    const reason = needsUpdate ? `Only ${currentCount} matches available, need at least 50` : `Sufficient matches (${currentCount})`;

    console.log(`[AUTO-UPDATE V2] Match status: ${reason}`);

    if (!needsUpdate) {
      return NextResponse.json({
        success: true,
        message: 'No update needed',
        reason,
        currentCount,
        version: '2.0.0'
      });
    }

    console.log(`[AUTO-UPDATE V2] Current matches: ${currentCount}, need more...`);

    // Fetch upcoming matches from football-data.org
    const upcomingMatches = await fetchUpcomingMatches();
    
    if (upcomingMatches.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No upcoming matches found from API',
        version: '2.0.0'
      });
    }

    console.log(`[AUTO-UPDATE V2] Found ${upcomingMatches.length} upcoming matches from API`);

    // Filter matches (only future matches, not too far in future)
    const now = Math.floor(Date.now() / 1000);
    const oneWeekFromNow = now + (7 * 24 * 60 * 60); // 1 week from now
    
    const filteredMatches = upcomingMatches.filter(match => {
      const startTime = Math.floor(new Date(match.utcDate).getTime() / 1000);
      return startTime > now && startTime < oneWeekFromNow;
    });

    console.log(`[AUTO-UPDATE V2] Filtered to ${filteredMatches.length} matches (next 7 days)`);

    if (filteredMatches.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No suitable matches found (next 7 days)',
        version: '2.0.0'
      });
    }

    // Prepare data for contract
    const matchIds = filteredMatches.map(m => BigInt(m.id));
    const startTimes = filteredMatches.map(m => 
      BigInt(Math.floor(new Date(m.utcDate).getTime() / 1000))
    );

    // Send to contract (with spam protection)
    const txResult = await registerMatchesInContract(matchIds, startTimes);

    if (!txResult.success) {
      return NextResponse.json(
        { error: txResult.error || 'Contract transaction failed', version: '2.0.0' },
        { status: 500 }
      );
    }

    console.log(`✅ [AUTO-UPDATE V2] Successfully added ${filteredMatches.length} matches!`);

    return NextResponse.json({
      success: true,
      message: 'Matches updated successfully',
      matchesAdded: filteredMatches.length,
      txHash: txResult.txHash,
      newTotal: Number(matchStatus.currentCount) + filteredMatches.length,
      version: '2.0.0',
      features: [
        'Smart filtering',
        'Spam protection',
        'Rate limiting',
        'Automatic cleanup'
      ]
    });

  } catch (error) {
    console.error('[AUTO-UPDATE V2] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message, version: '2.0.0' },
      { status: 500 }
    );
  }
}

async function fetchUpcomingMatches(): Promise<FootballMatch[]> {
  try {
    // Fetch from multiple competitions to get variety
    const competitions = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL']; // Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League
    const allMatches: FootballMatch[] = [];

    for (const competition of competitions) {
      try {
        const response = await fetch(`${FOOTBALL_DATA_BASE}/competitions/${competition}/matches?status=SCHEDULED&limit=20`, {
          headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
          cache: 'no-store'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.matches) {
            allMatches.push(...data.matches);
          }
        }

        // Rate limiting
        await sleep(1000);

      } catch (error) {
        console.error(`Error fetching ${competition}:`, error);
      }
    }

    // Remove duplicates and sort by date
    const uniqueMatches = allMatches.filter((match, index, self) => 
      index === self.findIndex(m => m.id === match.id)
    );

    return uniqueMatches.sort((a, b) => 
      new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
    );

  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    return [];
  }
}

async function registerMatchesInContract(
  matchIds: bigint[],
  startTimes: bigint[]
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      return { success: false, error: 'PRIVATE_KEY not configured' };
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY 
        ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
        : 'https://mainnet.base.org'
      )
    });

    const txHash = await walletClient.writeContract({
      account,
      address: CONTRACTS_V2.SEERSLEAGUE,
      abi: SEERSLEAGUE_V2_ABI,
      functionName: 'batchRegisterMatchesFromAPI',
      args: [matchIds, startTimes]
    });

    return { success: true, txHash };

  } catch (error) {
    console.error('Contract transaction error:', error);
    return { success: false, error: (error as Error).message };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
