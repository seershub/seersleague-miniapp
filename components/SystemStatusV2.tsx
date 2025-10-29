'use client';

import { useState, useEffect } from 'react';

interface SystemStatus {
  system: {
    version: string;
    activeContract: 'v1' | 'v2';
    contractAddress: string;
    deploymentBlock: string;
    timestamp: string;
  };
  contract: {
    connected: boolean;
    version: string;
    owner: string;
    treasury: string;
    paused: boolean;
    totalMatches: number;
  };
  users: {
    totalPlayers: number;
    lastUpdated: string | null;
    cacheStatus: string;
  };
  matches: {
    total: number;
    upcoming: number;
    finished: number;
    recorded: number;
  };
  performance: {
    responseTime: number;
    lastUpdate: string;
    uptime: string;
  };
  health: {
    overall: 'healthy' | 'degraded' | 'error';
    contract: 'connected' | 'disconnected';
    users: 'active' | 'inactive';
    matches: 'available' | 'none';
  };
  recommendations: string[];
}

export default function SystemStatusV2() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/v2/system-status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'System status check failed');
      }

      setStatus(data);
    } catch (err) {
      console.error('Error fetching system status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
          <span className="text-gray-600">System status loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-2">❌</div>
          <h3 className="font-medium text-red-800 mb-2">System Status Error</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchStatus}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="space-y-4">
      {/* Overall Health */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900">System Status V2</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(status.health.overall)}`}>
            {getHealthIcon(status.health.overall)} {status.health.overall.toUpperCase()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Active Contract</div>
            <div className="font-medium text-lg">
              {status.system.activeContract === 'v2' ? '🆕 V2' : '📜 V1'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Version</div>
            <div className="font-medium">{status.system.version}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Response Time</div>
            <div className="font-medium">{status.performance.responseTime}ms</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Last Update</div>
            <div className="font-medium text-xs">
              {new Date(status.performance.lastUpdate).toLocaleTimeString('tr-TR')}
            </div>
          </div>
        </div>
      </div>

      {/* Contract Status */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h4 className="font-medium text-gray-900 mb-4">Contract Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Connection</div>
            <div className={`font-medium ${status.contract.connected ? 'text-green-600' : 'text-red-600'}`}>
              {status.contract.connected ? '✅ Connected' : '❌ Disconnected'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Contract Version</div>
            <div className="font-medium">{status.contract.version}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <div className={`font-medium ${status.contract.paused ? 'text-red-600' : 'text-green-600'}`}>
              {status.contract.paused ? '⏸️ Paused' : '▶️ Active'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Matches</div>
            <div className="font-medium">{status.matches.total}</div>
          </div>
        </div>
      </div>

      {/* Users & Matches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h4 className="font-medium text-gray-900 mb-4">Users</h4>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {status.users.totalPlayers}
          </div>
          <div className="text-sm text-gray-600">
            Total Players
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h4 className="font-medium text-gray-900 mb-4">Matches</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-gray-600">Upcoming</div>
              <div className="font-bold text-green-600">{status.matches.upcoming}</div>
            </div>
            <div>
              <div className="text-gray-600">Finished</div>
              <div className="font-bold text-orange-600">{status.matches.finished}</div>
            </div>
            <div>
              <div className="text-gray-600">Recorded</div>
              <div className="font-bold text-blue-600">{status.matches.recorded}</div>
            </div>
            <div>
              <div className="text-gray-600">Total</div>
              <div className="font-bold text-gray-600">{status.matches.total}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {status.recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">Recommendations</h4>
          <ul className="space-y-1">
            {status.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-yellow-700 flex items-start">
                <span className="mr-2">💡</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={fetchStatus}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}
