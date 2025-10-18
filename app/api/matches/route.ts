import { NextResponse } from 'next/server';

const SPORTS_DB_BASE = 'https://www.thesportsdb.com/api/v1/json';
const API_KEY = process.env.SPORTS_DB_API_KEY || '3';

const LEAGUE_IDS = {
  PREMIER_LEAGUE: '4328',
  LA_LIGA: '4335',
  BUNDESLIGA: '4331',
  SERIE_A: '4332',
};

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
}

export async function GET() {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    console.log('Fetching matches for date:', dateStr);
    
    const allMatches: Match[] = [];
    
    for (const [name, leagueId] of Object.entries(LEAGUE_IDS)) {
      try {
        const url = `${SPORTS_DB_BASE}/${API_KEY}/eventsday.php?d=${dateStr}&l=${leagueId}`;
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
              event.strStatus === 'NS'
            )
            .map((event: any) => ({
              id: event.idEvent,
              homeTeam: event.strHomeTeam,
              awayTeam: event.strAwayTeam,
              league: event.strLeague,
              kickoff: event.dateEvent + 'T' + (event.strTime || '00:00:00'),
            }));
          
          allMatches.push(...matches);
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
    
    // If no matches today, return mock data for testing
    if (featured.length === 0) {
      console.log('No matches found, returning mock data');
      return NextResponse.json([
        {
          id: '1',
          homeTeam: 'Liverpool',
          awayTeam: 'Arsenal',
          league: 'Premier League',
          kickoff: new Date(Date.now() + 3600000).toISOString(),
        },
        {
          id: '2',
          homeTeam: 'Real Madrid',
          awayTeam: 'Barcelona',
          league: 'La Liga',
          kickoff: new Date(Date.now() + 7200000).toISOString(),
        },
        {
          id: '3',
          homeTeam: 'Bayern Munich',
          awayTeam: 'Borussia Dortmund',
          league: 'Bundesliga',
          kickoff: new Date(Date.now() + 10800000).toISOString(),
        },
        {
          id: '4',
          homeTeam: 'Inter Milan',
          awayTeam: 'Juventus',
          league: 'Serie A',
          kickoff: new Date(Date.now() + 14400000).toISOString(),
        },
        {
          id: '5',
          homeTeam: 'PSG',
          awayTeam: 'Marseille',
          league: 'Ligue 1',
          kickoff: new Date(Date.now() + 18000000).toISOString(),
        },
      ]);
    }
    
    return NextResponse.json(featured);
    
  } catch (error) {
    console.error('Error in matches API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}
