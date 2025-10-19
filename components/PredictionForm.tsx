'use client';

import { useState, useEffect } from 'react';
import { Match } from '@/lib/matches';
import { MatchCard } from './MatchCard';
import { PaymentModal } from './PaymentModal';
import { CONTRACTS, SEERSLEAGUE_ABI, ENTRY_FEE, hasFreeTrial, hasPredictedToday, UserStats } from '@/lib/contract-interactions';
import { useMiniKit } from './MiniKitProvider';
import { encodeFunctionData } from 'viem';
import toast from 'react-hot-toast';

interface PredictionFormProps {
  matches: Match[];
}

export function PredictionForm({ matches }: PredictionFormProps) {
  const { isReady, sdk } = useMiniKit();
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [predictions, setPredictions] = useState<(1 | 2 | 3 | 0)[]>(new Array(5).fill(0));
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isPending, setIsPending] = useState(false);
  
  // Get user address and stats
  useEffect(() => {
    const getUserData = async () => {
      if (isReady && sdk) {
        try {
          // Get user address
          const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
            setIsConnected(true);
            
            // Get user stats from contract
            await getUserStats(accounts[0]);
          }
        } catch (error) {
          console.error('Error getting user data:', error);
        }
      }
    };
    
    getUserData();
  }, [isReady, sdk]);
  
  const getUserStats = async (userAddress: string) => {
    if (!sdk) return;
    
    try {
      // For now, simulate user stats since we don't have real contract integration yet
      // In real implementation, would call getUserStats(address) function
      console.log('Fetching user stats for:', userAddress);
      
      // Parse stats (simplified for now)
      setUserStats({
        correctPredictions: 0,
        totalPredictions: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastPredictionDate: 0,
        hasUsedFreeTrial: false
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };
  
  const handleOutcomeSelect = (matchIndex: number, outcome: 1 | 2 | 3) => {
    const newPredictions = [...predictions];
    newPredictions[matchIndex] = outcome;
    setPredictions(newPredictions);
  };
  
  const handleSubmit = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!userStats) {
      toast.error('Loading user data...');
      return;
    }
    
    // Check if already predicted today
    if (hasPredictedToday(userStats)) {
      toast.error('You already submitted predictions today!');
      return;
    }
    
    // Validate at least one prediction is made
    const selectedPredictions = predictions.filter(p => p !== 0);
    if (selectedPredictions.length === 0) {
      toast.error('Please select at least one prediction');
      return;
    }
    
    const isFreeTrial = hasFreeTrial(userStats);
    
    if (isFreeTrial) {
      // Submit directly for free trial
      await submitPredictions();
    } else {
      // Show payment modal for paid users
      setShowPaymentModal(true);
    }
  };
  
  const submitPredictions = async () => {
    if (!sdk || !address) {
      toast.error('Wallet not connected');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setIsPending(true);
      
      // Encode predictions for contract call
      const predictionsBytes = predictions.map(p => {
        if (p === 1) return '0x01'; // Home win
        if (p === 2) return '0x02'; // Draw
        if (p === 3) return '0x03'; // Away win
        return '0x00'; // Invalid
      });
      
      // Get current day (simplified - in real app would use proper day calculation)
      const currentDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      
      // Real on-chain transaction
      console.log('Submitting predictions to contract:', {
        day: currentDay,
        predictions: predictionsBytes,
        address
      });
      
      // Get only selected predictions
      const selectedIndices: number[] = [];
      const selectedPredictions: number[] = [];
      
      predictions.forEach((prediction, index) => {
        if (prediction !== 0) {
          selectedIndices.push(index);
          selectedPredictions.push(prediction);
        }
      });
      
      // Get match IDs for selected predictions only
      const matchIds = selectedIndices.map(index => parseInt(matches[index].id));
      
      // Encode function call data for submitPredictions(uint32[] matchIds, uint8[] outcomes)
      const encodedData = encodeFunctionData({
        abi: SEERSLEAGUE_ABI,
        functionName: 'submitPredictions',
        args: [matchIds, selectedPredictions]
      });
      
      // Send transaction
      const txHash = await sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          to: CONTRACTS.SEERSLEAGUE,
          data: encodedData,
          from: address as `0x${string}`,
          value: '0x0' // No ETH value, only USDC if needed
        }]
      });
      
      console.log('Transaction submitted:', txHash);
      toast.success(`Predictions submitted! Transaction: ${txHash.slice(0, 10)}...`);
      
      // Update user stats
      setUserStats(prev => prev ? {
        ...prev,
        totalPredictions: prev.totalPredictions + 1,
        lastPredictionDate: currentDay,
        hasUsedFreeTrial: true
      } : null);
      
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error('Failed to submit predictions. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsPending(false);
      setShowPaymentModal(false);
    }
  };
  
  const isFormValid = predictions.some(p => p !== 0);
  const isFreeTrial = userStats ? hasFreeTrial(userStats) : false;
  const alreadyPredicted = userStats ? hasPredictedToday(userStats) : false;
  
  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 mb-4">Please connect your wallet to make predictions</p>
      </div>
    );
  }
  
  if (alreadyPredicted) {
    return (
      <div className="card text-center py-8">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-xl font-bold mb-2">Predictions Submitted!</h3>
        <p className="text-gray-400 mb-4">
          You've already submitted your predictions for today.
        </p>
        <p className="text-sm text-gray-500">
          Check back tomorrow for new matches!
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Free Trial Notice */}
      {isFreeTrial && (
        <div className="card bg-green-900 bg-opacity-20 border-green-700">
          <div className="flex items-center space-x-2">
            <span className="text-green-400">🎉</span>
            <span className="font-semibold text-green-400">First Day FREE!</span>
          </div>
          <p className="text-sm text-green-300 mt-1">
            Enjoy your free trial. Future days will cost $1 USDC.
          </p>
        </div>
      )}
      
      {/* Payment Notice */}
      {!isFreeTrial && (
        <div className="card bg-blue-900 bg-opacity-20 border-blue-700">
          <div className="flex items-center space-x-2">
            <span className="text-blue-400">💰</span>
            <span className="font-semibold text-blue-400">Entry Fee: $1 USDC</span>
          </div>
          <p className="text-sm text-blue-300 mt-1">
            Submit your predictions to compete for daily prizes.
          </p>
        </div>
      )}
      
      {/* Match Cards */}
      <div className="space-y-4">
        {matches.map((match, index) => (
          <MatchCard
            key={match.id}
            match={match}
            selectedOutcome={predictions[index] || undefined}
            onOutcomeSelect={(outcome) => handleOutcomeSelect(index, outcome)}
            disabled={isSubmitting || isPending}
          />
        ))}
      </div>
      
      {/* Submit Button */}
      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting || isPending}
          className="btn-primary px-8 py-3 text-lg disabled:opacity-50"
        >
          {isSubmitting || isPending ? (
            <div className="flex items-center space-x-2">
              <div className="spinner"></div>
              <span>Submitting...</span>
            </div>
          ) : (
            <>
              {isFreeTrial ? 'Submit FREE Predictions' : 'Submit Predictions ($1 USDC)'}
            </>
          )}
        </button>
        
        {!isFormValid && (
          <p className="text-sm text-gray-400 mt-2">
            Please select at least one prediction (up to 5 matches)
          </p>
        )}
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          onSuccess={submitPredictions}
          onCancel={() => setShowPaymentModal(false)}
          amount={ENTRY_FEE}
        />
      )}
    </div>
  );
}
