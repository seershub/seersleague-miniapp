import { NextResponse } from 'next/server'
import { CONTRACTS } from '@/lib/contract-interactions'
import { SEERSLEAGUE_ABI } from '@/lib/contracts/abi-new'
import { getTodayMatches } from '@/lib/matches'
import { createWalletClient, createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4'
const API_KEY = 'ab4bf8eeaf614f969dfe8de37c58107d'
const ENABLE_AUTO_REGISTRATION = process.env.ENABLE_AUTO_REGISTRATION === 'true'
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org'

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

function mockFallbackMatches(): any[] {
  const baseTime = new Date()
  baseTime.setDate(baseTime.getDate() + 1)
  const mk = (offsetH: number, id: number, home: string, away: string, league: string, venue: string) => {
    const dt = new Date(baseTime.getTime() + offsetH * 3600 * 1000)
    return {
      id: id.toString(),
      homeTeam: home,
      awayTeam: away,
      league,
      kickoff: dt.toISOString(),
      venue,
      homeTeamBadge: '/default-badge.svg',
      awayTeamBadge: '/default-badge.svg',
      status: 'Not Started',
    }
  }
  return [
    mk(1, 900000001, 'Liverpool', 'Arsenal', 'Premier League', 'Anfield'),
    mk(3, 900000002, 'Real Madrid', 'Barcelona', 'La Liga', 'Bernabéu'),
    mk(5, 900000003, 'Bayern Munich', 'Borussia Dortmund', 'Bundesliga', 'Allianz Arena'),
    mk(7, 900000004, 'Inter', 'Juventus', 'Serie A', 'San Siro'),
    mk(9, 900000005, 'PSG', 'Marseille', 'Ligue 1', 'Parc des Princes'),
  ]
}

async function ensureRegistered(matchIds: bigint[], startTimes: bigint[]) {
  try {
    if (!ENABLE_AUTO_REGISTRATION) return { registered: false, reason: 'auto-reg disabled' }
    const pk = process.env.PRIVATE_KEY
    if (!pk) return { registered: false, reason: 'no private key' }
    const account = privateKeyToAccount(pk as `0x${string}`)
    const wallet = createWalletClient({ account, chain: base, transport: http(RPC_URL) })
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

async function filterUnregistered(ids: bigint[]) {
  try {
    const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) })
    const checks = await Promise.all(ids.map(async (id) => {
      try {
        const info = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getMatch',
          args: [id],
        }) as any
        return { id, exists: !!info?.exists }
      } catch {
        return { id, exists: false }
      }
    }))
    return checks.filter(c => !c.exists).map(c => c.id)
  } catch {
    // If read fails, avoid writing to be safe
    return []
  }
}

