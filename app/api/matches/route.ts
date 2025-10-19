import { NextResponse } from 'next/server';

const SPORTS_DB_BASE = 'https://www.thesportsdb.com/api/v1/json';
const API_KEY = process.env.SPORTS_DB_API_KEY || '123'; // Correct free API key

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
  TURKISH_SUPER_LIG: '4338', // Türkiye Süper Ligi
  EREDIVISIE: '4333', // Hollanda
  PRIMEIRA_LIGA: '4334', // Portekiz
  RUSSIAN_PREMIER: '4335', // Rusya
  BELGIAN_PRO: '4336', // Belçika
  SCOTTISH_PREMIER: '4337', // İskoçya
  MLS: '4338', // ABD
  LIGA_MX: '4339', // Meksika
  BRAZILIAN_SERIE_A: '4340', // Brezilya
  ARGENTINE_PRIMERA: '4341', // Arjantin
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
    console.log('=== CURRENT TIME:', new Date().toISOString(), '===');
    console.log('=== API KEY:', API_KEY, '===');
    
    const allMatches: Match[] = [];
    
    // Try current date and next few days to find matches
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
          console.log(`\nFetching ${name} for ${tryDate}:`);
          console.log(`URL: ${url}`);
          
          const response = await fetch(url, {
            cache: 'no-store' // No cache for testing
          });
          
          if (!response.ok) {
            console.error(`❌ Failed to fetch ${name}:`, response.status);
            continue;
          }
          
          const data = await response.json();
          console.log(`✅ Response for ${name}:`, JSON.stringify(data, null, 2));
          
          if (data.events && Array.isArray(data.events)) {
            console.log(`📊 Raw events count for ${name}:`, data.events.length);
            
            // Log all events to see what we're getting
            data.events.forEach((event: any, index: number) => {
              console.log(`Event ${index + 1}:`, {
                id: event.idEvent,
                home: event.strHomeTeam,
                away: event.strAwayTeam,
                status: event.strStatus,
                date: event.dateEvent,
                time: event.strTime
              });
            });
            
            const matches = data.events
              .filter((event: any) => {
                const isValid = event.strStatus === 'Not Started' || 
                               event.strStatus === 'NS' ||
                               event.strStatus === 'Scheduled' ||
                               event.strStatus === 'Time to be defined' ||
                               event.strStatus === 'TBD';
                console.log(`Event ${event.idEvent} status: ${event.strStatus} - Valid: ${isValid}`);
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
    
    // If no matches found, try to get upcoming matches from a different approach
    if (featured.length === 0) {
      console.log('No matches found, trying alternative approach...');
      
      // Try multiple leagues with working endpoint (eventsday.php)
      const leaguesToTry = [
        { id: '4328', name: 'Premier League' },
        { id: '4335', name: 'La Liga' },
        { id: '4331', name: 'Bundesliga' },
        { id: '4332', name: 'Serie A' },
        { id: '4334', name: 'Ligue 1' }
      ];
      
      for (const league of leaguesToTry) {
        try {
          // Try today's matches
          const todayUrl = `${SPORTS_DB_BASE}/${API_KEY}/eventsday.php?d=${dateStr}&l=${league.id}`;
          console.log(`Fetching ${league.name} matches for today:`, todayUrl);
          
          const response = await fetch(todayUrl, {
            cache: 'no-store'
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.events && Array.isArray(data.events) && data.events.length > 0) {
              const upcomingMatches = data.events
                .slice(0, 5) // Take first 5
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
              
              if (upcomingMatches.length > 0) {
                console.log(`Found ${league.name} matches:`, upcomingMatches.length);
                return NextResponse.json(upcomingMatches);
              }
            }
          }
          
          // Try next 7 days
          for (let i = 1; i <= 7; i++) {
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + i);
            const futureDateStr = futureDate.toISOString().split('T')[0];
            
            const futureUrl = `${SPORTS_DB_BASE}/${API_KEY}/eventsday.php?d=${futureDateStr}&l=${league.id}`;
            console.log(`Fetching ${league.name} matches for ${futureDateStr}:`, futureUrl);
            
            const futureResponse = await fetch(futureUrl, {
              cache: 'no-store'
            });
            
            if (futureResponse.ok) {
              const futureData = await futureResponse.json();
              
              if (futureData.events && Array.isArray(futureData.events) && futureData.events.length > 0) {
                const upcomingMatches = futureData.events
                  .slice(0, 5) // Take first 5
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
                
                if (upcomingMatches.length > 0) {
                  console.log(`Found ${league.name} matches for ${futureDateStr}:`, upcomingMatches.length);
                  return NextResponse.json(upcomingMatches);
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching ${league.name} matches:`, error);
          continue; // Try next league
        }
      }
      
      // Final fallback - realistic mock data
      console.log('Using fallback mock data');
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
    
    return NextResponse.json(featured);
    
  } catch (error) {
    console.error('Error in matches API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}
