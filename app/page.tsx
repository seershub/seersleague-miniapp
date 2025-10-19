import { Match } from '@/lib/matches';
import Home from './page-client';

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';
const API_KEY = 'ab4bf8eeaf614f969dfe8de37c58107d'; // Football-data.org API key

// Competition IDs for Football-Data.org
const COMPETITION_IDS = {
  PREMIER_LEAGUE: 'PL',      // Premier League
  LA_LIGA: 'PD',             // Primera División (La Liga)
  BUNDESLIGA: 'BL1',         // Bundesliga
  SERIE_A: 'SA',             // Serie A
  LIGUE_1: 'FL1',            // Ligue 1
  CHAMPIONS_LEAGUE: 'CL',    // Champions League
  EUROPA_LEAGUE: 'EL',       // Europa League
  EREDIVISIE: 'DED',         // Eredivisie
  PRIMEIRA_LIGA: 'PPL',      // Primeira Liga
  BELGIAN_PRO: 'B1',         // Belgian Pro League
  SCOTTISH_PREMIER: 'SPL',   // Scottish Premiership
  MLS: 'MLS',                // Major League Soccer
};

async function fetchMatchesServer(): Promise<Match[]> {
  console.log('=== FETCHING REAL MATCHES FROM FOOTBALL-DATA.ORG ===');
  console.log('=== API KEY: SET ===');
  
  try {
    const allMatches: Match[] = [];
    
    // Priority competitions to fetch from
    const priorityCompetitions = [
      { name: 'PREMIER_LEAGUE', id: COMPETITION_IDS.PREMIER_LEAGUE },
      { name: 'LA_LIGA', id: COMPETITION_IDS.LA_LIGA },
      { name: 'BUNDESLIGA', id: COMPETITION_IDS.BUNDESLIGA },
      { name: 'SERIE_A', id: COMPETITION_IDS.SERIE_A },
      { name: 'LIGUE_1', id: COMPETITION_IDS.LIGUE_1 },
    ];
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log('Fetching matches for dates:', today, 'and', tomorrowStr);
    
    for (const competition of priorityCompetitions) {
      try {
        // Fetch today's matches
        const todayUrl = `${FOOTBALL_DATA_BASE}/competitions/${competition.id}/matches?date=${today}&status=SCHEDULED`;
        console.log(`Fetching ${competition.name} for today: ${todayUrl}`);
        
        const todayResponse = await fetch(todayUrl, {
          headers: {
            'X-Auth-Token': API_KEY,
          },
          next: { revalidate: 3600 }, // 1 hour cache
        });
        
        if (todayResponse.ok) {
          const todayData = await todayResponse.json();
          console.log(`✅ Today's ${competition.name} matches:`, todayData.matches?.length || 0);
          
          if (todayData.matches && Array.isArray(todayData.matches)) {
            const matches = todayData.matches.map((match: any) => ({
              id: match.id.toString(),
              homeTeam: match.homeTeam.name,
              awayTeam: match.awayTeam.name,
              league: match.competition.name,
              kickoff: match.utcDate,
              venue: match.venue || 'TBA',
              homeTeamBadge: match.homeTeam.crest || '/default-badge.svg',
              awayTeamBadge: match.awayTeam.crest || '/default-badge.svg',
              status: match.status,
            }));
            
            allMatches.push(...matches);
          }
        } else {
          console.error(`❌ Failed to fetch ${competition.name} today:`, todayResponse.status);
        }
        
        // If we don't have enough matches, also fetch tomorrow's
        if (allMatches.length < 5) {
          const tomorrowUrl = `${FOOTBALL_DATA_BASE}/competitions/${competition.id}/matches?date=${tomorrowStr}&status=SCHEDULED`;
          console.log(`Fetching ${competition.name} for tomorrow: ${tomorrowUrl}`);
          
          const tomorrowResponse = await fetch(tomorrowUrl, {
            headers: {
              'X-Auth-Token': API_KEY,
            },
            next: { revalidate: 3600 }, // 1 hour cache
          });
          
          if (tomorrowResponse.ok) {
            const tomorrowData = await tomorrowResponse.json();
            console.log(`✅ Tomorrow's ${competition.name} matches:`, tomorrowData.matches?.length || 0);
            
            if (tomorrowData.matches && Array.isArray(tomorrowData.matches)) {
              const matches = tomorrowData.matches.map((match: any) => ({
                id: match.id.toString(),
                homeTeam: match.homeTeam.name,
                awayTeam: match.awayTeam.name,
                league: match.competition.name,
                kickoff: match.utcDate,
                venue: match.venue || 'TBA',
                homeTeamBadge: match.homeTeam.crest || '/default-badge.svg',
                awayTeamBadge: match.awayTeam.crest || '/default-badge.svg',
                status: match.status,
              }));
              
              allMatches.push(...matches);
            }
          } else {
            console.error(`❌ Failed to fetch ${competition.name} tomorrow:`, tomorrowResponse.status);
          }
        }
        
        // Add delay between requests to be respectful to API
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // If we have enough matches, break
        if (allMatches.length >= 5) {
          console.log(`🎯 Found enough matches (${allMatches.length}), stopping search`);
          break;
        }
        
      } catch (error) {
        console.error(`❌ Error fetching ${competition.name}:`, error);
      }
    }
    
    console.log('Total matches found:', allMatches.length);
    
    // Sort by kickoff time and take first 5
    const featured = allMatches
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .slice(0, 5);
    
    console.log('Featured matches:', featured.length);
    
    // If no real matches found, return fallback data
    if (featured.length === 0) {
      console.log('No real matches found, using fallback mock data');
      return getFallbackMatches();
    }
    
    console.log('=== FINAL REAL MATCHES ===');
    console.log('Featured matches:', JSON.stringify(featured, null, 2));
    
    return featured;
    
  } catch (error) {
    console.error('Error in Football-Data.org API fetch:', error);
    console.log('Using fallback mock data due to error');
    return getFallbackMatches();
  }
}

