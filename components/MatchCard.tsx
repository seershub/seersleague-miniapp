'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';

interface MatchCardProps {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    league: string;
    kickoff: string;
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      
      {/* League Badge & Time */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
          {match.league}
        </span>
        <div className="flex items-center gap-1 text-gray-500">
          <Clock className="w-4 h-4" />
          <span className="text-sm">{time}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-lg">🏠</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">HOME</p>
              <p className="font-medium text-gray-900 text-sm">{match.homeTeam}</p>
            </div>
          </div>
        </div>

        <div className="px-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600">VS</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-end gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">AWAY</p>
              <p className="font-medium text-gray-900 text-sm">{match.awayTeam}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-lg">✈️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prediction Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            setSelected('home');
            onOutcomeSelect(1);
          }}
          disabled={disabled}
          className={`py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedOutcome === 1 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          className={`py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedOutcome === 2 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          className={`py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedOutcome === 3 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Away
        </button>
      </div>

      {/* Selection Indicator */}
      {selectedOutcome && (
        <div className="mt-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800">
            <div className="w-2 h-2 bg-blue-600 rounded-full" />
            <span className="text-xs font-medium">
              Selected
            </span>
          </div>
        </div>
      )}

    </div>
  );
}