'use client';

import { UserStats, calculateAccuracy, getRemainingFreePredictions } from '@/lib/contract-interactions';

interface ProfileStatsProps {
  stats: UserStats;
}

export function ProfileStats({ stats }: ProfileStatsProps) {
  const accuracy = calculateAccuracy(stats);
  const remainingFreePredictions = getRemainingFreePredictions(stats);
  
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
            {stats.freePredictionsUsed}/5 free used
          </div>
        </div>
      </div>
      
      {/* Free Predictions Status */}
      {remainingFreePredictions > 0 && (
        <div className="mt-4 p-3 bg-green-900 bg-opacity-20 border border-green-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-green-400">🎯</span>
            <span className="text-sm font-semibold text-green-400">
              {remainingFreePredictions} Free Predictions Left
            </span>
          </div>
          <p className="text-xs text-green-300 mt-1">
            After {remainingFreePredictions} more predictions, you'll pay 0.5 USDC per match.
          </p>
        </div>
      )}
      
      {remainingFreePredictions === 0 && (
        <div className="mt-4 p-3 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-blue-400">💰</span>
            <span className="text-sm font-semibold text-blue-400">Premium Member</span>
          </div>
          <p className="text-xs text-blue-300 mt-1">
            Fee: 0.5 USDC per prediction
          </p>
        </div>
      )}
    </div>
  );
}