function getFallbackMatches(): Match[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  return [
    {
      id: '1',
      homeTeam: 'Liverpool',
      awayTeam: 'Arsenal',
      league: 'Premier League',
      kickoff: new Date(tomorrow.getTime() + 3600000).toISOString(),
      venue: 'Anfield',
      homeTeamBadge: '/default-badge.svg',
      awayTeamBadge: '/default-badge.svg',
      status: 'SCHEDULED',
    },
    {
      id: '2',
      homeTeam: 'Real Madrid',
      awayTeam: 'Barcelona',
      league: 'La Liga',
      kickoff: new Date(tomorrow.getTime() + 7200000).toISOString(),
      venue: 'Santiago Bernabéu',
      homeTeamBadge: '/default-badge.svg',
      awayTeamBadge: '/default-badge.svg',
      status: 'SCHEDULED',
    },
    {
      id: '3',
      homeTeam: 'Bayern Munich',
      awayTeam: 'Borussia Dortmund',
      league: 'Bundesliga',
      kickoff: new Date(tomorrow.getTime() + 10800000).toISOString(),
      venue: 'Allianz Arena',
      homeTeamBadge: '/default-badge.svg',
      awayTeamBadge: '/default-badge.svg',
      status: 'SCHEDULED',
    },
    {
      id: '4',
      homeTeam: 'Inter Milan',
      awayTeam: 'Juventus',
      league: 'Serie A',
      kickoff: new Date(tomorrow.getTime() + 14400000).toISOString(),
      venue: 'San Siro',
      homeTeamBadge: '/default-badge.svg',
      awayTeamBadge: '/default-badge.svg',
      status: 'SCHEDULED',
    },
    {
      id: '5',
      homeTeam: 'PSG',
      awayTeam: 'Marseille',
      league: 'Ligue 1',
      kickoff: new Date(tomorrow.getTime() + 18000000).toISOString(),
      venue: 'Parc des Princes',
      homeTeamBadge: '/default-badge.svg',
      awayTeamBadge: '/default-badge.svg',
      status: 'SCHEDULED',
    },
  ];
}

export default async function Page() {
  const matches = await fetchMatchesServer();
  
  return <Home initialMatches={matches} />;
}
