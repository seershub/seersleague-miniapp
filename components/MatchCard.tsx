'use client';

import { Match, formatMatchTime } from '@/lib/matches';
import Image from 'next/image';

interface MatchCardProps {
  match: Match;
  selectedOutcome?: number;
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
    <div className="match-card">
      {/* Match Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-gray-700 px-2 py-1 rounded">
            {match.league}
          </span>
          <span className="text-xs text-gray-400">
            {kickoffTime}
          </span>
        </div>
        <div className="text-xs text-gray-400">
          {match.venue}
        </div>
      </div>
      
      {/* Teams */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-8 h-8 relative">
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
          <span className="font-semibold text-sm">{match.homeTeam}</span>
        </div>
        
        <div className="text-gray-400 mx-4">vs</div>
        
        <div className="flex items-center space-x-3 flex-1 justify-end">
          <span className="font-semibold text-sm">{match.awayTeam}</span>
          <div className="w-8 h-8 relative">
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
      
      {/* Prediction Options */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onOutcomeSelect(1)}
          disabled={disabled}
          className={`prediction-option ${
            selectedOutcome === 1 ? 'selected' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="text-sm font-semibold">Home</div>
          <div className="text-xs text-gray-400">{match.homeTeam}</div>
        </button>
        
        <button
          onClick={() => onOutcomeSelect(2)}
          disabled={disabled}
          className={`prediction-option ${
            selectedOutcome === 2 ? 'selected' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="text-sm font-semibold">Draw</div>
          <div className="text-xs text-gray-400">X</div>
        </button>
        
        <button
          onClick={() => onOutcomeSelect(3)}
          disabled={disabled}
          className={`prediction-option ${
            selectedOutcome === 3 ? 'selected' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="text-sm font-semibold">Away</div>
          <div className="text-xs text-gray-400">{match.awayTeam}</div>
        </button>
      </div>
    </div>
  );
}
