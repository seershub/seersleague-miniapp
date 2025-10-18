'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  address: string;
  accuracy: number;
  totalPredictions: number;
  currentStreak: number;
  longestStreak: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Implement leaderboard fetching from contract
    // For now, show mock data
    const mockLeaderboard: LeaderboardEntry[] = [
      {
        rank: 1,
        address: '0x1234...5678',
        accuracy: 85,
        totalPredictions: 50,
        currentStreak: 8,
        longestStreak: 12
      },
      {
        rank: 2,
        address: '0x2345...6789',
        accuracy: 82,
        totalPredictions: 45,
        currentStreak: 5,
        longestStreak: 10
      },
      {
        rank: 3,
        address: '0x3456...7890',
        accuracy: 80,
        totalPredictions: 40,
        currentStreak: 3,
        longestStreak: 8
      }
    ];
    
    setTimeout(() => {
      setLeaderboard(mockLeaderboard);
      setLoading(false);
    }, 1000);
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-gray-400 font-bold">#{rank}</span>;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-blue-900 text-white">
      <div className="container mx-auto px-4 py-8 pb-20">
        
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 text-gradient">
            🏆 Leaderboard
          </h1>
          <p className="text-gray-300">
            Top performers this week
          </p>
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-base-blue">1,247</div>
            <div className="text-sm text-gray-400">Total Players</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-400">$3,500</div>
            <div className="text-sm text-gray-400">Weekly Prize Pool</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-purple-400">68%</div>
            <div className="text-sm text-gray-400">Average Accuracy</div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Top Performers</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="spinner"></div>
              <span className="ml-2 text-gray-400">Loading leaderboard...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <div
                  key={entry.address}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {entry.totalPredictions} predictions
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-base-blue">{entry.accuracy}%</div>
                      <div className="text-gray-400">Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-400">🔥 {entry.currentStreak}</div>
                      <div className="text-gray-400">Streak</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-purple-400">{entry.longestStreak}</div>
                      <div className="text-gray-400">Best</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prize Information */}
        <div className="mt-8 card">
          <h3 className="text-lg font-bold mb-4">Prize Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Weekly Prizes</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>🥇 1st Place: 15% of pool</li>
                <li>🥈 2nd Place: 12% of pool</li>
                <li>🥉 3rd Place: 10% of pool</li>
                <li>🏆 Top 10: 60% total</li>
                <li>🎯 Top 50: 30% total</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">How to Win</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Predict 5 matches daily</li>
                <li>• Build accuracy over time</li>
                <li>• Maintain winning streaks</li>
                <li>• Compete consistently</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
