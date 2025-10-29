import { Match } from '@/lib/matches';
import Home from './page-client';

/**
 * Fetch matches from blockchain (registered matches only)
 * This ensures we only show matches that are actually registered in the contract
 */
async function fetchMatchesServer(): Promise<Match[]> {
  console.log('=== FETCHING REGISTERED MATCHES FROM BLOCKCHAIN ===');

  try {
    // Fetch from our API endpoint which gets blockchain registered matches
    // and enriches them with Football-data.org
    // CRITICAL FIX: Use VERCEL_URL in production, fallback to localhost in dev
    const protocol = process.env.VERCEL_URL ? 'https' : 'http';
    const host = process.env.VERCEL_URL || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    console.log(`[Homepage] Fetching from: ${baseUrl}/api/matches`);

    const response = await fetch(`${baseUrl}/api/matches?limit=20`, {
      cache: 'no-store' // Always get fresh data
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Found ${data.total} registered matches, showing ${data.returned}`);

    return data.matches || [];

  } catch (error) {
    console.error('Error fetching blockchain matches:', error);
    console.log('Using fallback: Will try to fetch from API on client side');

    // Return empty - client will try to fetch
    return [];
  }
}

export default async function Page() {
  const matches = await fetchMatchesServer();

  return <Home initialMatches={matches} />;
}