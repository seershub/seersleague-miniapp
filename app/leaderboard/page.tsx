'use client';

import { useEffect, useState } from 'react';
import { Trophy, Target, TrendingUp, Zap, Flame, Crown, Medal, Award } from 'lucide-react';
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
        console.log('Fetching leaderboard...');

        const response = await fetch('/api/leaderboard');
        if (!response.ok) throw new Error('Failed to fetch leaderboard');

        const leaderboardData = await response.json();
        console.log('Leaderboard data received:', leaderboardData);

        const transformedData = {
          leaderboard: leaderboardData.leaderboard || [],
          topPlayers: leaderboardData.topPlayers || [],
          userRank: userAddress ? leaderboardData.leaderboard?.find(
            (entry: LeaderboardEntry) => entry.address.toLowerCase() === userAddress.toLowerCase()
          ) || null : null,
          totalPlayers: leaderboardData.totalPlayers || 0,
          lastUpdated: leaderboardData.lastUpdated
        };

        setData(transformedData);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [userAddress]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-[rgb(var(--brand-gold))]" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return (
          <span className="text-sm font-bold text-[rgb(var(--text-muted))]">#{rank}</span>
        );
    }
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <header className="mb-8 text-center animate-fade-up">
          <div className="badge-gold mb-4 inline-flex">
            <Trophy className="w-4 h-4" />
            <span>Championship</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="gradient-gold-text">Leaderboard</span>
          </h1>
          <p className="text-[rgb(var(--text-secondary))] text-sm">
            Top prediction champions competing for glory
          </p>

          {data?.lastUpdated && (
            <p className="text-xs text-[rgb(var(--text-muted))] mt-2">
              Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-up-delay-1">
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-[rgb(var(--brand-cyan))]">
              {data?.totalPlayers || 0}
            </div>
            <div className="text-xs text-[rgb(var(--text-muted))] mt-1">Total Players</div>
          </div>

          <div className="stat-card text-center">
            <TrendingUp className="w-5 h-5 text-[rgb(var(--brand-green))] mx-auto" />
            <div className="text-xs text-[rgb(var(--text-muted))] mt-1">Live Rankings</div>
          </div>

          <div className="stat-card text-center">
            <Zap className="w-5 h-5 text-[rgb(var(--brand-gold))] mx-auto" />
            <div className="text-xs text-[rgb(var(--text-muted))] mt-1">On-Chain</div>
          </div>
        </div>

        {/* User Rank Card (if far from top 20) */}
        {data?.userRank && data.userRank.rank > 20 && (
          <div className="mb-6 animate-fade-up-delay-2">
            <div className="glass-card p-4 border-[rgba(0,245,255,0.2)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(0,245,255,0.1)] flex items-center justify-center border border-[rgba(0,245,255,0.2)]">
                    <Target className="w-5 h-5 text-[rgb(var(--brand-cyan))]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[rgb(var(--brand-cyan))]">Your Rank</p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">
                      {data.userRank.address.slice(0, 6)}...{data.userRank.address.slice(-4)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">#{data.userRank.rank}</div>
                  <div className="text-xs text-[rgb(var(--text-muted))]">of {data.totalPlayers}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[rgba(0,245,255,0.1)]">
                <div className="text-center">
                  <div className="text-sm font-bold text-[rgb(var(--brand-cyan))]">{data.userRank.accuracy}%</div>
                  <div className="text-xs text-[rgb(var(--text-muted))]">Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-[rgb(var(--brand-green))] flex items-center justify-center gap-1">
                    <Flame className="w-3 h-3" />
                    {data.userRank.currentStreak}
                  </div>
                  <div className="text-xs text-[rgb(var(--text-muted))]">Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-[rgb(var(--brand-gold))]">{data.userRank.totalPredictions}</div>
                  <div className="text-xs text-[rgb(var(--text-muted))]">Total</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="glass-card overflow-hidden animate-fade-up-delay-2">
          <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Top 20 Champions</h2>
              <div className="badge-live">
                <div className="w-2 h-2 rounded-full bg-[rgb(var(--brand-green))] animate-pulse" />
                <span>Live</span>
              </div>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="spinner mb-4" />
                <span className="text-[rgb(var(--text-muted))] text-sm">Loading champions...</span>
              </div>
            ) : !data || data.topPlayers.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-[rgb(var(--text-muted))] mx-auto mb-3 opacity-50" />
                <p className="text-[rgb(var(--text-secondary))]">No players yet</p>
                <p className="text-[rgb(var(--text-muted))] text-sm mt-1">Be the first to make predictions!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.topPlayers.map((entry) => {
                  const isUserEntry = userAddress && entry.address.toLowerCase() === userAddress.toLowerCase();

                  return (
                    <div
                      key={entry.address}
                      className={`
                        flex items-center justify-between p-3 rounded-xl transition-all duration-200
                        ${entry.rank <= 3
                          ? 'bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)]'
                          : isUserEntry
                            ? 'bg-[rgba(0,245,255,0.06)] border border-[rgba(0,245,255,0.15)]'
                            : 'bg-[rgba(24,24,30,0.5)] border border-[rgba(255,255,255,0.03)] hover:bg-[rgba(32,32,40,0.6)]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 flex items-center justify-center">
                          {getRankIcon(entry.rank)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-sm">
                              {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                            </span>
                            {isUserEntry && (
                              <span className="badge-cyan text-[10px]">You</span>
                            )}
                          </div>
                          <div className="text-xs text-[rgb(var(--text-muted))]">
                            {entry.correctPredictions}/{entry.totalPredictions} predictions
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <div className={`font-bold ${entry.accuracy >= 80 ? 'text-[rgb(var(--brand-green))]' : entry.accuracy >= 60 ? 'text-[rgb(var(--brand-gold))]' : 'text-[rgb(var(--text-muted))]'}`}>
                            {entry.accuracy}%
                          </div>
                        </div>

                        <div className="text-right hidden sm:block">
                          <div className="font-medium text-[rgb(var(--brand-green))] flex items-center gap-1">
                            {entry.currentStreak > 0 && <Flame className="w-3 h-3" />}
                            {entry.currentStreak}
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
