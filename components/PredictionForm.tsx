'use client';

import { useState } from 'react';
// import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Match } from '@/lib/matches';
import { MatchCard } from './MatchCard';
import { PaymentModal } from './PaymentModal';
import { CONTRACTS, SEERSLEAGUE_ABI, ENTRY_FEE, hasFreeTrial, hasPredictedToday } from '@/lib/contract-interactions';
import toast from 'react-hot-toast';

interface PredictionFormProps {
  matches: Match[];
}

export function PredictionForm({ matches }: PredictionFormProps) {
  // const { address, isConnected } = useAccount();
  const address = null; // Placeholder for now
  const isConnected = false; // Placeholder for now
  const [predictions, setPredictions] = useState<(1 | 2 | 3)[]>(new Array(5).fill(0) as (1 | 2 | 3)[]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get user stats to check free trial and today's predictions - placeholder for now
  const userStats = null; // Placeholder for now
  
  // const { writeContract, data: hash } = useWriteContract();
  // const { isLoading: isPending } = useWaitForTransactionReceipt({ hash });
  const isPending = false; // Placeholder for now
  
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
    
    // Validate all predictions are made
    if (predictions.some(p => p === 0)) {
      toast.error('Please select an outcome for all matches');
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
    try {
      setIsSubmitting(true);
      
      // Placeholder for now - will be implemented with Farcaster Mini App SDK
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Predictions submitted successfully! 🎉');
      
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error('Failed to submit predictions. Please try again.');
    } finally {
      setIsSubmitting(false);
      setShowPaymentModal(false);
    }
  };
  
  const isFormValid = predictions.every(p => p !== 0);
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
            Please select an outcome for all 5 matches
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
