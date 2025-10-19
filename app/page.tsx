import { Match } from '@/lib/matches';
import Home from './page-client';
import { headers } from 'next/headers';

async function fetchMatchesServer(): Promise<Match[]> {
  try {
    const h = headers();
    const proto = h.get('x-forwarded-proto') || 'https';
    const host = h.get('host');
    if (!host) return [];
    const base = `${proto}://${host}`;
    const res = await fetch(`${base}/api/matches`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const matches = await fetchMatchesServer();
  return <Home initialMatches={matches} />;
}
