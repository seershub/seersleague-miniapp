'use client';

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import SystemStatusV2 from '@/components/SystemStatusV2';
import MatchListV2 from '@/components/MatchListV2';
import PredictionHistoryV2 from '@/components/PredictionHistoryV2';

export default function Home() {
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'history' | 'status'>('matches');
  const [userAddress, setUserAddress] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize Farcaster Mini App SDK
        await sdk.actions.ready();
        setIsReady(true);
        
        // Get user context if available
        const context = sdk.context;
        if (context?.user) {
          setUserAddress(context.user.fid);
        }
        
        console.log('✅ [SEERS LEAGUE V2] App initialized successfully');
      } catch (error) {
        console.error('❌ [SEERS LEAGUE V2] Initialization failed:', error);
        // Still show app even if SDK fails
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Seers League V2</h2>
          <p className="text-gray-600">Loading enhanced prediction system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-blue-600">🏆 Seers League V2</div>
              <div className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Enhanced System
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {userAddress ? `User: ${userAddress}` : 'Guest User'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('matches')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'matches'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏈 Matches
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 My Predictions
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'status'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔍 System Status
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'matches' && (
          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Football Predictions V2</h1>
              <p className="text-gray-600">
                Enhanced prediction system with 10-minute deadline rule and automatic match management.
              </p>
            </div>
            <MatchListV2 />
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Prediction History V2</h1>
              <p className="text-gray-600">
                Track all your predictions with real match results and accuracy statistics.
              </p>
            </div>
            {userAddress ? (
              <PredictionHistoryV2 userAddress={userAddress} />
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <div className="text-4xl mb-2">🔐</div>
                  <p className="font-medium">Please connect your wallet to view prediction history</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'status' && (
          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">System Status V2</h1>
              <p className="text-gray-600">
                Monitor system health, contract status, and performance metrics.
              </p>
            </div>
            <SystemStatusV2 />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Seers League V2 - Enhanced Football Prediction System</p>
            <p className="mt-1">
              Built with Base Mini Apps • Real match results • 10-minute deadline rule
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}