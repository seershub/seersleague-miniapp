'use client';

import { useState } from 'react';
import { Clock, Users, Zap, Trophy } from 'lucide-react';

interface MatchCardProps {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    league: string;
    kickoff: string;
    homeTeamBadge?: string;
    awayTeamBadge?: string;
  };
  selectedOutcome?: 1 | 2 | 3 | 0;
  onOutcomeSelect: (outcome: 1 | 2 | 3) => void;
  disabled?: boolean;
}

export function MatchCard({ match, selectedOutcome, onOutcomeSelect, disabled = false }: MatchCardProps) {
  const [selected, setSelected] = useState<'home' | 'draw' | 'away' | null>(null);
  const time = new Date(match.kickoff).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Mock data (will be replaced with real API data)
  const entryFee = 5;
  const participants = Math.floor(Math.random() * 2000) + 500;
  const prizePool = entryFee * participants;

  return (
    <div className="match-card">
      {/* Match Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-[rgba(255,255,255,0.04)] bg-[rgba(24,24,30,0.5)]">
        {/* Mobile: Stacked Layout */}
        <div className="flex flex-col gap-2 sm:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[rgba(245,158,11,0.15)] flex items-center justify-center border border-[rgba(245,158,11,0.2)]">
                <Trophy className="w-3 h-3 text-[rgb(var(--brand-gold))]" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-white">
                {match.league}
              </span>
            </div>
            <div className="badge-gold">
              <span className="font-semibold">${entryFee}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[rgb(var(--text-muted))]">
              <Clock className="w-3 h-3" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-[rgb(var(--brand-cyan))]" />
              <span className="font-medium text-white">{participants.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Desktop: Single Row */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[rgba(245,158,11,0.1)] flex items-center justify-center border border-[rgba(245,158,11,0.15)]">
              <Trophy className="w-3.5 h-3.5 text-[rgb(var(--brand-gold))]" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-white">
              {match.league}
            </span>
            <span className="text-[rgb(var(--text-muted))]">•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[rgb(var(--text-muted))]" />
              <span className="text-xs text-[rgb(var(--text-muted))]">{time}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[rgb(var(--brand-cyan))]" />
              <span className="text-xs font-medium text-white">{participants.toLocaleString()}</span>
            </div>
            <div className="badge-gold">
              <span className="font-semibold">${entryFee} USDC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Match Content */}
      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
          {/* Home Team */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 flex items-center justify-center">
              {match.homeTeamBadge && match.homeTeamBadge !== '/default-badge.svg' ? (
                <img
                  src={match.homeTeamBadge}
                  alt={`${match.homeTeam} logo`}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-lg"
                  onError={(e) => {
                    console.log('Home team badge failed:', match.homeTeamBadge);
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[rgba(24,24,30,0.8)] border border-[rgba(55,55,65,0.5)] flex items-center justify-center ${match.homeTeamBadge && match.homeTeamBadge !== '/default-badge.svg' ? 'hidden' : ''}`}>
                <span className="text-xl font-bold text-[rgb(var(--text-muted))]">H</span>
              </div>
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-white mb-0.5 line-clamp-2">
              {match.homeTeam}
            </h3>
            <span className="text-[10px] text-[rgb(var(--text-muted))] uppercase tracking-wider hidden sm:inline">Home</span>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[rgba(24,24,30,0.9)] border border-[rgba(245,158,11,0.2)] flex items-center justify-center">
              <span className="text-xs sm:text-sm font-bold text-[rgb(var(--brand-gold))]">VS</span>
            </div>

            {/* Prize Pool */}
            <div className="px-3 py-2 rounded-xl bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.15)]">
              <div className="text-[10px] text-[rgb(var(--text-muted))] mb-0.5 text-center hidden sm:block">Pool</div>
              <div className="text-sm sm:text-base font-bold text-[rgb(var(--brand-green))] flex items-center gap-1">
                <span className="text-xs sm:text-sm">${prizePool.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 flex items-center justify-center">
              {match.awayTeamBadge && match.awayTeamBadge !== '/default-badge.svg' ? (
                <img
                  src={match.awayTeamBadge}
                  alt={`${match.awayTeam} logo`}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-lg"
                  onError={(e) => {
                    console.log('Away team badge failed:', match.awayTeamBadge);
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[rgba(24,24,30,0.8)] border border-[rgba(55,55,65,0.5)] flex items-center justify-center ${match.awayTeamBadge && match.awayTeamBadge !== '/default-badge.svg' ? 'hidden' : ''}`}>
                <span className="text-xl font-bold text-[rgb(var(--text-muted))]">A</span>
              </div>
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-white mb-0.5 line-clamp-2">
              {match.awayTeam}
            </h3>
            <span className="text-[10px] text-[rgb(var(--text-muted))] uppercase tracking-wider hidden sm:inline">Away</span>
          </div>
        </div>

        {/* Prediction Buttons */}
        <div className="mt-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={() => {
                setSelected('home');
                onOutcomeSelect(1);
              }}
              disabled={disabled}
              className={`btn-outcome ${selectedOutcome === 1 ? 'active' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Home
            </button>
            <button
              onClick={() => {
                setSelected('draw');
                onOutcomeSelect(2);
              }}
              disabled={disabled}
              className={`btn-outcome ${selectedOutcome === 2 ? 'active' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Draw
            </button>
            <button
              onClick={() => {
                setSelected('away');
                onOutcomeSelect(3);
              }}
              disabled={disabled}
              className={`btn-outcome ${selectedOutcome === 3 ? 'active' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Away
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-5 py-3 flex items-center justify-between border-t border-[rgba(255,255,255,0.04)] bg-[rgba(17,17,21,0.5)]">
        <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
          <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--brand-gold))]" />
          <span>Powered by Base</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--text-muted))]">
          <Zap className="w-3 h-3 text-[rgb(var(--brand-cyan))]" />
          <span>Instant settlement</span>
        </div>
      </div>
    </div>
  );
}