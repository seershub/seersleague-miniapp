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
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6 hover:border-yellow-500/30 transition-all duration-300 group">
      
      {/* League Badge & Time */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider bg-yellow-500/10 px-3 py-1.5 rounded-full">
          {match.league}
        </span>
        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold">{time}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-900/50 border border-gray-700 hover:border-yellow-500/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600 group-hover:border-yellow-500/50 transition-colors duration-300">
              <span className="text-xl">🏠</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">HOME</p>
              <p className="font-bold text-white text-base">{match.homeTeam}</p>
            </div>
          </div>
        </div>

        <div className="px-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <span className="text-xs font-black text-black">VS</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-end gap-4 p-4 rounded-xl bg-gray-900/50 border border-gray-700 hover:border-yellow-500/30 transition-all duration-300">
            <div className="text-right">
              <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">AWAY</p>
              <p className="font-bold text-white text-base">{match.awayTeam}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600 group-hover:border-yellow-500/50 transition-colors duration-300">
              <span className="text-xl">✈️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prediction Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => {
            setSelected('home');
            onOutcomeSelect(1);
          }}
          disabled={disabled}
          className={`py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
            selectedOutcome === 1 
              ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/30 scale-105' 
              : 'bg-gray-700 border-2 border-gray-600 text-gray-300 hover:text-white hover:border-yellow-500/50 hover:bg-gray-600'
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
              ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/30 scale-105' 
              : 'bg-gray-700 border-2 border-gray-600 text-gray-300 hover:text-white hover:border-yellow-500/50 hover:bg-gray-600'
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
              ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/30 scale-105' 
              : 'bg-gray-700 border-2 border-gray-600 text-gray-300 hover:text-white hover:border-yellow-500/50 hover:bg-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Away
        </button>
      </div>

      {/* Selection Indicator */}
      {selectedOutcome && (
        <div className="mt-4 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/30">
            <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
            <span className="text-xs font-bold text-black uppercase tracking-wider">
              Locked
            </span>
          </div>
        </div>
      )}

    </div>
  );
}