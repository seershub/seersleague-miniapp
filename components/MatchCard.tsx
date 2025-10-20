'use client';

import { Match, formatMatchTime } from '@/lib/matches';
import Image from 'next/image';
import { Clock, ChevronRight } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  selectedOutcome?: 1 | 2 | 3 | 0;
  onOutcomeSelect: (outcome: 1 | 2 | 3) => void;
  disabled?: boolean;
}

export function MatchCard({ 
  match, 
  selectedOutcome, 
  onOutcomeSelect, 
  disabled = false 
}: MatchCardProps) {
  const kickoffTime = formatMatchTime(match.kickoff);
  
  return (
    <div className="bg-surface rounded-xl p-6 border border-surface-light/20 hover:border-primary-500/30 transition-all duration-200 animate-slide-up">
      {/* League Badge & Time */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs bg-surface-light px-3 py-1.5 rounded-full text-gray-300 font-medium">
          {match.league}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          {kickoffTime}
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 relative">
            <Image
              src={match.homeTeamBadge}
              alt={`${match.homeTeam} badge`}
              fill
              className="object-contain"
              onError={(e) => {
                e.currentTarget.src = '/default-badge.png';
              }}
            />
          </div>
          <span className="font-semibold text-white">🏠 {match.homeTeam}</span>
        </div>
        
        <div className="text-gray-400 mx-4 font-bold text-sm">VS</div>
        
        <div className="flex items-center gap-3 flex-1 justify-end">
          <span className="font-semibold text-white">{match.awayTeam} ✈️</span>
          <div className="w-10 h-10 relative">
            <Image
              src={match.awayTeamBadge}
              alt={`${match.awayTeam} badge`}
              fill
              className="object-contain"
              onError={(e) => {
                e.currentTarget.src = '/default-badge.png';
              }}
            />
          </div>
        </div>
      </div>

      {/* Prediction Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onOutcomeSelect(1)}
          disabled={disabled}
          className={`group/btn py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
            selectedOutcome === 1
              ? 'bg-gradient-gold text-black shadow-glow-gold scale-105'
              : 'bg-surface-lighter/50 hover:bg-surface-light text-gray-400 hover:text-white border border-white/5 hover:border-primary-500/30'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className={selectedOutcome === 1 ? '' : 'group-hover/btn:scale-110 inline-block transition-transform'}>
            Home
          </span>
        </button>
        
        <button
          onClick={() => onOutcomeSelect(2)}
          disabled={disabled}
          className={`group/btn py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
            selectedOutcome === 2
              ? 'bg-gradient-gold text-black shadow-glow-gold scale-105'
              : 'bg-surface-lighter/50 hover:bg-surface-light text-gray-400 hover:text-white border border-white/5 hover:border-primary-500/30'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className={selectedOutcome === 2 ? '' : 'group-hover/btn:scale-110 inline-block transition-transform'}>
            Draw
          </span>
        </button>
        
        <button
          onClick={() => onOutcomeSelect(3)}
          disabled={disabled}
          className={`group/btn py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
            selectedOutcome === 3
              ? 'bg-gradient-gold text-black shadow-glow-gold scale-105'
              : 'bg-surface-lighter/50 hover:bg-surface-light text-gray-400 hover:text-white border border-white/5 hover:border-primary-500/30'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className={selectedOutcome === 3 ? '' : 'group-hover/btn:scale-110 inline-block transition-transform'}>
            Away
          </span>
        </button>
      </div>

      {/* Selected Indicator */}
      {selectedOutcome && selectedOutcome > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-primary-500 text-sm font-medium">
          <ChevronRight className="w-4 h-4" />
          Prediction selected
        </div>
      )}
    </div>
  );
}
