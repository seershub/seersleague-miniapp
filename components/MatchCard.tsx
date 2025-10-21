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
}

export function MatchCard({ match }: MatchCardProps) {
  const [selected, setSelected] = useState<'home' | 'draw' | 'away' | null>(null);

  const time = new Date(match.kickoff).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="bg-surface/60 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-gold-600/30 transition-all">
      
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {match.league}
        </span>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{time}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div className="flex-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-black/50 border border-white/5">
            <div className="w-9 h-9 rounded-full bg-surface-light flex items-center justify-center">
              <span className="text-lg">🏠</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Home</p>
              <p className="font-bold text-sm mt-0.5">{match.homeTeam}</p>
            </div>
          </div>
        </div>

        <div className="px-4">
          <div className="w-8 h-8 rounded-full bg-gold-500/5 flex items-center justify-center">
            <span className="text-xs font-black text-gold-500">VS</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-end gap-3 px-3 py-2.5 rounded-xl bg-black/50 border border-white/5">
            <div>
              <p className="text-xs text-gray-500 text-right">Away</p>
              <p className="font-bold text-sm mt-0.5 text-right">{match.awayTeam}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-surface-light flex items-center justify-center">
              <span className="text-lg">✈️</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setSelected('home')}
          className={`py-3.5 rounded-xl font-bold text-sm transition-all ${
            selected === 'home'
              ? 'bg-gold-gradient text-black shadow-gold-glow'
              : 'bg-black/50 border border-white/5 text-gray-400 hover:text-white hover:border-gold-600/30'
          }`}
        >
          HOME
        </button>
        <button
          onClick={() => setSelected('draw')}
          className={`py-3.5 rounded-xl font-bold text-sm transition-all ${
            selected === 'draw'
              ? 'bg-gold-gradient text-black shadow-gold-glow'
              : 'bg-black/50 border border-white/5 text-gray-400 hover:text-white hover:border-gold-600/30'
          }`}
        >
          DRAW
        </button>
        <button
          onClick={() => setSelected('away')}
          className={`py-3.5 rounded-xl font-bold text-sm transition-all ${
            selected === 'away'
              ? 'bg-gold-gradient text-black shadow-gold-glow'
              : 'bg-black/50 border border-white/5 text-gray-400 hover:text-white hover:border-gold-600/30'
          }`}
        >
          AWAY
        </button>
      </div>

      {selected && (
        <div className="mt-3 text-center">
          <span className="text-xs font-semibold text-gold-500">✓ Selected</span>
        </div>
      )}

    </div>
  );
}
