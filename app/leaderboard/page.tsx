'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, Award, TrendingUp, Zap, Target } from 'lucide-react';
import { useMiniKit } from '@/components/MiniKitProvider';

interface LeaderboardEntry {
  rank: number;
  address: string;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  longestStreak: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  topPlayers: LeaderboardEntry[];
  userRank: LeaderboardEntry | null;
  totalPlayers: number;
  lastUpdated?: string;
}

export default function LeaderboardPage() {
  const { sdk, isReady } = useMiniKit();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  useEffect(() => {
    const getUserAddress = async () => {
      if (isReady && sdk) {
        try {
          const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            setUserAddress(accounts[0]);
          }
        } catch (error) {
          console.error('Error getting user address:', error);
        }
      }
    };

    getUserAddress();
  }, [isReady, sdk]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        console.log('Fetching leaderboard from main endpoint...');

        // Use main leaderboard endpoint (batched, optimized)
        const response = await fetch('/api/leaderboard');
        if (!response.ok) throw new Error('Failed to fetch leaderboard');

        const leaderboardData = await response.json();
        console.log('Leaderboard data received:', leaderboardData);
        
        // Transform the data to match the expected format
        const transformedData = {
          leaderboard: leaderboardData.leaderboard || [],
          topPlayers: leaderboardData.topPlayers || [],
          userRank: userAddress ? leaderboardData.leaderboard?.find(
            (entry: LeaderboardEntry) => entry.address.toLowerCase() === userAddress.toLowerCase()
          ) || null : null,
          totalPlayers: leaderboardData.totalPlayers || 0,
          lastUpdated: leaderboardData.lastUpdated
        };
        
        console.log('Transformed data:', transformedData);
        setData(transformedData);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [userAddress]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="text-gray-400 font-bold text-lg">#{rank}</span>
        );
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/50 animate-pulse">
          <span className="text-xs font-bold text-black">👑</span>
        </div>
      );
    }
    return null;
  };

  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">Championship</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
              Leaderboard
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Top prediction champions competing for glory
          </p>

          {data?.lastUpdated && (
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 p-4">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/[0.02] to-transparent"></div>
            <div className="relative z-10 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-400">
                {data?.totalPlayers || 0}
              </div>
              <div className="text-xs sm:text-sm text-gray-400 mt-1">Total Players</div>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 p-4">
            <div className="absolute inset-0 bg-gradient-to-b from-green-500/[0.02] to-transparent"></div>
            <div className="relative z-10 text-center">
              <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-1" />
              <div className="text-xs sm:text-sm text-gray-400">Live Rankings</div>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 p-4">
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/[0.02] to-transparent"></div>
            <div className="relative z-10 text-center">
              <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <div className="text-xs sm:text-sm text-gray-400">On-Chain</div>
            </div>
          </div>
        </div>

        {/* User Rank Card (if far from top 20) */}
        {data?.userRank && data.userRank.rank > 20 && (
          <div className="mb-6">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-500/10 to-cyan-500/5 border-2 border-blue-500/30 p-4">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.02] to-transparent"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                      <Target className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-400 font-medium">Your Rank</p>
                      <p className="text-xs text-gray-400">
                        {data.userRank.address.slice(0, 6)}...{data.userRank.address.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      #{data.userRank.rank}
                    </div>
                    <div className="text-xs text-gray-400">
                      of {data.totalPlayers}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-blue-500/20">
                  <div className="text-center">
                    <div className="text-sm font-bold text-blue-400">{data.userRank.accuracy}%</div>
                    <div className="text-xs text-gray-500">Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-green-400">🔥 {data.userRank.currentStreak}</div>
                    <div className="text-xs text-gray-500">Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-purple-400">{data.userRank.totalPredictions}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/[0.02] to-transparent"></div>

          <div className="relative z-10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Top 20 Champions</h2>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-yellow-400 font-medium">Live</span>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
                <span className="text-gray-400">Loading champions...</span>
              </div>
            ) : !data || data.topPlayers.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No players yet</p>
                <p className="text-gray-500 text-sm">Be the first to make predictions!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.topPlayers.map((entry) => {
                  const isUserEntry = userAddress && entry.address.toLowerCase() === userAddress.toLowerCase();

                  return (
                    <div
                      key={entry.address}
                      className={`
                        relative group
                        rounded-xl p-4 transition-all duration-300
                        ${entry.rank <= 3
                          ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border-2 border-yellow-500/30 hover:border-yellow-500/50'
                          : isUserEntry
                            ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/5 border-2 border-blue-500/30 hover:border-blue-500/50'
                            : 'bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/50'
                        }
                      `}
                    >
                      {getRankBadge(entry.rank)}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Rank */}
                          <div className="flex items-center justify-center w-12">
                            {getRankIcon(entry.rank)}
                          </div>

                          {/* User Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-white">
                                {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                              </div>
                              {isUserEntry && (
                                <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {entry.correctPredictions}/{entry.totalPredictions} predictions
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 sm:gap-6 text-sm">
                          <div className="text-center">
                            <div className={`font-bold ${entry.accuracy >= 80 ? 'text-green-400' : entry.accuracy >= 60 ? 'text-yellow-400' : 'text-gray-400'}`}>
                              {entry.accuracy}%
                            </div>
                            <div className="text-xs text-gray-500">Accuracy</div>
                          </div>

                          <div className="text-center hidden sm:block">
                            <div className="font-bold text-green-400 flex items-center gap-1">
                              {entry.currentStreak > 0 && '🔥'} {entry.currentStreak}
                            </div>
                            <div className="text-xs text-gray-500">Streak</div>
                          </div>

                          <div className="text-center hidden sm:block">
                            <div className="font-bold text-purple-400">
                              {entry.longestStreak}
                            </div>
                            <div className="text-xs text-gray-500">Best</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
