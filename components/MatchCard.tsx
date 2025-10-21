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
    <div className="bg-zinc-900/40 backdrop-blur-sm rounded-3xl p-6 border border-white/10 hover:border-gold-600/40 transition-all duration-300 group">
      
      {/* League Badge */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
          {match.league}
        </span>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/50 border border-white/5">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-bold text-gray-400">{time}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-black/50 border border-white/5">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-white/5">
              <span className="text-2xl">🏠</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1">HOME</p>
              <p className="font-black text-base">{match.homeTeam}</p>
            </div>
          </div>
        </div>

        <div className="px-5">
          <div className="w-12 h-12 rounded-full bg-gold-500/10 border-2 border-gold-500/30 flex items-center justify-center">
            <span className="text-xs font-black text-gold-500">VS</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-end gap-4 px-4 py-3 rounded-2xl bg-black/50 border border-white/5">
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1 text-right">AWAY</p>
              <p className="font-black text-base text-right">{match.awayTeam}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-white/5">
              <span className="text-2xl">✈️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prediction Buttons */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setSelected('home')}
          className={`py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300 ${
            selected === 'home'
              ? 'bg-gold-gradient text-black shadow-gold-glow scale-105'
              : 'bg-black/50 border-2 border-white/5 text-gray-400 hover:text-white hover:border-gold-600/40 hover:bg-black/70'
          }`}
        >
          Home
        </button>
        <button
          onClick={() => setSelected('draw')}
          className={`py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300 ${
            selected === 'draw'
              ? 'bg-gold-gradient text-black shadow-gold-glow scale-105'
              : 'bg-black/50 border-2 border-white/5 text-gray-400 hover:text-white hover:border-gold-600/40 hover:bg-black/70'
          }`}
        >
          Draw
        </button>
        <button
          onClick={() => setSelected('away')}
          className={`py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300 ${
            selected === 'away'
              ? 'bg-gold-gradient text-black shadow-gold-glow scale-105'
              : 'bg-black/50 border-2 border-white/5 text-gray-400 hover:text-white hover:border-gold-600/40 hover:bg-black/70'
          }`}
        >
          Away
        </button>
      </div>

      {selected && (
        <div className="mt-5 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/30">
            <div className="w-2 h-2 bg-gold-500 rounded-full animate-pulse" />
            <span className="text-xs font-black text-gold-500 uppercase tracking-wider">
              Locked In
            </span>
          </div>
        </div>
      )}

    </div>
  );
}