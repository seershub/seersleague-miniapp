import { NextResponse } from 'next/server';

const SPORTS_DB_BASE = 'https://www.thesportsdb.com/api/v1/json';
const API_KEY = process.env.SPORTS_DB_API_KEY || '3';

const LEAGUE_IDS = {
  PREMIER_LEAGUE: '4328',
  LA_LIGA: '4335',
  BUNDESLIGA: '4331',
  SERIE_A: '4332',
  LIGUE_1: '4334',
  CHAMPIONS_LEAGUE: '4331',
  EUROPA_LEAGUE: '4332',
  EPL: '4328',
  BUNDESLIGA_2: '4336',
  CHAMPIONSHIP: '4329',
};

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  venue: string;
  homeTeamBadge: string;
  awayTeamBadge: string;
  status: string;
}

export async function GET(
  request: Request,
  { params }: { params: { date: string } }
) {
  try {
    const { date } = params;
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }
    
    console.log('Fetching matches for date:', date);
    
    const allMatches: Match[] = [];
    
    for (const [name, leagueId] of Object.entries(LEAGUE_IDS)) {
      try {
        const url = `${SPORTS_DB_BASE}/${API_KEY}/eventsday.php?d=${date}&l=${leagueId}`;
        console.log(`Fetching ${name}:`, url);
        
        const response = await fetch(url, {
          next: { revalidate: 3600 } // Cache 1 hour
        });
        
        if (!response.ok) {
          console.error(`Failed to fetch ${name}:`, response.status);
          continue;
        }
        
        const data = await response.json();
        
        if (data.events && Array.isArray(data.events)) {
          const matches = data.events
            .filter((event: any) => 
              event.strStatus === 'Not Started' || 
              event.strStatus === 'NS' ||
              event.strStatus === 'Scheduled'
            )
            .map((event: any) => ({
              id: event.idEvent,
              homeTeam: event.strHomeTeam,
              awayTeam: event.strAwayTeam,
              league: event.strLeague,
              kickoff: event.dateEvent + 'T' + (event.strTime || '00:00:00'),
              venue: event.strVenue || 'TBA',
              homeTeamBadge: event.strHomeTeamBadge || '/default-badge.png',
              awayTeamBadge: event.strAwayTeamBadge || '/default-badge.png',
              status: event.strStatus,
            }));
          
          allMatches.push(...matches);
          console.log(`${name}: Found ${matches.length} matches`);
        }
      } catch (error) {
        console.error(`Error fetching ${name}:`, error);
      }
    }
    
    console.log('Total matches found:', allMatches.length);
    
    // Sort by kickoff and take first 5
    const featured = allMatches
      .sort((a, b) => 
        new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      )
      .slice(0, 5);
    
    console.log('Featured matches:', featured.length);
    
    return NextResponse.json(featured);
    
  } catch (error) {
    console.error('Error in matches API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}
