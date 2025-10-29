'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface PredictionHistoryItem {
  matchId: string;
  predictedOutcome: number;
  actualOutcome: number;
  isProcessed: boolean;
  isCorrect: boolean;
  timestamp: number;
  startTime: number;
  startDate: string;
  homeScore?: number;
  awayScore?: number;
  status: 'pending' | 'correct' | 'incorrect' | 'not_processed';
}

interface UserStats {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  currentStreak: number;
  longestStreak: number;
  freePredictionsUsed: number;
  totalFeesPaid: number;
  lastPredictionTime: number;
}

interface PredictionHistoryV2Props {
  userAddress: string;
}

export default function PredictionHistoryV2({ userAddress }: PredictionHistoryV2Props) {
  const [predictions, setPredictions] = useState<PredictionHistoryItem[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadPredictions = async (newOffset = 0, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v2/prediction-history?user=${userAddress}&offset=${newOffset}&limit=20`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Tahmin geçmişi yüklenemedi');
      }

      if (append) {
        setPredictions(prev => [...prev, ...data.predictions]);
      } else {
        setPredictions(data.predictions);
      }

      setUserStats(data.userStats);
      setOffset(data.pagination.offset + data.predictions.length);
      setHasMore(data.pagination.hasMore);

      console.log(`[PREDICTION HISTORY V2] Loaded ${data.predictions.length} predictions`);

    } catch (err) {
      console.error('[PREDICTION HISTORY V2] Error:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadPredictions(offset, true);
    }
  };

  const refreshPredictions = () => {
    setOffset(0);
    loadPredictions(0, false);
  };

  useEffect(() => {
    if (userAddress) {
      loadPredictions();
    }
  }, [userAddress]);

  const getOutcomeText = (outcome: number) => {
    switch (outcome) {
      case 1: return 'Ev Sahibi Kazanır';
      case 2: return 'Beraberlik';
      case 3: return 'Deplasman Kazanır';
      default: return 'Bilinmiyor';
    }
  };

  const getOutcomeIcon = (outcome: number) => {
    switch (outcome) {
      case 1: return '🏠';
      case 2: return '🤝';
      case 3: return '✈️';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'correct': return 'bg-green-100 border-green-300 text-green-800';
      case 'incorrect': return 'bg-red-100 border-red-300 text-red-800';
      case 'not_processed': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'correct': return '✅ Doğru';
      case 'incorrect': return '❌ Yanlış';
      case 'not_processed': return '⏳ Beklemede';
      default: return '❓ Bilinmiyor';
    }
  };

  if (loading && predictions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Tahmin geçmişi yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">
          <div className="text-4xl mb-2">⚠️</div>
          <p className="font-medium">Hata: {error}</p>
        </div>
        <button
          onClick={refreshPredictions}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">
          <div className="text-4xl mb-2">📊</div>
          <p className="font-medium">Henüz tahmin yapılmamış</p>
          <p className="text-sm">Tahmin yapmaya başladığınızda burada görünecek</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Statistics */}
      {userStats && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="font-bold text-lg text-gray-900 mb-4">İstatistikleriniz</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{userStats.totalPredictions}</div>
              <div className="text-sm text-gray-600">Toplam Tahmin</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{userStats.correctPredictions}</div>
              <div className="text-sm text-gray-600">Doğru Tahmin</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{userStats.accuracy}%</div>
              <div className="text-sm text-gray-600">Doğruluk Oranı</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{userStats.currentStreak}</div>
              <div className="text-sm text-gray-600">Mevcut Seri</div>
            </div>
          </div>
        </div>
      )}

      {/* Predictions List */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-gray-900">Tahmin Geçmişiniz</h3>
        
        {predictions.map((prediction, index) => (
          <div key={`${prediction.matchId}-${index}`} className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getOutcomeIcon(prediction.predictedOutcome)}</span>
                <span className="font-medium text-gray-900">
                  {getOutcomeText(prediction.predictedOutcome)}
                </span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(prediction.status)}`}>
                {getStatusText(prediction.status)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600 mb-1">Tahmin Zamanı</div>
                <div className="font-medium">
                  {formatDistanceToNow(new Date(prediction.timestamp * 1000), { 
                    addSuffix: true, 
                    locale: tr 
                  })}
                </div>
              </div>

              <div>
                <div className="text-gray-600 mb-1">Maç Zamanı</div>
                <div className="font-medium">
                  {new Date(prediction.startDate).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              <div>
                <div className="text-gray-600 mb-1">Maç ID</div>
                <div className="font-medium font-mono text-xs">{prediction.matchId}</div>
              </div>
            </div>

            {/* Match Result */}
            {prediction.isProcessed && prediction.homeScore !== undefined && prediction.awayScore !== undefined && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Maç Sonucu:</div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {prediction.homeScore} - {prediction.awayScore}
                    </span>
                    <span className="text-lg">{getOutcomeIcon(prediction.actualOutcome)}</span>
                    <span className="text-sm text-gray-600">
                      {getOutcomeText(prediction.actualOutcome)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Status */}
            {!prediction.isProcessed && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded-md">
                  ⏳ Bu maçın sonucu henüz kaydedilmedi. Sonuç geldiğinde otomatik olarak güncellenecek.
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center py-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-md transition-colors duration-200"
          >
            {loading ? 'Yükleniyor...' : 'Daha Fazla Tahmin'}
          </button>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center py-2">
        <button
          onClick={refreshPredictions}
          className="text-blue-500 hover:text-blue-600 text-sm underline"
        >
          Tahmin Geçmişini Yenile
        </button>
      </div>
    </div>
  );
}
