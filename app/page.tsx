import { Match } from '@/lib/matches';
import Home from './page-client';

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

async function fetchMatchesServer(): Promise<Match[]> {
  // Temporarily use mock data to avoid API rate limiting issues
  // TODO: Implement proper API integration when rate limiting is resolved
  console.log('=== USING MOCK DATA (API rate limited) ===');
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  return [
    {
      id: '1',
      homeTeam: 'Liverpool',
      awayTeam: 'Arsenal',
      league: 'Premier League',
      kickoff: new Date(tomorrow.getTime() + 3600000).toISOString(), // Tomorrow + 1 hour
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
      kickoff: new Date(tomorrow.getTime() + 7200000).toISOString(), // Tomorrow + 2 hours
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
      kickoff: new Date(tomorrow.getTime() + 10800000).toISOString(), // Tomorrow + 3 hours
      venue: 'Allianz Arena',
      homeTeamBadge: '/default-badge.svg',
      awayTeamBadge: '/default-badge.svg',
      status: 'Not Started',
    },
    {
      id: '4',
      homeTeam: 'Inter Milan',
      awayTeam: 'Juventus',
      league: 'Serie A',
      kickoff: new Date(tomorrow.getTime() + 14400000).toISOString(), // Tomorrow + 4 hours
      venue: 'San Siro',
      homeTeamBadge: '/default-badge.svg',
      awayTeamBadge: '/default-badge.svg',
      status: 'Not Started',
    },
    {
      id: '5',
      homeTeam: 'PSG',
      awayTeam: 'Marseille',
      league: 'Ligue 1',
      kickoff: new Date(tomorrow.getTime() + 18000000).toISOString(), // Tomorrow + 5 hours
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
