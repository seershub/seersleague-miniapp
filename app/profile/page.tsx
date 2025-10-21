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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
            <User className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">Your Profile</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Profile
            </span>
          </h1>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <span className="text-gray-400">Loading profile...</span>
          </div>
        ) : (
          <>
            {/* User Identity Card */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50 mb-6">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.02] to-transparent"></div>
              
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-4">
                  {/* Profile Picture */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-1">
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
                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                          Farcaster
                        </span>
                      </div>
                    )}
                    
                    {!user?.username && user?.displayName && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-bold text-white">{user.displayName}</span>
                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                          Farcaster
                        </span>
                      </div>
                    )}
                    
                    {profile?.baseName ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-blue-400">{profile.baseName}</span>
                        <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
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
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 p-4">
                <div className="absolute inset-0 bg-gradient-to-b from-green-500/[0.02] to-transparent"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-green-400" />
                    <span className="text-xs text-gray-400">Accuracy</span>
                  </div>
                  <div className="text-3xl font-bold text-green-400">
                    {profile?.stats.accuracy || 0}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {profile?.stats.correctPredictions || 0}/{profile?.stats.totalPredictions || 0} correct
                  </div>
                </div>
              </div>

              {/* Current Streak */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20 p-4">
                <div className="absolute inset-0 bg-gradient-to-b from-orange-500/[0.02] to-transparent"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-orange-400" />
                    <span className="text-xs text-gray-400">Current Streak</span>
                  </div>
                  <div className="text-3xl font-bold text-orange-400">
                    🔥 {profile?.stats.currentStreak || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Best: {profile?.stats.longestStreak || 0}
                  </div>
                </div>
              </div>

              {/* Total Predictions */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 p-4">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/[0.02] to-transparent"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-purple-400" />
                    <span className="text-xs text-gray-400">Total Predictions</span>
                  </div>
                  <div className="text-3xl font-bold text-purple-400">
                    {profile?.stats.totalPredictions || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    All time
                  </div>
                </div>
              </div>

              {/* Free Predictions */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 p-4 col-span-2 sm:col-span-3">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.02] to-transparent"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        <span className="text-sm text-gray-400">Free Predictions</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">
                        {profile?.stats.remainingFreePredictions || 0} remaining
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Used</div>
                      <div className="text-xl font-bold text-gray-300">
                        {profile?.stats.freePredictionsUsed || 0}/5
                      </div>
                    </div>
                  </div>
                  {(profile?.stats.remainingFreePredictions || 0) === 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-500/20">
                      <p className="text-xs text-blue-300">
                        💰 Premium mode: 0.5 USDC per prediction
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Prediction History */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50">
              <div className="absolute inset-0 bg-gradient-to-b from-purple-500/[0.02] to-transparent"></div>
              
              <div className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    Prediction History
                  </h2>
                </div>

                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                    <span className="text-gray-400 text-sm">Loading history...</span>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-2">No predictions yet</p>
                    <p className="text-gray-500 text-sm">Start making predictions to build your history!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {history.map((entry, index) => (
                      <div
                        key={`${entry.matchId}-${index}`}
                        className="relative group rounded-xl p-4 bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/50 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-white">
                                {entry.homeTeam} vs {entry.awayTeam}
                              </span>
                              {entry.isCorrect !== null && (
                                entry.isCorrect ? (
                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-400" />
                                )
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">Your prediction: </span>
                                <span className={`font-semibold ${getOutcomeColor(entry.userPrediction)}`}>
                                  {getOutcomeLabel(entry.userPrediction)}
                                </span>
                              </div>
                              
                              {entry.actualResult !== null && (
                                <div>
                                  <span className="text-gray-400">Result: </span>
                                  <span className={`font-semibold ${getOutcomeColor(entry.actualResult)}`}>
                                    {getOutcomeLabel(entry.actualResult)}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {new Date(entry.timestamp * 1000).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>

                          {entry.isCorrect !== null && (
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              entry.isCorrect 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {entry.isCorrect ? '✓ Correct' : '✗ Wrong'}
                            </div>
                          )}
                          
                          {entry.isCorrect === null && (
                            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                              ⏳ Pending
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
