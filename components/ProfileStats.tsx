'use client';

import { UserStats, calculateAccuracy } from '@/lib/contract-interactions';

interface ProfileStatsProps {
  stats: UserStats;
}

export function ProfileStats({ stats }: ProfileStatsProps) {
  const accuracy = calculateAccuracy(stats);
  
  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 text-center">Your Stats</h3>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="text-2xl font-bold text-base-blue">{accuracy}%</div>
          <div className="text-sm text-gray-400">Accuracy</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.correctPredictions}/{stats.totalPredictions}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="text-2xl font-bold text-green-400">🔥 {stats.currentStreak}</div>
          <div className="text-sm text-gray-400">Current Streak</div>
          <div className="text-xs text-gray-500 mt-1">
            Best: {stats.longestStreak}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="text-2xl font-bold text-purple-400">📊 {stats.totalPredictions}</div>
          <div className="text-sm text-gray-400">Total Predictions</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.totalPredictions / 5} days
          </div>
        </div>
      </div>
      
      {/* Free Trial Status */}
      {!stats.hasUsedFreeTrial && (
        <div className="mt-4 p-3 bg-green-900 bg-opacity-20 border border-green-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-green-400">🎉</span>
            <span className="text-sm font-semibold text-green-400">Free Trial Available</span>
          </div>
          <p className="text-xs text-green-300 mt-1">
            Your first 5 predictions are completely free!
          </p>
        </div>
      )}
      
      {stats.hasUsedFreeTrial && (
        <div className="mt-4 p-3 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-blue-400">💰</span>
            <span className="text-sm font-semibold text-blue-400">Premium Member</span>
          </div>
          <p className="text-xs text-blue-300 mt-1">
            Entry fee: $1 USDC per day
          </p>
        </div>
      )}
    </div>
  );
}
