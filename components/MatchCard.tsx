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
    <div className="match-card group animate-slide-up">
      
      {/* League Badge & Time */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-gold-400 uppercase tracking-wider bg-gold-500/10 px-3 py-1.5 rounded-full">
          {match.league}
        </span>
        <div className="flex items-center gap-2 text-surface-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold">{time}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-800/50 border border-surface-700 hover:border-gold-500/30 transition-all duration-300">
            <div className="w-14 h-14 rounded-full bg-surface-700 flex items-center justify-center border-2 border-surface-600 group-hover:border-gold-500/50 transition-colors duration-300">
              <span className="text-2xl">🏠</span>
            </div>
            <div>
              <p className="text-xs text-surface-500 font-semibold mb-1 uppercase tracking-wider">HOME</p>
              <p className="font-bold text-white text-lg">{match.homeTeam}</p>
            </div>
          </div>
        </div>

        <div className="px-6">
          <div className="w-16 h-16 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold-glow animate-pulse-glow">
            <span className="text-sm font-black text-black">VS</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-end gap-4 p-4 rounded-xl bg-surface-800/50 border border-surface-700 hover:border-gold-500/30 transition-all duration-300">
            <div className="text-right">
              <p className="text-xs text-surface-500 font-semibold mb-1 uppercase tracking-wider">AWAY</p>
              <p className="font-bold text-white text-lg">{match.awayTeam}</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-surface-700 flex items-center justify-center border-2 border-surface-600 group-hover:border-gold-500/50 transition-colors duration-300">
              <span className="text-2xl">✈️</span>
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
          className={`prediction-option ${
            selectedOutcome === 1 ? 'selected' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="font-bold">Home</span>
        </button>
        <button
          onClick={() => {
            setSelected('draw');
            onOutcomeSelect(2);
          }}
          disabled={disabled}
          className={`prediction-option ${
            selectedOutcome === 2 ? 'selected' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="font-bold">Draw</span>
        </button>
        <button
          onClick={() => {
            setSelected('away');
            onOutcomeSelect(3);
          }}
          disabled={disabled}
          className={`prediction-option ${
            selectedOutcome === 3 ? 'selected' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="font-bold">Away</span>
        </button>
      </div>

      {/* Selection Indicator */}
      {selectedOutcome && (
        <div className="mt-6 text-center animate-fade-in">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gold-gradient shadow-gold-glow">
            <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
            <span className="text-sm font-bold text-black uppercase tracking-wider">
              Prediction Locked
            </span>
          </div>
        </div>
      )}

    </div>
  );
}