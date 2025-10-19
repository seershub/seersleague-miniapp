import { NextResponse } from 'next/server';

const SPORTS_DB_BASE = 'https://www.thesportsdb.com/api/v1/json';
const API_KEY = process.env.SPORTS_DB_API_KEY || '123';

const LEAGUE_IDS = {
  PREMIER_LEAGUE: '4328',
  LA_LIGA: '4335',
  BUNDESLIGA: '4331',
  SERIE_A: '4332',
  LIGUE_1: '4334',
  TURKISH_SUPER_LIG: '4338',
  EREDIVISIE: '4333',
  PRIMEIRA_LIGA: '4334',
  RUSSIAN_PREMIER: '4335',
  BELGIAN_PRO: '4336',
  SCOTTISH_PREMIER: '4337',
  MLS: '4338',
  LIGA_MX: '4339',
  BRAZILIAN_SERIE_A: '4340',
  ARGENTINE_PRIMERA: '4341',
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

export async function GET() {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    console.log('=== FETCHING MATCHES FOR DATE:', dateStr, '===');
    console.log('=== API KEY:', API_KEY, '===');
    
    const allMatches: Match[] = [];
    
    // Try current date and next few days
    const datesToTry = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      datesToTry.push(date.toISOString().split('T')[0]);
    }
    
    console.log('Dates to try:', datesToTry);
    
    for (const tryDate of datesToTry) {
      console.log(`\n--- TRYING DATE: ${tryDate} ---`);
      
      for (const [name, leagueId] of Object.entries(LEAGUE_IDS)) {
        try {
          const url = `${SPORTS_DB_BASE}/${API_KEY}/eventsday.php?d=${tryDate}&l=${leagueId}`;
          console.log(`Fetching ${name} for ${tryDate}: ${url}`);
          
          const response = await fetch(url);
          
          if (!response.ok) {
            console.error(`❌ Failed to fetch ${name}:`, response.status);
            continue;
          }
          
          const data = await response.json();
          console.log(`✅ Response for ${name}:`, data);
          
          if (data.events && Array.isArray(data.events)) {
            console.log(`📊 Raw events count for ${name}:`, data.events.length);
            
            const matches = data.events
              .filter((event: any) => {
                const isValid = event.strStatus === 'Not Started' || 
                               event.strStatus === 'NS' ||
                               event.strStatus === 'Scheduled' ||
                               event.strStatus === 'Time to be defined' ||
                               event.strStatus === 'TBD';
                return isValid;
              })
              .map((event: any) => ({
                id: event.idEvent,
                homeTeam: event.strHomeTeam,
                awayTeam: event.strAwayTeam,
                league: event.strLeague,
                kickoff: event.dateEvent + 'T' + (event.strTime || '15:00:00'),
                venue: event.strVenue || 'TBA',
                homeTeamBadge: event.strHomeTeamBadge || '/default-badge.png',
                awayTeamBadge: event.strAwayTeamBadge || '/default-badge.png',
                status: event.strStatus,
              }));
            
            console.log(`✅ Filtered matches for ${name}:`, matches.length);
            allMatches.push(...matches);
          } else {
            console.log(`❌ No events array in response for ${name}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching ${name}:`, error);
        }
      }
      
      // If we found matches, break
      if (allMatches.length >= 5) {
        console.log(`🎯 Found enough matches (${allMatches.length}), stopping search`);
        break;
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
    
    // If no matches found, return realistic mock data
    if (featured.length === 0) {
      console.log('No matches found, using fallback mock data');
      return NextResponse.json([
        {
          id: '1',
          homeTeam: 'Liverpool',
          awayTeam: 'Arsenal',
          league: 'Premier League',
          kickoff: new Date(Date.now() + 3600000).toISOString(),
          venue: 'Anfield',
          homeTeamBadge: '/default-badge.png',
          awayTeamBadge: '/default-badge.png',
          status: 'Not Started',
        },
        {
          id: '2',
          homeTeam: 'Real Madrid',
          awayTeam: 'Barcelona',
          league: 'La Liga',
          kickoff: new Date(Date.now() + 7200000).toISOString(),
          venue: 'Santiago Bernabéu',
          homeTeamBadge: '/default-badge.png',
          awayTeamBadge: '/default-badge.png',
          status: 'Not Started',
        },
        {
          id: '3',
          homeTeam: 'Bayern Munich',
          awayTeam: 'Borussia Dortmund',
          league: 'Bundesliga',
          kickoff: new Date(Date.now() + 10800000).toISOString(),
          venue: 'Allianz Arena',
          homeTeamBadge: '/default-badge.png',
          awayTeamBadge: '/default-badge.png',
          status: 'Not Started',
        },
        {
          id: '4',
          homeTeam: 'Inter Milan',
          awayTeam: 'Juventus',
          league: 'Serie A',
          kickoff: new Date(Date.now() + 14400000).toISOString(),
          venue: 'San Siro',
          homeTeamBadge: '/default-badge.png',
          awayTeamBadge: '/default-badge.png',
          status: 'Not Started',
        },
        {
          id: '5',
          homeTeam: 'PSG',
          awayTeam: 'Marseille',
          league: 'Ligue 1',
          kickoff: new Date(Date.now() + 18000000).toISOString(),
          venue: 'Parc des Princes',
          homeTeamBadge: '/default-badge.png',
          awayTeamBadge: '/default-badge.png',
          status: 'Not Started',
        },
      ]);
    }
    
    console.log('=== FINAL RESPONSE ===');
    console.log('Featured matches count:', featured.length);
    console.log('Featured matches:', JSON.stringify(featured, null, 2));
    
    return NextResponse.json(featured);
    
  } catch (error) {
    console.error('Error in matches API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}
