// TheSportsDB API Integration
const SPORTS_DB_BASE = 'https://www.thesportsdb.com/api/v1/json';
const API_KEY = process.env.SPORTS_DB_API_KEY || '3'; // Free tier key

// Preferred leagues for display (TheSportsDB uses these names)
const ALLOWED_LEAGUES = new Set<string>([
  'English Premier League',
  'Spanish La Liga',
  'German Bundesliga',
  'Italian Serie A',
  'French Ligue 1',
  'Turkish Super Lig',
  'UEFA Champions League',
  'UEFA Europa League',
  'Dutch Eredivisie',
  'Portuguese Primeira Liga',
  'Belgian First Division A',
  'Scottish Premiership',
  'Major League Soccer',
]);

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  venue: string;
  homeTeamBadge: string;
  awayTeamBadge: string;
  status: 'Not Started' | 'Live' | 'Match Finished';
  homeScore?: number;
  awayScore?: number;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  status: 'finished' | 'live' | 'not_started';
  outcome: 1 | 2 | 3; // 1=Home, 2=Draw, 3=Away
}

// Rate limiter to respect API limits (30 requests per minute)
class RateLimiter {
  private requests: number[] = [];
  private readonly limit = 25; // Conservative limit
  private readonly window = 60000; // 1 minute in ms
  
  async checkLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside window
    this.requests = this.requests.filter(
      time => now - time < this.window
    );
    
    if (this.requests.length >= this.limit) {
      // Wait until oldest request expires
      const oldestRequest = this.requests[0];
      const waitTime = this.window - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}

export const sportsDbLimiter = new RateLimiter();

/**
 * Fetch today's featured matches (5 matches from top leagues)
 */
export async function getTodayMatches(): Promise<Match[]> {
  try {
    await sportsDbLimiter.checkLimit();
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // Fetch all Soccer events for the day (more reliable than league param)
    const response = await fetch(
      `${SPORTS_DB_BASE}/${API_KEY}/eventsday.php?d=${dateStr}&s=Soccer`,
      {
        next: { revalidate: 600 }, // cache 10 mins
        headers: { 'User-Agent': 'SeersLeague/1.0' },
      }
    );
    if (!response.ok) {
      throw new Error(`SportsDB HTTP ${response.status}`);
    }
    const data = await response.json();
    const events = Array.isArray(data?.events) ? data.events : [];

    const normalize = (event: any): Match => ({
      id: event.idEvent,
      homeTeam: event.strHomeTeam,
      awayTeam: event.strAwayTeam,
      league: event.strLeague,
      kickoff: `${event.dateEvent}T${event.strTime}`,
      venue: event.strVenue || 'TBA',
      homeTeamBadge: event.strHomeTeamBadge || '/default-badge.svg',
      awayTeamBadge: event.strAwayTeamBadge || '/default-badge.svg',
      status: event.strStatus as any,
      homeScore: parseInt(event.intHomeScore || '0'),
      awayScore: parseInt(event.intAwayScore || '0'),
    });

    // Preferred leagues first
    const notStarted = events.filter((e: any) => e?.strStatus === 'Not Started').map(normalize);
    const preferred = notStarted.filter((m: Match) => ALLOWED_LEAGUES.has(m.league));
    const others = notStarted.filter((m: Match) => !ALLOWED_LEAGUES.has(m.league));

    const featured: Match[] = [];
    for (const m of preferred.sort((a: Match, b: Match) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())) {
      if (featured.length >= 5) break;
      featured.push(m);
    }
    if (featured.length < 5) {
      for (const m of others.sort((a: Match, b: Match) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())) {
        if (featured.length >= 5) break;
        featured.push(m);
      }
    }
    return featured;
  } catch (error) {
    console.error('Error fetching matches:', error);
    throw new Error('Failed to fetch matches');
  }
}

/**
 * Get match result
 */
export async function getMatchResult(matchId: string): Promise<MatchResult> {
  try {
    await sportsDbLimiter.checkLimit();
    
    const response = await fetch(
      `${SPORTS_DB_BASE}/${API_KEY}/lookupevent.php?id=${matchId}`,
      { 
        cache: 'no-store', // Always fetch fresh for results
        headers: {
          'User-Agent': 'SeersLeague/1.0'
        }
      }
    );
    
    if (!response.ok) throw new Error('Failed to fetch result');
    
    const data = await response.json();
    const event = data.events?.[0];
    
    if (!event) throw new Error('Event not found');
    
    const homeScore = parseInt(event.intHomeScore || '0');
    const awayScore = parseInt(event.intAwayScore || '0');
    
    return {
      homeScore,
      awayScore,
      status: event.strStatus === 'Match Finished' ? 'finished' : 
              event.strStatus === 'Live' ? 'live' : 'not_started',
      outcome: determineOutcome(homeScore, awayScore)
    };
    
  } catch (error) {
    console.error('Error fetching result:', error);
    throw new Error('Failed to fetch match result');
  }
}

/**
 * Determine outcome from scores
 */
export function determineOutcome(
  homeScore: number, 
  awayScore: number
): 1 | 2 | 3 {
  if (homeScore > awayScore) return 1; // Home win
  if (homeScore < awayScore) return 3; // Away win
  return 2; // Draw
}

/**
 * Batch verify results and prepare for contract recording
 */
export async function verifyAndRecordResults(
  matchIds: string[]
): Promise<{ matchId: string; result: MatchResult }[]> {
  try {
    // Fetch all results in parallel
    const results = await Promise.all(
      matchIds.map(async (id) => {
        const result = await getMatchResult(id);
        return { matchId: id, result };
      })
    );
    
    return results;
    
  } catch (error) {
    console.error('Error verifying results:', error);
    throw new Error('Failed to verify match results');
  }
}

/**
 * Get upcoming matches for the next few days
 */
export async function getUpcomingMatches(days: number = 3): Promise<Match[]> {
  try {
    const out: Match[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      await sportsDbLimiter.checkLimit();
      const response = await fetch(
        `${SPORTS_DB_BASE}/${API_KEY}/eventsday.php?d=${dateStr}&s=Soccer`,
        { next: { revalidate: 600 }, headers: { 'User-Agent': 'SeersLeague/1.0' } }
      );
      if (!response.ok) continue;
      const data = await response.json();
      const events = Array.isArray(data?.events) ? data.events : [];
      for (const event of events) {
        if (event?.strStatus !== 'Not Started') continue;
        out.push({
          id: event.idEvent,
          homeTeam: event.strHomeTeam,
          awayTeam: event.strAwayTeam,
          league: event.strLeague,
          kickoff: `${event.dateEvent}T${event.strTime}`,
          venue: event.strVenue || 'TBA',
          homeTeamBadge: event.strHomeTeamBadge || '/default-badge.svg',
          awayTeamBadge: event.strAwayTeamBadge || '/default-badge.svg',
          status: 'Not Started',
        });
      }
    }
    return out;
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    throw new Error('Failed to fetch upcoming matches');
  }
}

/**
 * Format match time for display
 */
export function formatMatchTime(kickoff: string): string {
  const date = new Date(kickoff);
  const now = new Date();
  
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffMs < 0) {
    return 'Started';
  } else if (diffHours < 1) {
    return `In ${diffMinutes}m`;
  } else if (diffHours < 24) {
    return `In ${diffHours}h ${diffMinutes}m`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Check if match is upcoming (not started)
 */
export function isMatchUpcoming(kickoff: string): boolean {
  const date = new Date(kickoff);
  return date.getTime() > Date.now();
}