export async function GET() {
  try {
    const all: any[] = []
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const fetchWithTimeout = async (url: string, headers: Record<string, string>, ms = 2200) => {
      const ctrl = new AbortController()
      const id = setTimeout(() => ctrl.abort(), ms)
      try {
        const res = await fetch(url, { headers, signal: ctrl.signal })
        if (!res.ok) return null
        return await res.json()
      } catch {
        return null
      } finally {
        clearTimeout(id)
      }
    }

    const mapMatches = (data: any) => {
      if (!data || !Array.isArray(data.matches)) return [] as any[]
      return data.matches.map((match: any) => ({
        id: match.id.toString(),
        homeTeam: match.homeTeam?.name || 'TBA',
        awayTeam: match.awayTeam?.name || 'TBA',
        league: match.competition?.name || 'Unknown',
        kickoff: match.utcDate,
        venue: match.venue || 'TBA',
        homeTeamBadge: match.homeTeam?.crest || '/default-badge.svg',
        awayTeamBadge: match.awayTeam?.crest || '/default-badge.svg',
        status: (match.status === 'SCHEDULED' || match.status === 'TIMED') ? 'Not Started' : match.status,
      }))
    }

    // Parallel fetch for today
    const todayUrls = priorityCompetitions.map(c => `${FOOTBALL_DATA_BASE}/competitions/${c.id}/matches?dateFrom=${today}&dateTo=${today}`)
    const todayRes = await Promise.allSettled(todayUrls.map(u => fetchWithTimeout(u, { 'X-Auth-Token': API_KEY })))
    for (const r of todayRes) {
      if (r.status === 'fulfilled' && r.value) {
        all.push(...mapMatches(r.value))
      }
    }

    // If still <5, also parallel fetch tomorrow (timeboxed)
    if (all.length < 5) {
      const tmrUrls = priorityCompetitions.map(c => `${FOOTBALL_DATA_BASE}/competitions/${c.id}/matches?dateFrom=${tomorrowStr}&dateTo=${tomorrowStr}`)
      const tmrRes = await Promise.allSettled(tmrUrls.map(u => fetchWithTimeout(u, { 'X-Auth-Token': API_KEY })))
      for (const r of tmrRes) {
        if (r.status === 'fulfilled' && r.value) {
          all.push(...mapMatches(r.value))
        }
      }
    }

    const featured = all
      .filter(m => !m.status || m.status === 'Not Started')
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .slice(0, 5)

    if (featured.length > 0) {
      const ids = featured.map(m => BigInt(parseInt(m.id)))
      const times = featured.map(m => BigInt(toUnixSeconds(m.kickoff)))
      const idsToReg = await filterUnregistered(ids)
      if (idsToReg.length > 0) {
        const set = new Set(idsToReg.map(String))
        const regIds: bigint[] = []
        const regTimes: bigint[] = []
        ids.forEach((id, idx) => {
          if (set.has(String(id))) {
            regIds.push(id)
            regTimes.push(times[idx])
          }
        })
        if (regIds.length > 0) await ensureRegistered(regIds, regTimes)
      }
      return NextResponse.json(featured)
    }

    // Fallback to TheSportsDB if Football-Data provided no upcoming matches (today)
    try {
      const alt = await getTodayMatches()
      const altUpcoming = alt
        .filter(m => m.status === 'Not Started')
        .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
        .slice(0, 5)

      if (altUpcoming.length > 0) {
        const ids = altUpcoming.map(m => BigInt(parseInt(m.id)))
        const times = altUpcoming.map(m => BigInt(toUnixSeconds(m.kickoff)))
        const idsToReg = await filterUnregistered(ids)
        if (idsToReg.length > 0) {
          const set = new Set(idsToReg.map(String))
          const regIds: bigint[] = []
          const regTimes: bigint[] = []
          ids.forEach((id, idx) => {
            if (set.has(String(id))) {
              regIds.push(id)
              regTimes.push(times[idx])
            }
          })
          if (regIds.length > 0) await ensureRegistered(regIds, regTimes)
        }
        return NextResponse.json(altUpcoming)
      }
    } catch (e) {
      console.error('Fallback matches fetch failed:', e)
    }

    // Second fallback: use upcoming matches for next 3 days from TheSportsDB
    try {
      const { getUpcomingMatches } = await import('@/lib/matches')
      const ups = await getUpcomingMatches(3)
      const ups5 = ups
        .filter(m => m.status === 'Not Started')
        .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
        .slice(0, 5)
      if (ups5.length > 0) {
        const ids = ups5.map(m => BigInt(parseInt(m.id)))
        const times = ups5.map(m => BigInt(toUnixSeconds(m.kickoff)))
        const idsToReg = await filterUnregistered(ids)
        if (idsToReg.length > 0) {
          const set = new Set(idsToReg.map(String))
          const regIds: bigint[] = []
          const regTimes: bigint[] = []
          ids.forEach((id, idx) => {
            if (set.has(String(id))) {
              regIds.push(id)
              regTimes.push(times[idx])
            }
          })
          if (regIds.length > 0) await ensureRegistered(regIds, regTimes)
        }
        return NextResponse.json(ups5)
      }
    } catch (e) {
      console.error('Upcoming fallback fetch failed:', e)
    }

    // Final fallback: static mock to avoid empty UI and keep flow testable
    const mock = mockFallbackMatches()
    try {
      const ids = mock.map(m => BigInt(parseInt(m.id)))
      const times = mock.map(m => BigInt(toUnixSeconds(m.kickoff)))
      const idsToReg = await filterUnregistered(ids)
      if (idsToReg.length > 0) {
        const set = new Set(idsToReg.map(String))
        const regIds: bigint[] = []
        const regTimes: bigint[] = []
        ids.forEach((id, idx) => {
          if (set.has(String(id))) {
            regIds.push(id)
            regTimes.push(times[idx])
          }
        })
        if (regIds.length > 0) await ensureRegistered(regIds, regTimes)
      }
    } catch {}
    return NextResponse.json(mock)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
