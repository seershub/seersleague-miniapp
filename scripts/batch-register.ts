/**
 * Batch Register Matches - Local Script
 *
 * Bu script'i local'de çalıştırarak maçları register edebilirsin.
 *
 * Kullanım:
 * 1. CRON_SECRET değerini aşağıya yapıştır
 * 2. Terminal'de: npx tsx scripts/batch-register.ts
 */

import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS, SEERSLEAGUE_ABI } from '../lib/contract-interactions';

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

console.log('🔑 API Key status:', FOOTBALL_DATA_API_KEY ? 'Set' : 'Not set');
console.log('🔑 API Key length:', FOOTBALL_DATA_API_KEY.length);

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

async function fetchUpcomingMatches(days: number = 14): Promise<MatchToRegister[]> {
  console.log(`\n📥 Fetching matches from Football-data.org for next ${days} days...\n`);

  const allMatches: MatchToRegister[] = [];
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + days);

  const dateFrom = today.toISOString().split('T')[0];
  const dateTo = endDate.toISOString().split('T')[0];

  for (const [compName, compId] of Object.entries(COMPETITION_IDS)) {
    try {
      const url = `${FOOTBALL_DATA_BASE}/competitions/${compId}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`;

      console.log(`📡 ${compName}...`);

      const response = await fetch(url, {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
      });

      if (!response.ok) {
        console.log(`  ⚠️  Failed: ${response.status}`);
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
        console.log(`  ✅ Found ${matches.length} matches`);
      }

      // Rate limit: 10 req/min
      await new Promise(resolve => setTimeout(resolve, 6500));

    } catch (error) {
      console.error(`  ❌ Error: ${error}`);
    }
  }

  console.log(`\n✅ Total matches found: ${allMatches.length}\n`);
  return allMatches;
}

async function filterUnregisteredMatches(matches: MatchToRegister[]): Promise<MatchToRegister[]> {
  console.log('🔍 Checking blockchain for already registered matches...\n');

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
      unregistered.push(match);
    }
  }

  console.log(`✅ ${unregistered.length} matches need registration\n`);
  return unregistered;
}

async function registerMatchesBatch(matches: MatchToRegister[]): Promise<string[]> {
  console.log('📝 Registering matches to blockchain...\n');

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not found in environment variables');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(RPC_URL)
  });

  const BATCH_SIZE = 50;
  const txHashes: string[] = [];

  for (let i = 0; i < matches.length; i += BATCH_SIZE) {
    const batch = matches.slice(i, i + BATCH_SIZE);

    const matchIds = batch.map(m => BigInt(m.id));
    const startTimes = batch.map(m => BigInt(Math.floor(new Date(m.kickoff).getTime() / 1000)));

    console.log(`📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}: Registering ${batch.length} matches...`);
    console.log(`   First match: ${batch[0].homeTeam} vs ${batch[0].awayTeam}`);

    try {
      const txHash = await walletClient.writeContract({
        address: CONTRACTS.SEERSLEAGUE,
        abi: SEERSLEAGUE_ABI,
        functionName: 'registerMatches',
        args: [matchIds, startTimes]
      });

      txHashes.push(txHash);
      console.log(`   ✅ TX: ${txHash}\n`);

      if (i + BATCH_SIZE < matches.length) {
        console.log('   ⏳ Waiting 2s before next batch...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`   ❌ Batch failed:`, error);
      throw error;
    }
  }

  return txHashes;
}

async function main() {
  console.log('\n🚀 SeersLeague Batch Registration\n');
  console.log('='.repeat(50));

  try {
    // Step 1: Fetch matches
    const allMatches = await fetchUpcomingMatches(14);

    if (allMatches.length === 0) {
      console.log('\n⚠️  No matches found. Exiting.\n');
      return;
    }

    // Step 2: Filter unregistered
    const unregistered = await filterUnregisteredMatches(allMatches);

    if (unregistered.length === 0) {
      console.log('\n✅ All matches already registered!\n');
      return;
    }

    // Step 3: Register
    const txHashes = await registerMatchesBatch(unregistered);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ BATCH REGISTRATION COMPLETE!\n');
    console.log(`📊 Summary:`);
    console.log(`   - Matches fetched: ${allMatches.length}`);
    console.log(`   - Matches registered: ${unregistered.length}`);
    console.log(`   - Already registered: ${allMatches.length - unregistered.length}`);
    console.log(`   - Transactions: ${txHashes.length}`);
    console.log('\n📝 Transaction Hashes:');
    txHashes.forEach((hash, i) => {
      console.log(`   ${i + 1}. ${hash}`);
    });
    console.log('\n✅ Done! Check https://league.seershub.com/ for matches.\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
