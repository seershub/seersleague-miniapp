'use client';

import { useState, useEffect } from 'react';
import { Match } from '@/lib/matches';
import { MatchCard } from './MatchCard';
import { PaymentModal } from './PaymentModal';
import { CONTRACTS, SEERSLEAGUE_ABI, PREDICTION_FEE, UserStats, formatUSDC } from '@/lib/contract-interactions';
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
  const [selectedMatches, setSelectedMatches] = useState<number[]>([]);
  const [predictions, setPredictions] = useState<{[matchId: number]: 1 | 2 | 3}>({});
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
        freePredictionsUsed: 0,
        currentStreak: 0,
        longestStreak: 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };
  
  const toggleMatchSelection = (matchId: number) => {
    if (predictions[matchId] !== undefined) {
      // Remove prediction
      const newPredictions = { ...predictions };
      delete newPredictions[matchId];
      setPredictions(newPredictions);
      
      setSelectedMatches(prev => prev.filter(id => id !== matchId));
    } else {
      // Add match to selection (but user still needs to select outcome)
      setSelectedMatches(prev => [...prev, matchId]);
    }
  };

  const handleOutcomeSelect = (matchId: number, outcome: 1 | 2 | 3) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: outcome
    }));
    
    // Automatically add to selected matches when outcome is selected
    setSelectedMatches(prev => {
      if (!prev.includes(matchId)) {
        return [...prev, matchId];
      }
      return prev;
    });
  };
  
  const handleSubmit = async () => {
    console.log('Submit attempt:', { isConnected, address, isFormValid });
    
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!userStats) {
      toast.error('Loading user data...');
      return;
    }
    
    // Validate at least one prediction is made
    if (Object.keys(predictions).length === 0) {
      toast.error('Please select at least one match to predict');
      return;
    }
    
    // Calculate payment needed
    const remainingFreePredictions = Math.max(0, 5 - userStats.freePredictionsUsed);
    const predictionsToPayFor = Math.max(0, selectedMatches.length - remainingFreePredictions);
    const totalFee = BigInt(predictionsToPayFor) * PREDICTION_FEE;
    
    if (totalFee > 0) {
      // Show payment modal for paid predictions
      setShowPaymentModal(true);
    } else {
      // Submit directly for free predictions
      await submitPredictions();
    }
  };
  
  const submitPredictions = async () => {
    if (!sdk || !address) {
      toast.error('Wallet not connected');
      return;
    }
    
    // Show loading toast immediately
    const loadingToast = toast.loading('Tahminler gönderiliyor...');
    
    try {
      setIsSubmitting(true);
      setIsPending(true);
      
      // Prepare match IDs and outcomes for predictions only
      const matchIds = Object.keys(predictions).map(id => BigInt(parseInt(id)));
      const outcomes = Object.keys(predictions).map(matchId => predictions[parseInt(matchId)]);
      
      // Real on-chain transaction
      console.log('Submitting predictions to contract:', {
        matchIds,
        outcomes,
        address
      });
      
      // Encode function call data for submitPredictions(uint256[] matchIds, uint8[] outcomes)
      const encodedData = encodeFunctionData({
        abi: SEERSLEAGUE_ABI,
        functionName: 'submitPredictions',
        args: [matchIds, outcomes]
      });
      
      // Debug contract address and environment
      console.log('Contract address:', CONTRACTS.SEERSLEAGUE);
      console.log('Environment check:', {
        contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
        contractsSeersLeague: CONTRACTS.SEERSLEAGUE,
        isUndefined: CONTRACTS.SEERSLEAGUE === undefined,
        isString: typeof CONTRACTS.SEERSLEAGUE === 'string'
      });
      
      if (!CONTRACTS.SEERSLEAGUE || CONTRACTS.SEERSLEAGUE.length < 42) {
        toast.dismiss(loadingToast);
        toast.error('Contract address not configured. Please check environment variables.');
        console.error('Contract address missing:', CONTRACTS.SEERSLEAGUE);
        return;
      }
      
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
      
      // Update loading toast to show transaction submitted
      toast.dismiss(loadingToast);
      toast.success(`İşlem bloğa gönderildi... Hash: ${txHash.slice(0, 10)}...`);
      
      // Wait for transaction receipt
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max wait
      
      while (!receipt && attempts < maxAttempts) {
        try {
          receipt = await sdk.wallet.ethProvider.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash]
          });
          
          if (!receipt) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            attempts++;
          }
        } catch (error) {
          console.error('Error checking transaction receipt:', error);
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      }
      
      if (receipt) {
        // Check transaction status
        if (receipt.status && receipt.status !== '0x0') {
          // Success!
          toast.success(
            <div>
              <div className="font-bold text-green-600">✅ Başarılı!</div>
              <div className="text-sm text-gray-600 mt-1">Tahminleriniz kaydedildi.</div>
              <a 
                href={`https://basescan.org/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm mt-1 inline-block"
              >
                İşlemi Görüntüle →
              </a>
            </div>,
            { duration: 8000 }
          );
          
          // Update user stats
          const predictionCount = Object.keys(predictions).length;
          setUserStats(prev => prev ? {
            ...prev,
            totalPredictions: prev.totalPredictions + predictionCount,
            freePredictionsUsed: Math.min(prev.freePredictionsUsed + predictionCount, 5)
          } : null);
          
          // Clear selections
          setSelectedMatches([]);
          setPredictions({});
        } else {
          // Transaction failed
          toast.error(
            <div>
              <div className="font-bold text-red-600">❌ İşlem Başarısız</div>
              <div className="text-sm text-gray-600 mt-1">Transaction reverted on chain</div>
              <a 
                href={`https://basescan.org/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm mt-1 inline-block"
              >
                İşlemi Görüntüle →
              </a>
            </div>,
            { duration: 8000 }
          );
        }
      } else {
        // Timeout waiting for receipt
        toast.error('İşlem zaman aşımına uğradı. Lütfen Basescan\'dan kontrol edin.', { duration: 6000 });
      }
      
    } catch (error: any) {
      console.error('Submission error:', error);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Show specific error messages
      let errorMessage = 'Failed to submit predictions. Please try again.';
      
      if (error.message) {
        if (error.message.includes('User rejected') || error.message.includes('User denied')) {
          errorMessage = 'İşlem kullanıcı tarafından reddedildi.';
        } else if (error.message.includes('Prediction deadline passed')) {
          errorMessage = 'Bu maçın tahmin süresi dolmuş.';
        } else if (error.message.includes('Match is not registered')) {
          errorMessage = 'Bu maç henüz kayıtlı değil.';
        } else if (error.message.includes('Match results already recorded')) {
          errorMessage = 'Bu maçın sonuçları zaten kaydedilmiş.';
        } else if (error.message.includes('Insufficient USDC balance')) {
          errorMessage = 'Yetersiz USDC bakiyesi.';
        } else {
          errorMessage = `Hata: ${error.message}`;
        }
      }
      
      toast.error(
        <div>
          <div className="font-bold text-red-600">❌ Hata!</div>
          <div className="text-sm text-gray-600 mt-1">{errorMessage}</div>
        </div>,
        { duration: 6000 }
      );
    } finally {
      setIsSubmitting(false);
      setIsPending(false);
      setShowPaymentModal(false);
    }
  };
  
  const isFormValid = Object.keys(predictions).length > 0;
  const remainingFreePredictions = userStats ? Math.max(0, 5 - userStats.freePredictionsUsed) : 5;
  const predictionsToPayFor = Math.max(0, Object.keys(predictions).length - remainingFreePredictions);
  const totalFee = BigInt(predictionsToPayFor) * PREDICTION_FEE;
  
  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 mb-4">Please connect your wallet to make predictions</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Free Predictions Info */}
      <div className="card bg-blue-900 bg-opacity-20 border-blue-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-blue-400">🎯</span>
            <span className="font-semibold text-blue-400">Flexible Predictions</span>
          </div>
          <span className="text-sm text-blue-300">
            {remainingFreePredictions} free predictions left
          </span>
        </div>
        <p className="text-sm text-blue-300 mt-1">
          Select any matches you want to predict. First 5 predictions are free, then 0.5 USDC per match.
        </p>
      </div>
      
      {/* Payment Summary */}
      {Object.keys(predictions).length > 0 && (
        <div className="card bg-green-900 bg-opacity-20 border-green-700">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-green-400">Selected Matches: {Object.keys(predictions).length}</span>
            <span className="text-green-300">
              {predictionsToPayFor > 0 ? `Fee: ${formatUSDC(totalFee)} USDC` : 'FREE'}
            </span>
          </div>
        </div>
      )}
      
      {/* Match Cards */}
      <div className="space-y-4">
        {matches.map((match) => {
          const matchId = parseInt(match.id);
          const selectedOutcome = predictions[matchId];
          const isSelected = selectedOutcome !== undefined;
          
          return (
            <div key={match.id} className="relative">
              {/* Match Selection Checkbox */}
              <div className="flex items-center space-x-3 mb-3">
                <input
                  type="checkbox"
                  id={`match-${matchId}`}
                  checked={isSelected}
                  onChange={() => toggleMatchSelection(matchId)}
                  disabled={isSubmitting || isPending}
                  className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor={`match-${matchId}`} className="text-sm font-medium text-gray-300">
                  Predict this match
                </label>
              </div>
              
              {/* Match Card - Always visible */}
              <MatchCard
                match={match}
                selectedOutcome={selectedOutcome}
                onOutcomeSelect={(outcome) => handleOutcomeSelect(matchId, outcome)}
                disabled={isSubmitting || isPending}
              />
            </div>
          );
        })}
      </div>
      
      {/* Submit Button */}
      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting || isPending}
          className="btn-primary px-8 py-3 text-lg disabled:opacity-50"
          title={`Form valid: ${isFormValid}, Submitting: ${isSubmitting}, Pending: ${isPending}`}
        >
          {isSubmitting || isPending ? (
            <div className="flex items-center space-x-2">
              <div className="spinner"></div>
              <span>Submitting...</span>
            </div>
          ) : (
            <>
              {totalFee > 0 ? `Submit Predictions (${formatUSDC(totalFee)} USDC)` : 'Submit FREE Predictions'}
            </>
          )}
        </button>
        
        {!isFormValid && (
          <p className="text-sm text-gray-400 mt-2">
            Please select at least one match and choose outcomes
          </p>
        )}
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          onSuccess={submitPredictions}
          onCancel={() => setShowPaymentModal(false)}
          amount={totalFee}
        />
      )}
    </div>
  );
}
