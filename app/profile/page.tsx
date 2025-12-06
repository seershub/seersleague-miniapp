'use client';

import { useEffect, useState } from 'react';
import { User, Trophy, Target, TrendingUp, Zap, Calendar, CheckCircle, XCircle, Clock, Flame, DollarSign } from 'lucide-react';
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

  if (!userAddress) {
    return (
      <main className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(24,24,30,0.8)] border border-[rgba(55,55,65,0.5)] flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-[rgb(var(--text-muted))]" />
            </div>
            <p className="text-[rgb(var(--text-secondary))]">Please connect your wallet</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <header className="mb-6 text-center animate-fade-up">
          <div className="badge inline-flex mb-4">
            <User className="w-4 h-4 text-[rgb(var(--brand-cyan))]" />
            <span className="text-[rgb(var(--brand-cyan))]">Your Profile</span>
          </div>

          <h1 className="text-3xl font-bold">
            <span className="gradient-cyan-text">Profile</span>
          </h1>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="spinner mb-4" />
            <span className="text-[rgb(var(--text-muted))] text-sm">Loading profile...</span>
          </div>
        ) : (
          <>
            {/* User Identity Card */}
            <div className="glass-card p-4 mb-6 animate-fade-up-delay-1">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[rgb(var(--brand-cyan))] to-[rgb(var(--brand-gold))] p-0.5">
                  {user?.pfpUrl ? (
                    <img
                      src={user.pfpUrl}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[rgb(var(--bg-secondary))] flex items-center justify-center">
                      <User className="w-7 h-7 text-[rgb(var(--text-muted))]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {user?.username && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-semibold text-white truncate">@{user.username}</span>
                      <span className="badge-cyan text-[10px] flex-shrink-0">Farcaster</span>
                    </div>
                  )}

                  {!user?.username && user?.displayName && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-semibold text-white truncate">{user.displayName}</span>
                      <span className="badge-cyan text-[10px] flex-shrink-0">Farcaster</span>
                    </div>
                  )}

                  {profile?.baseName && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[rgb(var(--brand-gold))]">{profile.baseName}</span>
                    </div>
                  )}

                  <div className="text-xs text-[rgb(var(--text-muted))] font-mono">
                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-up-delay-2">
              {/* Accuracy */}
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-[rgb(var(--brand-green))]" />
                  <span className="text-xs text-[rgb(var(--text-muted))]">Accuracy</span>
                </div>
                <div className="text-2xl font-bold text-[rgb(var(--brand-green))]">
                  {profile?.stats.accuracy || 0}%
                </div>
                <div className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                  {profile?.stats.correctPredictions || 0}/{profile?.stats.totalPredictions || 0} correct
                </div>
              </div>

              {/* Current Streak */}
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-[rgb(var(--text-muted))]">Current Streak</span>
                </div>
                <div className="text-2xl font-bold text-orange-400 flex items-center gap-1">
                  {profile?.stats.currentStreak || 0}
                </div>
                <div className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
                  Best: {profile?.stats.longestStreak || 0}
                </div>
              </div>

              {/* Total Predictions */}
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-[rgb(var(--brand-cyan))]" />
                  <span className="text-xs text-[rgb(var(--text-muted))]">Total Predictions</span>
                </div>
                <div className="text-2xl font-bold text-[rgb(var(--brand-cyan))]">
                  {profile?.stats.totalPredictions || 0}
                </div>
                <div className="text-xs text-[rgb(var(--text-muted))] mt-0.5">All time</div>
              </div>

              {/* USDC Winnings */}
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-[rgb(var(--brand-gold))]" />
                  <span className="text-xs text-[rgb(var(--text-muted))]">Winnings</span>
                </div>
                <div className="text-2xl font-bold text-[rgb(var(--brand-gold))]">$0.00</div>
                <div className="text-xs text-[rgb(var(--text-muted))] mt-0.5">Coming soon</div>
              </div>

              {/* Free Predictions */}
              <div className="stat-card col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-[rgb(var(--brand-gold))]" />
                      <span className="text-xs text-[rgb(var(--text-muted))]">Free Predictions</span>
                    </div>
                    <div className="text-xl font-bold text-[rgb(var(--brand-gold))]">
                      {profile?.stats.remainingFreePredictions || 0} remaining
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[rgb(var(--text-muted))]">Used</div>
                    <div className="text-lg font-bold text-white">
                      {profile?.stats.freePredictionsUsed || 0}/5
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Claim Button */}
            <div className="mb-6 animate-fade-up-delay-3">
              <button
                disabled
                className="w-full glass-card p-4 cursor-not-allowed opacity-50"
              >
                <div className="flex items-center justify-center gap-3">
                  <Trophy className="w-5 h-5 text-[rgb(var(--brand-gold))]" />
                  <span className="font-semibold text-[rgb(var(--brand-gold))]">Claim Winnings</span>
                  <span className="badge-gold text-xs">Coming Soon</span>
                </div>
                <div className="text-xs text-[rgb(var(--text-muted))] text-center mt-2">
                  Prize distribution enabled after first season ends
                </div>
              </button>
            </div>

            {/* Prediction History */}
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[rgb(var(--brand-cyan))]" />
                  Prediction History
                </h2>
              </div>

              <div className="p-4">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="spinner mb-4" />
                    <span className="text-[rgb(var(--text-muted))] text-sm">Loading history...</span>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-[rgb(var(--text-muted))] mx-auto mb-3 opacity-50" />
                    <p className="text-[rgb(var(--text-secondary))]">No predictions yet</p>
                    <p className="text-[rgb(var(--text-muted))] text-sm mt-1">Start making predictions!</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto scrollbar-thin space-y-2">
                    {history.map((entry, index) => {
                      const userPickedHome = entry.userPrediction === 1;
                      const userPickedDraw = entry.userPrediction === 2;
                      const userPickedAway = entry.userPrediction === 3;

                      return (
                        <div
                          key={`${entry.matchId}-${index}`}
                          className="p-3 rounded-xl bg-[rgba(24,24,30,0.5)] border border-[rgba(255,255,255,0.03)] hover:bg-[rgba(32,32,40,0.6)] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] text-[rgb(var(--text-muted))] uppercase tracking-wide">{entry.league}</span>

                            {entry.isCorrect !== null ? (
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${entry.isCorrect
                                  ? 'bg-[rgba(34,197,94,0.1)] text-[rgb(var(--brand-green))]'
                                  : 'bg-[rgba(239,68,68,0.1)] text-[rgb(var(--brand-red))]'
                                }`}>
                                {entry.isCorrect ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {entry.isCorrect ? 'Correct' : 'Wrong'}
                              </span>
                            ) : (
                              <span className="badge-gold text-xs">Pending</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <span className={`font-medium ${userPickedHome ? 'text-[rgb(var(--brand-cyan))]' : 'text-[rgb(var(--text-muted))]'}`}>
                              {entry.homeTeam}
                            </span>
                            <span className={`text-xs ${userPickedDraw ? 'text-[rgb(var(--brand-gold))] font-medium' : 'text-[rgb(var(--text-muted))]'}`}>
                              vs
                            </span>
                            <span className={`font-medium ${userPickedAway ? 'text-[rgb(var(--brand-cyan))]' : 'text-[rgb(var(--text-muted))]'}`}>
                              {entry.awayTeam}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 mt-2 text-xs text-[rgb(var(--text-muted))]">
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
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
