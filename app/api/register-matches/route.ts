import { NextResponse } from 'next/server';

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';
const API_KEY = 'ab4bf8eeaf614f969dfe8de37c58107d';

// Competition IDs for Football-Data.org
const COMPETITION_IDS = {
  PREMIER_LEAGUE: 'PL',
  LA_LIGA: 'PD',
  BUNDESLIGA: 'BL1',
  SERIE_A: 'SA',
  LIGUE_1: 'FL1',
  TURKISH_SUPER_LIG: 'TSL',
  CHAMPIONS_LEAGUE: 'CL',
  EUROPA_LEAGUE: 'EL',
};

export async function POST() {
  console.log('=== REGISTERING MATCHES FOR PREDICTION ===');
  
  try {
    const allMatches = [];
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Priority competitions to fetch from
    const priorityCompetitions = [
      { name: 'PREMIER_LEAGUE', id: COMPETITION_IDS.PREMIER_LEAGUE },
      { name: 'LA_LIGA', id: COMPETITION_IDS.LA_LIGA },
      { name: 'BUNDESLIGA', id: COMPETITION_IDS.BUNDESLIGA },
      { name: 'SERIE_A', id: COMPETITION_IDS.SERIE_A },
      { name: 'LIGUE_1', id: COMPETITION_IDS.LIGUE_1 },
      { name: 'TURKISH_SUPER_LIG', id: COMPETITION_IDS.TURKISH_SUPER_LIG },
      { name: 'CHAMPIONS_LEAGUE', id: COMPETITION_IDS.CHAMPIONS_LEAGUE },
      { name: 'EUROPA_LEAGUE', id: COMPETITION_IDS.EUROPA_LEAGUE },
    ];
    
    // Fetch matches from all competitions
    for (const competition of priorityCompetitions) {
      try {
        // Fetch today's matches
        const todayUrl = `${FOOTBALL_DATA_BASE}/competitions/${competition.id}/matches?date=${today}&status=SCHEDULED`;
        console.log(`Fetching ${competition.name} for today: ${todayUrl}`);
        
        const todayResponse = await fetch(todayUrl, {
          headers: {
            'X-Auth-Token': API_KEY,
          },
        });
        
        if (todayResponse.ok) {
          const todayData = await todayResponse.json();
          console.log(`✅ Today's ${competition.name} matches:`, todayData.matches?.length || 0);
          
          if (todayData.matches && Array.isArray(todayData.matches)) {
            const matches = todayData.matches.map((match: any) => ({
              id: parseInt(match.id),
              startTime: Math.floor(new Date(match.utcDate).getTime() / 1000), // Convert to UNIX timestamp
            }));
            
            allMatches.push(...matches);
          }
        } else {
          console.error(`❌ Failed to fetch ${competition.name} today:`, todayResponse.status);
        }
        
        // Fetch tomorrow's matches
        const tomorrowUrl = `${FOOTBALL_DATA_BASE}/competitions/${competition.id}/matches?date=${tomorrowStr}&status=SCHEDULED`;
        console.log(`Fetching ${competition.name} for tomorrow: ${tomorrowUrl}`);
        
        const tomorrowResponse = await fetch(tomorrowUrl, {
          headers: {
            'X-Auth-Token': API_KEY,
          },
        });
        
        if (tomorrowResponse.ok) {
          const tomorrowData = await tomorrowResponse.json();
          console.log(`✅ Tomorrow's ${competition.name} matches:`, tomorrowData.matches?.length || 0);
          
          if (tomorrowData.matches && Array.isArray(tomorrowData.matches)) {
            const matches = tomorrowData.matches.map((match: any) => ({
              id: parseInt(match.id),
              startTime: Math.floor(new Date(match.utcDate).getTime() / 1000), // Convert to UNIX timestamp
            }));
            
            allMatches.push(...matches);
          }
        } else {
          console.error(`❌ Failed to fetch ${competition.name} tomorrow:`, tomorrowResponse.status);
        }
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Error fetching ${competition.name}:`, error);
      }
    }
    
    console.log('Total matches found:', allMatches.length);
    
    // Remove duplicates and sort by start time
    const uniqueMatches = allMatches.filter((match, index, self) => 
      index === self.findIndex(m => m.id === match.id)
    );
    
    uniqueMatches.sort((a, b) => a.startTime - b.startTime);
    
    console.log('Unique matches:', uniqueMatches.length);
    
    // TODO: Call smart contract registerMatches function
    // This would require contract interaction logic
    
    return NextResponse.json({
      success: true,
      matchesFound: uniqueMatches.length,
      matches: uniqueMatches,
      message: 'Matches prepared for registration (contract call needed)'
    });
    
  } catch (error) {
    console.error('Error in register-matches:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
