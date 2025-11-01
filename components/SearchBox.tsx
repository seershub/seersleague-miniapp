'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Match } from '@/lib/matches';

interface SearchBoxProps {
  matches: Match[];
  onSearchResults: (filteredMatches: Match[]) => void;
}

export function SearchBox({ matches, onSearchResults }: SearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Use useMemo to calculate filtered matches without causing re-renders
  const filteredMatches = useMemo(() => {
    if (!searchTerm.trim()) {
      return matches;
    }

    const searchLower = searchTerm.toLowerCase();
    return matches.filter(match =>
      match.homeTeam.toLowerCase().includes(searchLower) ||
      match.awayTeam.toLowerCase().includes(searchLower) ||
      match.league.toLowerCase().includes(searchLower)
    );
  }, [searchTerm, matches]);

  // Only call onSearchResults when filtered results actually change
  useEffect(() => {
    onSearchResults(filteredMatches);
  }, [filteredMatches]); // Removed onSearchResults from dependencies to prevent loop

  const clearSearch = () => {
    setSearchTerm(''); // useEffect will automatically update filteredMatches
  };

  return (
    <div className="relative max-w-2xl mx-auto mb-8">
      {/* Search Input */}
      <div className={`relative transition-all duration-300 ${
        isFocused ? 'scale-105' : 'scale-100'
      }`}>
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className={`w-5 h-5 transition-colors duration-200 ${
            isFocused ? 'text-yellow-400' : 'text-gray-500'
          }`} />
        </div>
        
        <input
          type="text"
          placeholder="Search teams or leagues..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full pl-12 pr-12 py-4 bg-gray-900/50 border-2 rounded-2xl text-white placeholder-gray-400 focus:outline-none transition-all duration-300 ${
            isFocused 
              ? 'border-yellow-500/50 bg-gray-900/70 shadow-lg shadow-yellow-500/20' 
              : 'border-yellow-400/50 hover:border-yellow-400/70'
          }`}
        />
        
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Results Count */}
      {searchTerm && (
        <div className="mt-3 text-center">
          <span className="text-sm text-gray-400">
            {matches.filter(match => {
              const searchLower = searchTerm.toLowerCase();
              return (
                match.homeTeam.toLowerCase().includes(searchLower) ||
                match.awayTeam.toLowerCase().includes(searchLower) ||
                match.league.toLowerCase().includes(searchLower)
              );
            }).length} matches found
          </span>
        </div>
      )}

    </div>
  );
}
