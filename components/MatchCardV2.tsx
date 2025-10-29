'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface MatchCardV2Props {
  matchId: string;
  startTime: number;
  startDate: string;
  status: 'upcoming' | 'live' | 'finished' | 'recorded';
  canPredict: boolean;
  isRecorded: boolean;
  timeRemaining?: number;
  onPredict?: (matchId: string) => void;
}

export default function MatchCardV2({
  matchId,
  startTime,
  startDate,
  status,
  canPredict,
  isRecorded,
  timeRemaining,
  onPredict
}: MatchCardV2Props) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isDeadlineNear, setIsDeadlineNear] = useState(false);

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = startTime - now;
      const predictionDeadline = 10 * 60; // 10 minutes

      if (remaining > predictionDeadline) {
        // More than 10 minutes - show time until match
        setTimeLeft(formatDistanceToNow(new Date(startTime * 1000), { 
          addSuffix: true, 
          locale: tr 
        }));
        setIsDeadlineNear(false);
      } else if (remaining > 0) {
        // Less than 10 minutes - show warning
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')} kaldı`);
        setIsDeadlineNear(true);
      } else if (remaining > -7200) {
        // Match started but not finished
        setTimeLeft('Maç devam ediyor');
        setIsDeadlineNear(false);
      } else {
        // Match finished
        setTimeLeft('Maç bitti');
        setIsDeadlineNear(false);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const getStatusColor = () => {
    if (isRecorded) return 'bg-gray-100 border-gray-300';
    if (status === 'finished') return 'bg-red-50 border-red-200';
    if (isDeadlineNear) return 'bg-yellow-50 border-yellow-300';
    if (status === 'live') return 'bg-orange-50 border-orange-200';
    return 'bg-green-50 border-green-200';
  };

  const getStatusText = () => {
    if (isRecorded) return 'Sonuç Kaydedildi';
    if (status === 'finished') return 'Maç Bitti';
    if (isDeadlineNear) return 'Tahmin Süresi Doluyor';
    if (status === 'live') return 'Maç Devam Ediyor';
    return 'Tahmin Yapılabilir';
  };

  const getStatusIcon = () => {
    if (isRecorded) return '✅';
    if (status === 'finished') return '🏁';
    if (isDeadlineNear) return '⚠️';
    if (status === 'live') return '🔴';
    return '🟢';
  };

  return (
    <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <span className="font-medium text-sm text-gray-700">
            {getStatusText()}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          ID: {matchId}
        </span>
      </div>

      <div className="mb-3">
        <div className="text-sm text-gray-600 mb-1">
          {new Date(startDate).toLocaleDateString('tr-TR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
        <div className={`text-sm font-medium ${isDeadlineNear ? 'text-yellow-700' : 'text-gray-700'}`}>
          {timeLeft}
        </div>
      </div>

      {canPredict && onPredict && (
        <button
          onClick={() => onPredict(matchId)}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
        >
          Tahmin Yap
        </button>
      )}

      {!canPredict && (
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-2">
            {isRecorded 
              ? 'Bu maçın sonucu kaydedildi' 
              : isDeadlineNear 
                ? 'Tahmin süresi doldu (10 dakika kala kapanır)'
                : status === 'live'
                  ? 'Maç başladı, tahmin yapılamaz'
                  : 'Bu maç için tahmin yapılamaz'
            }
          </div>
          {isDeadlineNear && (
            <div className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
              ⚠️ Güvenlik: Maç başlamadan 10 dakika önce tahmin kapanır
            </div>
          )}
        </div>
      )}
    </div>
  );
}
