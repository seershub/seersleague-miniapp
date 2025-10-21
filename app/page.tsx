import { Match } from '@/lib/matches';
import Home from './page-client';

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';
const API_KEY = 'ab4bf8eeaf614f969dfe8de37c58107d';


async function fetchMatchesServer(): Promise<Match[]> {
  console.log('=== FETCHING MATCHES FROM FOOTBALL-DATA.ORG ===');
  
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`Fetching matches from ${today} to ${endDateStr}`);
    
    const allMatches: Match[] = [];
    
    // Priority competitions
    const competitions = [
      { name: 'PREMIER_LEAGUE', id: 'PL' },
      { name: 'LA_LIGA', id: 'PD' },
      { name: 'BUNDESLIGA', id: 'BL1' },
      { name: 'SERIE_A', id: 'SA' },
      { name: 'LIGUE_1', id: 'FL1' },
      { name: 'CHAMPIONS_LEAGUE', id: 'CL' },
      { name: 'EUROPA_LEAGUE', id: 'EL' },
    ];
    
    for (const competition of competitions) {
      try {
        const response = await fetch(`${FOOTBALL_DATA_BASE}/competitions/${competition.id}/matches?dateFrom=${today}&dateTo=${endDateStr}`, {
          headers: { 'X-Auth-Token': API_KEY },
          next: { revalidate: 3600 }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.matches && data.matches.length > 0) {
            const matches = data.matches
              .filter((match: any) => match.status === 'SCHEDULED' || match.status === 'TIMED')
              .map((match: any) => ({
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
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error fetching ${competition.name}:`, error);
        continue;
      }
    }
    
    console.log(`✅ Found ${allMatches.length} matches from Football-data.org`);
    
    // Sort by kickoff time and take first 20
    const sortedMatches = allMatches
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .slice(0, 20);
    
    return sortedMatches;
    
  } catch (error) {
    console.error('Error fetching blockchain matches:', error);
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
      status: 'Not Started',
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
      status: 'Not Started',
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
      status: 'Not Started',
    },
    {
      id: '4',
      homeTeam: 'Juventus',
      awayTeam: 'AC Milan',
      league: 'Serie A',
      kickoff: new Date(tomorrow.getTime() + 14400000).toISOString(),
      venue: 'Allianz Stadium',
      homeTeamBadge: '/default-badge.svg',
      awayTeamBadge: '/default-badge.svg',
      status: 'Not Started',
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
      status: 'Not Started',
    },
  ];
}

export default async function Page() {
  const matches = await fetchMatchesServer();
  
  return <Home initialMatches={matches} />;
}