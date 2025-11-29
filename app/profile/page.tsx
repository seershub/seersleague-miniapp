'use client';

import { useEffect, useState } from 'react';
import { User, Trophy, Target, TrendingUp, Zap, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useMiniKit } from '@/components/MiniKitProvider';

interface UserProfile {
  address: string;
  baseName: string | null;
  stats: {
    correctPredictions: number;
    totalPredictions: number;
    freePredictionsUsed: number;
    currentStreak: number;
    longestStreak: number;
    accuracy: number;
    remainingFreePredictions: number;
  };
}

interface PredictionHistoryEntry {
  matchId: number;
  matchName: string;
  userPrediction: number;
  actualResult: number | null;
  isCorrect: boolean | null;
  timestamp: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
}

export default function ProfilePage() {
  const { sdk, isReady, user } = useMiniKit();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<PredictionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  // Get user address from MiniKit
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

  // Farcaster user info is now available from MiniKitProvider via 'user' prop

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userAddress) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/profile/${userAddress}`);
        if (!response.ok) throw new Error('Failed to fetch profile');

        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userAddress]);

  // Fetch prediction history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!userAddress) return;

      try {
        setHistoryLoading(true);
        const response = await fetch(`/api/profile/${userAddress}/history`);
        if (!response.ok) throw new Error('Failed to fetch history');

        const data = await response.json();
        setHistory(data.history || []);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [userAddress]);

  const getOutcomeLabel = (outcome: number) => {
    switch (outcome) {
      case 1: return 'Home Win';
      case 2: return 'Draw';
      case 3: return 'Away Win';
      default: return 'Unknown';
    }
  };

  const getOutcomeColor = (outcome: number) => {
    switch (outcome) {
      case 1: return 'text-blue-400';
      case 2: return 'text-yellow-400';
      case 3: return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  if (!userAddress) {
    return (
      <main className="min-h-screen bg-black">
        <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Please connect your wallet</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 glass-effect border border-gold-500/20">
            <User className="w-5 h-5 text-gold-500" />
            <span className="text-sm font-semibold text-gold-500 uppercase tracking-wide">Your Profile</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight">
            <span className="gold-text">
              Profile
            </span>
          </h1>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="spinner w-12 h-12 mb-4"></div>
            <span className="text-white/60">Loading profile...</span>
          </div>
        ) : (
          <>
            {/* User Identity Card */}
            <div className="relative glass-card p-6 mb-6">
              <div className="flex items-center gap-4">
                {/* Profile Picture */}
                <div className="w-20 h-20 rounded-full bg-gold-gradient p-1">
                    {user?.pfpUrl ? (
                      <img 
                        src={user.pfpUrl} 
                        alt="Profile" 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
                        <User className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                  {user?.username && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-bold text-white">@{user.username}</span>
                      <span className="px-2 py-0.5 text-xs glass-effect border border-accent-info/30 text-accent-info rounded-full font-semibold">
                        Farcaster
                      </span>
                    </div>
                  )}

                  {!user?.username && user?.displayName && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-bold text-white">{user.displayName}</span>
                      <span className="px-2 py-0.5 text-xs glass-effect border border-accent-info/30 text-accent-info rounded-full font-semibold">
                        Farcaster
                      </span>
                    </div>
                  )}

                  {profile?.baseName ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gold-500">{profile.baseName}</span>
                      <span className="px-2 py-0.5 text-xs glass-effect border border-gold-500/30 text-gold-500 rounded-full font-semibold">
                        Base Name
                      </span>
                    </div>
                  ) : null}
                    
                    <div className="text-sm text-gray-400 font-mono mt-1">
                      {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {/* Accuracy */}
              <div className="relative glass-card hover:scale-105 transition-transform duration-300 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-accent-success" />
                  <span className="text-xs text-white/40 font-semibold uppercase">Accuracy</span>
                </div>
                <div className="text-3xl font-bold text-accent-success tabular-nums">
                  {profile?.stats.accuracy || 0}%
                </div>
                <div className="text-xs text-white/40 mt-1">
                  {profile?.stats.correctPredictions || 0}/{profile?.stats.totalPredictions || 0} correct
                </div>
              </div>

              {/* Current Streak */}
              <div className="relative glass-card hover:scale-105 transition-transform duration-300 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-accent-warning" />
                  <span className="text-xs text-white/40 font-semibold uppercase">Streak</span>
                </div>
                <div className="text-3xl font-bold text-accent-warning tabular-nums">
                  🔥 {profile?.stats.currentStreak || 0}
                </div>
                <div className="text-xs text-white/40 mt-1">
                  Best: {profile?.stats.longestStreak || 0}
                </div>
              </div>

              {/* Total Predictions */}
              <div className="relative glass-card hover:scale-105 transition-transform duration-300 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-gold-500" />
                  <span className="text-xs text-white/40 font-semibold uppercase">Total</span>
                </div>
                <div className="text-3xl font-bold text-gold-500 tabular-nums">
                  {profile?.stats.totalPredictions || 0}
                </div>
                <div className="text-xs text-white/40 mt-1">
                  All time
                </div>
              </div>

              {/* Free Predictions */}
              <div className="relative glass-card p-4 col-span-2 sm:col-span-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-5 h-5 text-accent-info" />
                      <span className="text-sm text-white/60 font-semibold">Free Predictions</span>
                    </div>
                    <div className="text-2xl font-bold text-accent-info tabular-nums">
                      {profile?.stats.remainingFreePredictions || 0} remaining
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/40">Used</div>
                    <div className="text-xl font-bold text-white tabular-nums">
                      {profile?.stats.freePredictionsUsed || 0}/5
                    </div>
                  </div>
                </div>
                {(profile?.stats.remainingFreePredictions || 0) === 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-gold-500 font-semibold">
                      💰 Premium mode: 0.5 USDC per prediction
                    </p>
                  </div>
                )}
                </div>
              </div>
            </div>

            {/* Prediction History */}
            <div className="relative glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gold-500" />
                  Prediction History
                </h2>
              </div>

              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="spinner w-10 h-10 mb-4"></div>
                  <span className="text-white/60 text-sm">Loading history...</span>
                </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-2">No predictions yet</p>
                    <p className="text-gray-500 text-sm">Start making predictions to build your history!</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    <div className="space-y-2">
                      {history.map((entry, index) => {
                        // Determine which team user picked
                        const userPickedHome = entry.userPrediction === 1;
                        const userPickedDraw = entry.userPrediction === 2;
                        const userPickedAway = entry.userPrediction === 3;

                        return (
                          <div
                            key={`${entry.matchId}-${index}`}
                            className="relative rounded-lg p-3 bg-gray-800/30 border border-gray-700/30 hover:bg-gray-800/50 hover:border-gray-600/50 transition-all"
                          >
                            {/* Compact Header Row */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-xs text-gray-500 uppercase tracking-wide">{entry.league}</span>

                              {/* Status Badge */}
                              {entry.isCorrect !== null ? (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  entry.isCorrect
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                              }`}>
                                {entry.isCorrect ? '✓ Correct' : '✗ Wrong'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
                                Pending
                              </span>
                            )}
                          </div>

                          {/* Horizontal Match Display */}
                          <div className="flex items-center gap-2">
                            {/* Home Team */}
                            <div className={`flex-1 flex items-center gap-2 p-2 rounded ${
                              userPickedHome
                                ? 'bg-blue-500/10 border border-blue-500/30'
                                : 'bg-transparent'
                            }`}>
                              {userPickedHome && <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                              <span className={`text-sm font-medium truncate ${
                                userPickedHome ? 'text-blue-400' : 'text-gray-400'
                              }`}>
                                {entry.homeTeam}
                              </span>
                            </div>

                            {/* VS / Draw Indicator */}
                            <div className="flex-shrink-0">
                              {userPickedDraw ? (
                                <div className="px-3 py-1 rounded bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-yellow-400" />
                                  <span className="text-xs font-medium text-yellow-400">Draw</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-600">vs</span>
                              )}
                            </div>

                            {/* Away Team */}
                            <div className={`flex-1 flex items-center justify-end gap-2 p-2 rounded ${
                              userPickedAway
                                ? 'bg-purple-500/10 border border-purple-500/30'
                                : 'bg-transparent'
                            }`}>
                              <span className={`text-sm font-medium truncate ${
                                userPickedAway ? 'text-purple-400' : 'text-gray-400'
                              }`}>
                                {entry.awayTeam}
                              </span>
                              {userPickedAway && <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                            </div>
                          </div>

                          {/* Result Footer (if available) */}
                          {entry.actualResult !== null && (
                            <div className="mt-2 pt-2 border-t border-gray-700/30 text-xs text-gray-500">
                              Result: <span className="font-medium text-gray-400">
                                {entry.actualResult === 1 ? entry.homeTeam :
                                 entry.actualResult === 2 ? 'Draw' :
                                 entry.awayTeam} won
                              </span>
                            </div>
                          )}

                          {/* Timestamp */}
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                            <Clock className="w-3 h-3" />
                            {new Date(entry.timestamp * 1000).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
