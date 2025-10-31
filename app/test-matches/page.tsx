'use client';

import { useEffect, useState } from 'react';

export default function TestMatches() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${msg}`]);
  };

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        addLog('🚀 Starting fetch...');
        const response = await fetch('/api/matches?limit=10', { cache: 'no-store' });
        addLog(`📡 Response status: ${response.status}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        addLog(`✅ Data received: ${JSON.stringify(data).substring(0, 100)}...`);
        addLog(`📊 Total matches: ${data.total}, Returned: ${data.returned}`);

        setMatches(data.matches || []);
        addLog(`✨ State updated with ${data.matches?.length || 0} matches`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        addLog(`❌ ERROR: ${errorMsg}`);
        setError(errorMsg);
      } finally {
        setLoading(false);
        addLog('🏁 Fetch completed');
      }
    };

    fetchMatches();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Matches Debug Page</h1>

        {/* Status */}
        <div className="mb-8 p-4 bg-gray-900 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Status</h2>
          <p>Loading: {loading ? '⏳ Yes' : '✅ No'}</p>
          <p>Error: {error ? `❌ ${error}` : '✅ None'}</p>
          <p>Matches Count: {matches.length}</p>
        </div>

        {/* Logs */}
        <div className="mb-8 p-4 bg-gray-900 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Logs</h2>
          <div className="space-y-1 font-mono text-sm">
            {logs.map((log, i) => (
              <div key={i} className="text-green-400">{log}</div>
            ))}
          </div>
        </div>

        {/* Matches */}
        <div className="mb-8 p-4 bg-gray-900 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Matches ({matches.length})</h2>
          {loading && <p className="text-yellow-400">Loading...</p>}
          {error && <p className="text-red-400">Error: {error}</p>}
          {!loading && matches.length === 0 && <p className="text-gray-400">No matches found</p>}
          <div className="space-y-4 mt-4">
            {matches.map((match, i) => (
              <div key={i} className="p-4 bg-gray-800 rounded border border-gray-700">
                <p className="font-bold">{match.homeTeam} vs {match.awayTeam}</p>
                <p className="text-sm text-gray-400">ID: {match.id}</p>
                <p className="text-sm text-gray-400">League: {match.league}</p>
                <p className="text-sm text-gray-400">Kickoff: {match.kickoff}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Raw Data */}
        <div className="p-4 bg-gray-900 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Raw Data</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(matches, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
