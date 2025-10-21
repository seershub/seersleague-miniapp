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
    <div className="group relative overflow-hidden bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl rounded-3xl p-8 border border-gold-500/20 hover:border-gold-500/40 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-gold-500/10">
      
      {/* GLASSMORPHISM EFFECT */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl"></div>
      
      {/* LEAGUE BADGE - DRAMATIC */}
      <div className="relative flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-gold-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-black text-gold-500 uppercase tracking-widest">
            {match.league}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 rounded-full border border-gold-500/20">
          <Clock className="w-4 h-4 text-gold-500" />
          <span className="text-sm font-bold text-white">{time}</span>
        </div>
      </div>

      {/* TEAMS - DRAMATIC LAYOUT */}
      <div className="relative mb-8">
        <div className="flex items-center justify-between">
          {/* HOME TEAM */}
          <div className="flex-1 text-center">
            <div className="inline-flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl border border-white/10 hover:border-gold-500/30 transition-all">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-500/20 to-gold-600/20 flex items-center justify-center border border-gold-500/30">
                <span className="text-2xl">🏠</span>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-gold-500 uppercase tracking-wider">HOME</p>
                <p className="text-lg font-black text-white mt-1">{match.homeTeam}</p>
              </div>
            </div>
          </div>

          {/* VS DIVIDER */}
          <div className="px-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/25">
              <span className="text-xl font-black text-black">VS</span>
            </div>
          </div>

          {/* AWAY TEAM */}
          <div className="flex-1 text-center">
            <div className="inline-flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl border border-white/10 hover:border-gold-500/30 transition-all">
              <div className="text-left">
                <p className="text-xs font-bold text-gold-500 uppercase tracking-wider">AWAY</p>
                <p className="text-lg font-black text-white mt-1">{match.awayTeam}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-500/20 to-gold-600/20 flex items-center justify-center border border-gold-500/30">
                <span className="text-2xl">✈️</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PREDICTION BUTTONS - DRAMATIC */}
      <div className="relative grid grid-cols-3 gap-4">
        <button
          onClick={() => setSelected('home')}
          className={`group/btn relative py-4 rounded-2xl font-black text-sm transition-all duration-300 transform ${
            selected === 'home'
              ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-black shadow-2xl shadow-gold-500/25 scale-105'
              : 'bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-white/10 text-gray-400 hover:text-white hover:border-gold-500/50 hover:scale-105'
          }`}
        >
          <span className="relative z-10">HOME</span>
          {selected === 'home' && (
            <div className="absolute inset-0 bg-gradient-to-r from-gold-500 to-gold-600 rounded-2xl animate-pulse"></div>
          )}
        </button>
        
        <button
          onClick={() => setSelected('draw')}
          className={`group/btn relative py-4 rounded-2xl font-black text-sm transition-all duration-300 transform ${
            selected === 'draw'
              ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-black shadow-2xl shadow-gold-500/25 scale-105'
              : 'bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-white/10 text-gray-400 hover:text-white hover:border-gold-500/50 hover:scale-105'
          }`}
        >
          <span className="relative z-10">DRAW</span>
          {selected === 'draw' && (
            <div className="absolute inset-0 bg-gradient-to-r from-gold-500 to-gold-600 rounded-2xl animate-pulse"></div>
          )}
        </button>
        
        <button
          onClick={() => setSelected('away')}
          className={`group/btn relative py-4 rounded-2xl font-black text-sm transition-all duration-300 transform ${
            selected === 'away'
              ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-black shadow-2xl shadow-gold-500/25 scale-105'
              : 'bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-white/10 text-gray-400 hover:text-white hover:border-gold-500/50 hover:scale-105'
          }`}
        >
          <span className="relative z-10">AWAY</span>
          {selected === 'away' && (
            <div className="absolute inset-0 bg-gradient-to-r from-gold-500 to-gold-600 rounded-2xl animate-pulse"></div>
          )}
        </button>
      </div>

      {/* SELECTED INDICATOR - DRAMATIC */}
      {selected && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500/20 to-gold-600/20 rounded-full border border-gold-500/30">
            <div className="w-2 h-2 bg-gold-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold text-gold-500">✓ PREDICTION SELECTED</span>
          </div>
        </div>
      )}

    </div>
  );
}
