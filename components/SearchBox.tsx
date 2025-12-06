'use client';

import { useState, useEffect } from 'react';
import { Match } from '@/lib/matches';
import { Search, X } from 'lucide-react';

interface SearchBoxProps {
  matches: Match[];
  onSearchResults: (results: Match[]) => void;
}

export function SearchBox({ matches, onSearchResults }: SearchBoxProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!query.trim()) {
      onSearchResults(matches);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const filtered = matches.filter(match =>
      match.homeTeam.toLowerCase().includes(searchTerm) ||
      match.awayTeam.toLowerCase().includes(searchTerm) ||
      match.league.toLowerCase().includes(searchTerm)
    );

    onSearchResults(filtered);
  }, [query, matches, onSearchResults]);

  const handleClear = () => {
    setQuery('');
    onSearchResults(matches);
  };

  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <Search className="w-4 h-4 text-[rgb(var(--text-muted))]" />
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search teams or leagues..."
        className="input-search pl-11 pr-10"
      />

      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
        >
          <X className="w-4 h-4 text-[rgb(var(--text-muted))]" />
        </button>
      )}
    </div>
  );
}
