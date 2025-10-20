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
const API_KEY = process.env.FOOTBALL_DATA_API_KEY || ''
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
  { name: 'EREDIVISIE', id: 'DED' },
  { name: 'PRIMEIRA_LIGA', id: 'PPL' },
  { name: 'BELGIAN_PRO', id: 'B1' },
  { name: 'SCOTTISH_PREMIER', id: 'SPL' },
  { name: 'MLS', id: 'MLS' },
]

function toUnixSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000)
}

function mockFallbackMatches(todayIso: string): any[] {
  const now = new Date()
  const mk = (offsetH: number, id: number, home: string, away: string, league: string, venue: string) => {
    const dt = new Date(now.getTime() + offsetH * 3600 * 1000)
    // Force same-day ISO if crosses midnight: fallback by replacing date part
    const iso = dt.toISOString()
    const kickoff = iso.slice(0, 10) === todayIso ? iso : `${todayIso}${iso.slice(10)}`
    return {
      id: id.toString(),
      homeTeam: home,
      awayTeam: away,
      league,
      kickoff,
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

async function ensureRegistered(matchIds: bigint[], startTimes: bigint[], allowWrite: boolean) {
  try {
    if (!ENABLE_AUTO_REGISTRATION || !allowWrite) return { registered: false, reason: 'auto-reg disabled' }
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

export async function GET(req: Request) {
  try {
    const all: any[] = []
    const today = new Date().toISOString().split('T')[0]
    // Only today’s matches will be considered
    const secret = process.env.REGISTER_SECRET || ''
    const allowWrite = !!secret && (req.headers.get('x-register-secret') === secret)

    const fetchWithTimeout = async (url: string, headers: Record<string, string>, ms = 3000) => {
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

    // Parallel fetch for today only (no tomorrow), only if API key provided
    if (API_KEY) {
      const todayUrls = priorityCompetitions.map(c => `${FOOTBALL_DATA_BASE}/competitions/${c.id}/matches?dateFrom=${today}&dateTo=${today}`)
      const todayRes = await Promise.allSettled(todayUrls.map(u => fetchWithTimeout(u, { 'X-Auth-Token': API_KEY })))
      for (const r of todayRes) {
        if (r.status === 'fulfilled' && r.value) {
          all.push(...mapMatches(r.value))
        }
      }
    }

    // No tomorrow fetch by design; keep strictly today

    let featured = all
      .filter(m => (!m.status || m.status === 'Not Started') && (m.kickoff?.slice(0,10) === today))
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .slice(0, 5)

    // If fewer than 5 from Football-Data, try to fill from SportsDB
    let usedFD = featured.length > 0
    let usedSportsDB = false
    let usedMock = false
    if (featured.length < 5) {
      try {
        const alt = await getTodayMatches()
        const seen = new Set(featured.map(m => String(parseInt(m.id))))
        const fill = alt
          .filter(m => m.status === 'Not Started' && (m.kickoff?.slice(0,10) === today))
          .filter(m => !seen.has(String(parseInt(m.id))))
          .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
        for (const m of fill) {
          if (featured.length >= 5) break
          featured.push(m)
        }
        if (fill.length > 0) usedSportsDB = true
      } catch {}
    }

    // If still fewer than 5, fill with mock
    if (featured.length < 5) {
      const mock = mockFallbackMatches(today)
      const seen = new Set(featured.map(m => String(parseInt(m.id))))
      for (const m of mock) {
        if (featured.length >= 5) break
        if (!seen.has(String(parseInt(m.id)))) featured.push(m)
      }
      usedMock = featured.length > 0
    }

    // Optional auto-registration (heavily gated): only when explicitly allowed via secret header
    if (featured.length > 0 && allowWrite) {
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
        if (regIds.length > 0) await ensureRegistered(regIds, regTimes, true)
      }
    }

    // Always return exactly 5 (or fewer if even mock failed)
    const parts = [] as string[]
    if (usedFD) parts.push('fd')
    if (usedSportsDB) parts.push('sportsdb')
    if (usedMock && !usedFD && !usedSportsDB) parts.push('mock')
    const sourceHeader = parts.join('+') || 'mock'
    return NextResponse.json(featured.slice(0, 5), { headers: { 'x-matches-source': sourceHeader } })

    // Final fallback (should rarely hit): static mock
    const mock = mockFallbackMatches(today)
    return NextResponse.json(mock, { headers: { 'x-matches-source': 'mock' } })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
