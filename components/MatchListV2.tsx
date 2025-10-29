'use client';

import { useState, useEffect } from 'react';
import MatchCardV2 from './MatchCardV2';

interface Match {
  id: string;
  startTime: number;
  startDate: string;
  status: 'upcoming' | 'live' | 'finished' | 'recorded';
  canPredict: boolean;
  isRecorded: boolean;
  timeRemaining?: number;
}

interface MatchListV2Props {
  onPredict?: (matchId: string) => void;
}

export default function MatchListV2({ onPredict }: MatchListV2Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [statistics, setStatistics] = useState({
    total: 0,
    upcoming: 0,
    finished: 0,
    recorded: 0
  });

  const loadMatches = async (newOffset = 0, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v2/matches?offset=${newOffset}&limit=20`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Maçlar yüklenemedi');
      }

      if (append) {
        setMatches(prev => [...prev, ...data.matches]);
      } else {
        setMatches(data.matches);
      }

      setOffset(data.pagination.nextOffset);
      setHasMore(data.pagination.hasMore);
      setStatistics(data.statistics);

      console.log(`[MATCH LIST V2] Loaded ${data.matches.length} matches (${data.pagination.total} total)`);

    } catch (err) {
      console.error('[MATCH LIST V2] Error:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadMatches(offset, true);
    }
  };

  const refreshMatches = () => {
    setOffset(0);
    loadMatches(0, false);
  };

  useEffect(() => {
    loadMatches();
    
    // Refresh every 30 seconds to update match statuses
    const interval = setInterval(refreshMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && matches.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Maçlar yükleniyor...</p>
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
          onClick={refreshMatches}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">
          <div className="text-4xl mb-2">🏈</div>
          <p className="font-medium">Henüz maç bulunmuyor</p>
          <p className="text-sm">Yeni maçlar eklendiğinde burada görünecek</p>
        </div>
        <button
          onClick={refreshMatches}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Yenile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <h3 className="font-medium text-gray-900 mb-3">Maç İstatistikleri</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{statistics.upcoming}</div>
            <div className="text-sm text-gray-600">Tahmin Yapılabilir</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{statistics.finished}</div>
            <div className="text-sm text-gray-600">Biten Maçlar</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{statistics.recorded}</div>
            <div className="text-sm text-gray-600">Sonuç Kaydedildi</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
            <div className="text-sm text-gray-600">Toplam Maç</div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <div className="text-yellow-600 text-lg">⚠️</div>
          <div>
            <h4 className="font-medium text-yellow-800">Güvenlik Kuralı</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Maç başlamadan <strong>10 dakika önce</strong> tahmin yapma süresi kapanır. 
              Bu sayede suistimal önlenir ve adil oyun sağlanır.
            </p>
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map((match) => (
          <MatchCardV2
            key={match.id}
            matchId={match.id}
            startTime={match.startTime}
            startDate={match.startDate}
            status={match.status}
            canPredict={match.canPredict}
            isRecorded={match.isRecorded}
            timeRemaining={match.timeRemaining}
            onPredict={onPredict}
          />
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
            {loading ? 'Yükleniyor...' : '5 Daha Fazla Maç'}
          </button>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center py-2">
        <button
          onClick={refreshMatches}
          className="text-blue-500 hover:text-blue-600 text-sm underline"
        >
          Maçları Yenile
        </button>
      </div>
    </div>
  );
}
