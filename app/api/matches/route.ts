import { NextResponse } from 'next/server'
import { CONTRACTS } from '@/lib/contract-interactions'
import { SEERSLEAGUE_ABI } from '@/lib/contracts/abi-new'
import { createWalletClient, http } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4'
const API_KEY = 'ab4bf8eeaf614f969dfe8de37c58107d'

const priorityCompetitions = [
  { name: 'PREMIER_LEAGUE', id: 'PL' },
  { name: 'LA_LIGA', id: 'PD' },
  { name: 'BUNDESLIGA', id: 'BL1' },
  { name: 'SERIE_A', id: 'SA' },
  { name: 'LIGUE_1', id: 'FL1' },
  { name: 'TURKISH_SUPER_LIG', id: 'TSL' },
  { name: 'CHAMPIONS_LEAGUE', id: 'CL' },
  { name: 'EUROPA_LEAGUE', id: 'EL' },
]

function toUnixSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000)
}

async function ensureRegistered(matchIds: bigint[], startTimes: bigint[]) {
  try {
    const pk = process.env.PRIVATE_KEY
    if (!pk) return { registered: false }
    const account = privateKeyToAccount(pk as `0x${string}`)
    const rpc = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org'
    const wallet = createWalletClient({ account, chain: base, transport: http(rpc) })
    await wallet.writeContract({
      address: CONTRACTS.SEERSLEAGUE,
      abi: SEERSLEAGUE_ABI,
      functionName: 'registerMatches',
      args: [matchIds, startTimes],
    })
    return { registered: true }
  } catch (e) {
    return { registered: false, error: (e as Error).message }
  }
}

export async function GET() {
  try {
    const all: any[] = []
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    for (const c of priorityCompetitions) {
      const url = `${FOOTBALL_DATA_BASE}/competitions/${c.id}/matches?date=${today}&status=SCHEDULED`
      const res = await fetch(url, { headers: { 'X-Auth-Token': API_KEY } })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.matches)) {
          const m = data.matches.map((match: any) => ({
            id: match.id.toString(),
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            league: match.competition.name,
            kickoff: match.utcDate,
            venue: match.venue || 'TBA',
            homeTeamBadge: match.homeTeam.crest || '/default-badge.svg',
            awayTeamBadge: match.awayTeam.crest || '/default-badge.svg',
            status: match.status === 'SCHEDULED' ? 'Not Started' : match.status,
          }))
          all.push(...m)
        }
      }
      await new Promise(r => setTimeout(r, 150))
      if (all.length >= 5) break
    }

    if (all.length < 5) {
      for (const c of priorityCompetitions) {
        const url = `${FOOTBALL_DATA_BASE}/competitions/${c.id}/matches?date=${tomorrowStr}&status=SCHEDULED`
        const res = await fetch(url, { headers: { 'X-Auth-Token': API_KEY } })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.matches)) {
            const m = data.matches.map((match: any) => ({
              id: match.id.toString(),
              homeTeam: match.homeTeam.name,
              awayTeam: match.awayTeam.name,
              league: match.competition.name,
              kickoff: match.utcDate,
              venue: match.venue || 'TBA',
              homeTeamBadge: match.homeTeam.crest || '/default-badge.svg',
              awayTeamBadge: match.awayTeam.crest || '/default-badge.svg',
              status: match.status === 'SCHEDULED' ? 'Not Started' : match.status,
            }))
            all.push(...m)
          }
        }
        await new Promise(r => setTimeout(r, 150))
        if (all.length >= 5) break
      }
    }

    const featured = all
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .filter(m => new Date(m.kickoff).getTime() > Date.now())
      .slice(0, 5)

    if (featured.length > 0) {
      const ids = featured.map(m => BigInt(parseInt(m.id)))
      const times = featured.map(m => BigInt(toUnixSeconds(m.kickoff)))
      await ensureRegistered(ids, times)
    }

    return NextResponse.json(featured)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
