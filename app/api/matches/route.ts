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

export async function GET() {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    console.log('=== FETCHING MATCHES FOR DATE:', dateStr, '===');
    
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
            next: { revalidate: 300 } // Cache 5 minutes for testing
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
      
      // Try to get upcoming matches from Premier League
      try {
        const upcomingUrl = `${SPORTS_DB_BASE}/${API_KEY}/eventsseason.php?id=4328&s=2024-2025`;
        console.log('Fetching upcoming matches:', upcomingUrl);
        
        const response = await fetch(upcomingUrl, {
          next: { revalidate: 3600 }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.events && Array.isArray(data.events)) {
            const upcomingMatches = data.events
              .filter((event: any) => {
                const eventDate = new Date(event.dateEvent);
                const today = new Date();
                const weekFromNow = new Date();
                weekFromNow.setDate(today.getDate() + 7);
                
                return eventDate >= today && 
                       eventDate <= weekFromNow && 
                       (event.strStatus === 'Not Started' || 
                        event.strStatus === 'NS' ||
                        event.strStatus === 'Scheduled');
              })
              .slice(0, 5)
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
              console.log('Found upcoming matches:', upcomingMatches.length);
              return NextResponse.json(upcomingMatches);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching upcoming matches:', error);
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
