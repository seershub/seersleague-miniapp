'use client';

import { useState } from 'react';
import { Clock, Users, DollarSign, Zap } from 'lucide-react';

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

  // Mock data for demo (in real app, this would come from props or API)
  const entryFee = 5;
  const participants = Math.floor(Math.random() * 2000) + 500;
  const prizePool = entryFee * participants;

  return (
    <div className="glass-effect-strong rounded-xl sm:rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 group border border-white/5 w-full">
      {/* Match Header */}
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/5 px-3 sm:px-4 md:px-6 py-3 border-b border-white/5">
        {/* Mobile: Stacked Layout */}
        <div className="flex flex-col gap-2 sm:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-400">⚽</span>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-white">
                {match.league}
              </span>
            </div>
            <div className="glass-effect px-2.5 py-1 rounded-full flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-green-400" />
              <span className="text-xs font-bold text-white">{entryFee}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-purple-400" />
              <span className="font-medium text-white">{participants}</span>
            </div>
          </div>
        </div>
        
        {/* Desktop: Single Row */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-400">⚽</span>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-white">
              {match.league}
            </span>
            <span className="text-xs text-gray-400 hidden md:inline">•</span>
            <div className="hidden md:flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-400">Starts at {time}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-medium text-white">{participants}</span>
            </div>
            <div className="glass-effect px-3 py-1 rounded-full flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-bold text-white">{entryFee} USDC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Match Content */}
      <div className="p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 md:gap-8">
          {/* Home Team */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 mb-2 sm:mb-3 md:mb-4 flex items-center justify-center">
              {match.homeTeamBadge && match.homeTeamBadge !== '/default-badge.svg' ? (
                <img
                  src={match.homeTeamBadge}
                  alt={`${match.homeTeam} logo`}
                  width={64}
                  height={64}
                  className="object-contain"
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))' }}
                  onError={(e) => {
                    console.log('Home team badge failed to load:', match.homeTeamBadge);
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center ${match.homeTeamBadge && match.homeTeamBadge !== '/default-badge.svg' ? 'hidden' : ''}`}>
                <span className="text-2xl">🏠</span>
              </div>
            </div>
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1">
              {match.homeTeam}
            </h3>
            <span className="text-xs text-gray-400 uppercase tracking-wider hidden sm:inline">Home</span>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4">
            <div className="relative">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full glass-effect border-2 border-cyan-400/30 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-black text-cyan-400">VS</span>
              </div>
            </div>

            {/* Prize Pool */}
            <div className="glass-effect px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg border border-green-400/20">
              <div className="text-xs text-gray-400 mb-0.5 text-center hidden sm:block">Prize Pool</div>
              <div className="text-sm sm:text-base md:text-lg font-bold text-green-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-base">{prizePool.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 mb-2 sm:mb-3 md:mb-4 flex items-center justify-center">
              {match.awayTeamBadge && match.awayTeamBadge !== '/default-badge.svg' ? (
                <img
                  src={match.awayTeamBadge}
                  alt={`${match.awayTeam} logo`}
                  width={64}
                  height={64}
                  className="object-contain"
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))' }}
                  onError={(e) => {
                    console.log('Away team badge failed to load:', match.awayTeamBadge);
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center ${match.awayTeamBadge && match.awayTeamBadge !== '/default-badge.svg' ? 'hidden' : ''}`}>
                <span className="text-2xl">✈️</span>
              </div>
            </div>
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1">
              {match.awayTeam}
            </h3>
            <span className="text-xs text-gray-400 uppercase tracking-wider hidden sm:inline">Away</span>
          </div>
        </div>

        {/* Prediction Buttons */}
        <div className="mt-4 sm:mt-6 md:mt-8">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => {
                setSelected('home');
                onOutcomeSelect(1);
              }}
              disabled={disabled}
              className={`py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                selectedOutcome === 1 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 scale-105' 
                  : 'bg-gray-800 border-2 border-gray-700 text-gray-300 hover:text-white hover:border-blue-500/50 hover:bg-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Home
            </button>
            <button
              onClick={() => {
                setSelected('draw');
                onOutcomeSelect(2);
              }}
              disabled={disabled}
              className={`py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                selectedOutcome === 2 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 scale-105' 
                  : 'bg-gray-800 border-2 border-gray-700 text-gray-300 hover:text-white hover:border-blue-500/50 hover:bg-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Draw
            </button>
            <button
              onClick={() => {
                setSelected('away');
                onOutcomeSelect(3);
              }}
              disabled={disabled}
              className={`py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                selectedOutcome === 3 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 scale-105' 
                  : 'bg-gray-800 border-2 border-gray-700 text-gray-300 hover:text-white hover:border-blue-500/50 hover:bg-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Away
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gradient-to-r from-blue-500/5 to-transparent px-3 sm:px-4 md:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/5">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs">Powered by Base Network</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Zap className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-gray-400">Instant settlement</span>
        </div>
      </div>
    </div>
  );
}