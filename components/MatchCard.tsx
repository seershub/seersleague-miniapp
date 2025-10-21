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
    <div className="bg-[#0C0C0C] border border-[#1B1A1A] rounded-xl p-6 hover:border-yellow-500/30 transition-all duration-300 group">
      
      {/* League Badge & Time */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider bg-yellow-500/10 px-3 py-1.5 rounded-full">
          {match.league}
        </span>
        <div className="flex items-center gap-2 text-[#A8A8A8]">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold">{time}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#1B1A1A] border border-[#252525] hover:border-yellow-500/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-[#252525] flex items-center justify-center border-2 border-[#1B1A1A] group-hover:border-yellow-500/50 transition-colors duration-300">
              <span className="text-xl">🏠</span>
            </div>
            <div>
              <p className="text-xs text-[#A8A8A8] font-semibold mb-1 uppercase tracking-wider">HOME</p>
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
          <div className="flex items-center justify-end gap-4 p-4 rounded-xl bg-[#1B1A1A] border border-[#252525] hover:border-yellow-500/30 transition-all duration-300">
            <div className="text-right">
              <p className="text-xs text-[#A8A8A8] font-semibold mb-1 uppercase tracking-wider">AWAY</p>
              <p className="font-bold text-white text-base">{match.awayTeam}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#252525] flex items-center justify-center border-2 border-[#1B1A1A] group-hover:border-yellow-500/50 transition-colors duration-300">
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
              : 'bg-[#252525] border-2 border-[#1B1A1A] text-[#A8A8A8] hover:text-white hover:border-yellow-500/50 hover:bg-[#1B1A1A]'
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
              : 'bg-[#252525] border-2 border-[#1B1A1A] text-[#A8A8A8] hover:text-white hover:border-yellow-500/50 hover:bg-[#1B1A1A]'
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
              : 'bg-[#252525] border-2 border-[#1B1A1A] text-[#A8A8A8] hover:text-white hover:border-yellow-500/50 hover:bg-[#1B1A1A]'
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