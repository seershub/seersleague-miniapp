import { Match } from '@/lib/matches';
import Home from './page-client';

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';
const API_KEY = 'ab4bf8eeaf614f969dfe8de37c58107d';

async function enrichMatchesWithFootballData(matches: Match[]): Promise<Match[]> {
  console.log(`🌐 Enriching ${matches.length} matches with Football-data.org...`);
  
  const enriched: Match[] = [];
  
  for (const match of matches) {
    try {
      // Try to find match in Football-data.org by team names
      const response = await fetch(`${FOOTBALL_DATA_BASE}/matches?dateFrom=${new Date().toISOString().split('T')[0]}&dateTo=${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`, {
        headers: { 'X-Auth-Token': API_KEY },
        next: { revalidate: 1800 }
      });
      
      if (response.ok) {
        const data = await response.json();
        const foundMatch = data.matches?.find((m: any) => 
          (m.homeTeam.name.toLowerCase().includes(match.homeTeam.toLowerCase()) ||
           match.homeTeam.toLowerCase().includes(m.homeTeam.name.toLowerCase())) &&
          (m.awayTeam.name.toLowerCase().includes(match.awayTeam.toLowerCase()) ||
           match.awayTeam.toLowerCase().includes(m.awayTeam.name.toLowerCase()))
        );
        
        if (foundMatch) {
          // Use Football-data.org data with blockchain match ID
          enriched.push({
            ...match,
            homeTeamBadge: foundMatch.homeTeam.crest || '/default-badge.svg',
            awayTeamBadge: foundMatch.awayTeam.crest || '/default-badge.svg',
            league: foundMatch.competition.name || match.league,
            venue: foundMatch.venue || match.venue,
            kickoff: foundMatch.utcDate || match.kickoff,
          });
        } else {
          // Keep blockchain data with default badges
          enriched.push(match);
        }
      } else {
        // Keep blockchain data with default badges
        enriched.push(match);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error enriching match ${match.id}:`, error);
      // Keep blockchain data with default badges
      enriched.push({
        ...match,
        homeTeamBadge: '/default-badge.svg',
        awayTeamBadge: '/default-badge.svg',
      });
    }
  }
  
  console.log(`✅ Enriched ${enriched.length} matches`);
  return enriched;
}

async function fetchMatchesServer(): Promise<Match[]> {
  console.log('=== FETCHING MATCHES FROM BLOCKCHAIN + ENRICHING ===');
  
  try {
    // Step 1: Get match IDs from blockchain
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/matches?limit=50`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Blockchain matches:', data.matches?.length || 0);
    
    if (!data.matches || data.matches.length === 0) {
      return getFallbackMatches();
    }
    
    // Step 2: Enrich with Football-data.org for logos and details
    const enrichedMatches = await enrichMatchesWithFootballData(data.matches);
    
    return enrichedMatches;
    
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