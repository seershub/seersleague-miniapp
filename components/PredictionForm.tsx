'use client';

import { useState, useEffect } from 'react';
import { Match } from '@/lib/matches';
import { MatchCard } from './MatchCard';
import { PaymentModal } from './PaymentModal';
import { CONTRACTS, SEERSLEAGUE_ABI, PREDICTION_FEE, UserStats, formatUSDC, USDC_ABI } from '@/lib/contract-interactions';
import { useMiniKit } from './MiniKitProvider';
import { encodeFunctionData, parseUnits } from 'viem';
import { publicClient } from '@/lib/viem-config';
import { useAccount, useReadContract, useSendCalls } from 'wagmi';
import { erc20Abi } from 'viem';
import toast from 'react-hot-toast';

interface PredictionFormProps {
  matches: Match[];
}

export function PredictionForm({ matches }: PredictionFormProps) {
  const { isReady, sdk } = useMiniKit();
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Wagmi hooks for EIP-5792 batch transactions
  const { address: wagmiAddress } = useAccount();
  const { sendCalls } = useSendCalls();
  
  // Check USDC allowance for batch transactions
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: erc20Abi,
    functionName: 'allowance',
    args: wagmiAddress ? [wagmiAddress, CONTRACTS.SEERSLEAGUE] : undefined,
  });
  const [selectedMatches, setSelectedMatches] = useState<number[]>([]);
  const [predictions, setPredictions] = useState<{[matchId: number]: 1 | 2 | 3}>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isPending, setIsPending] = useState(false);
  
  // Get user address and stats
  useEffect(() => {
    const getUserData = async () => {
      console.log('PredictionForm: Getting user data...', { isReady, sdk: !!sdk });
      
      if (isReady && sdk) {
        try {
          // Check if wallet provider is available
          if (sdk.wallet && sdk.wallet.ethProvider) {
            console.log('PredictionForm: Requesting accounts...');
            // Get user address
            const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_accounts' });
            console.log('PredictionForm: Accounts received:', accounts);
            
            if (accounts && accounts.length > 0) {
              setAddress(accounts[0]);
              setIsConnected(true);
              console.log('PredictionForm: User connected:', accounts[0]);
              
              // Get user stats from contract
              await getUserStats(accounts[0]);
            } else {
              console.log('PredictionForm: No accounts found');
              setIsConnected(false);
            }
          } else {
            console.log('PredictionForm: Wallet provider not available');
            setIsConnected(false);
          }
        } catch (error) {
          console.error('PredictionForm: Error getting user data:', error);
          setIsConnected(false);
        }
      } else {
        console.log('PredictionForm: SDK not ready');
        setIsConnected(false);
      }
    };
    
    if (isReady) {
      // Add delay to ensure wallet is ready
      const timer = setTimeout(getUserData, 1000);
      return () => clearTimeout(timer);
    }
  }, [isReady, sdk]);
  
  const getUserStats = async (userAddress: string) => {
    if (!sdk) return;
    try {
      console.log('PredictionForm: Fetching user stats for:', userAddress);

      // Direct blockchain call - works with Alchemy API key
      const stats = await publicClient.readContract({
        address: CONTRACTS.SEERSLEAGUE,
        abi: SEERSLEAGUE_ABI,
        functionName: 'getUserStats',
        args: [userAddress as `0x${string}`]
      }) as unknown as {
        correctPredictions: bigint;
        totalPredictions: bigint;
        freePredictionsUsed: bigint;
        currentStreak: bigint;
        longestStreak: bigint;
      };

      const userStatsData = {
        correctPredictions: Number(stats.correctPredictions || 0),
        totalPredictions: Number(stats.totalPredictions || 0),
        freePredictionsUsed: Number(stats.freePredictionsUsed || 0),
        currentStreak: Number(stats.currentStreak || 0),
        longestStreak: Number(stats.longestStreak || 0)
      };

      console.log('PredictionForm: User stats received:', userStatsData);
      setUserStats(userStatsData);
    } catch (error) {
      console.error('PredictionForm: Error fetching user stats:', error);
      // Set default stats on error
      setUserStats({
        correctPredictions: 0,
        totalPredictions: 0,
        freePredictionsUsed: 0,
        currentStreak: 0,
        longestStreak: 0
      });
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
    
    // Submit predictions directly - fee calculation is handled inside submitPredictions
    await submitPredictions();
  };
  
  const submitPredictions = async (skipModal: boolean = false) => {
    if (!sdk || !address || !wagmiAddress) {
      toast.error('Wallet not connected');
      return;
    }

    // Show loading toast immediately
    const loadingToast = toast.loading('Submitting predictions...');

    try {
      setIsSubmitting(true);
      setIsPending(true);

      // Prepare match IDs and outcomes for predictions only
      const matchIds = Object.keys(predictions).map(id => BigInt(parseInt(id)));
      const outcomes = Object.keys(predictions).map(matchId => predictions[parseInt(matchId)]);

      // Calculate total fee needed (align with contract logic using on-chain stats)
      const predictionCount = Object.keys(predictions).length;
      const remainingFreePredictions = userStats ? Math.max(0, 5 - userStats.freePredictionsUsed) : 0;
      const predictionsToPayFor = Math.max(0, predictionCount - remainingFreePredictions);
      const totalFee = BigInt(predictionsToPayFor) * PREDICTION_FEE;

      console.log('🔍 DEBUG: Fee calculation details:', {
        predictionCount,
        userStats: userStats ? {
          freePredictionsUsed: userStats.freePredictionsUsed,
          totalPredictions: userStats.totalPredictions
        } : 'no stats',
        remainingFreePredictions,
        predictionsToPayFor,
        totalFee: totalFee.toString(),
        totalFeeAsNumber: Number(totalFee)
      });

      console.log('Submitting predictions to contract:', {
        matchIds,
        outcomes,
        address,
        predictionCount,
        remainingFreePredictions,
        predictionsToPayFor,
        totalFee: totalFee.toString()
      });

      // If fee required and modal not skipped, show payment modal for approval
      if (totalFee > 0 && !skipModal) {
        toast.dismiss(loadingToast);
        setShowPaymentModal(true);
        setIsSubmitting(false);
        setIsPending(false);
        return;
      }

      // EIP-5792 Batch Transaction: Approve + Predict in one signature
      if (totalFee > 0) {
        await submitBatchPredictions(matchIds, outcomes, totalFee);
      } else {
        // Free predictions - no approval needed
        await submitFreePredictions(matchIds, outcomes);
      }
      
      // Success handling
      toast.dismiss(loadingToast);
      toast.success('Predictions submitted successfully!');
      
      // Update user stats
      setUserStats(prev => prev ? {
        ...prev,
        totalPredictions: prev.totalPredictions + predictionCount,
        freePredictionsUsed: Math.min(prev.freePredictionsUsed + predictionCount, 5)
      } : null);
      
      // Clear selections
      setSelectedMatches([]);
      setPredictions({});
      
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to submit predictions. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsPending(false);
    }
  };

  // EIP-5792 Batch Transaction Functions
  const submitBatchPredictions = async (matchIds: bigint[], outcomes: (1 | 2 | 3)[], totalFee: bigint) => {
    if (!wagmiAddress || !currentAllowance) return;

    try {
      const transactions = [];

      // 1. Check if approval is needed
      if (currentAllowance < totalFee) {
        console.log('Adding USDC approval to batch transaction');
        transactions.push({
          to: CONTRACTS.USDC,
          abi: erc20Abi,
          functionName: 'approve',
          args: [CONTRACTS.SEERSLEAGUE, totalFee],
        });
      }

      // 2. Add prediction submission
      transactions.push({
        to: CONTRACTS.SEERSLEAGUE,
        abi: SEERSLEAGUE_ABI,
        functionName: 'submitPredictions',
        args: [matchIds, outcomes],
      });

      console.log(`Sending ${transactions.length} calls in one batch...`);
      await sendCalls({
        calls: transactions,
      });

      // Refresh allowance after successful transaction
      refetchAllowance();

    } catch (error) {
      console.error('Batch transaction failed:', error);
      throw error;
    }
  };

  const submitFreePredictions = async (matchIds: bigint[], outcomes: (1 | 2 | 3)[]) => {
    try {
      console.log('Submitting free predictions (no approval needed)');
      await sendCalls({
        calls: [{
          to: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'submitPredictions',
          args: [matchIds, outcomes],
        }],
      });
    } catch (error) {
      console.error('Free prediction submission failed:', error);
      throw error;
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
    <div className="space-y-4">
      
      {/* Payment Summary */}
      {Object.keys(predictions).length > 0 && (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Selected Matches: {Object.keys(predictions).length}</span>
            <span className="text-green-400 font-bold">
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
            <div key={match.id} className="space-y-3">
              {/* Match Selection Toggle - Modern Design */}
              <div className="relative">
                <input
                  type="checkbox"
                  id={`match-${matchId}`}
                  checked={isSelected}
                  onChange={() => toggleMatchSelection(matchId)}
                  disabled={isSubmitting || isPending}
                  className="peer sr-only"
                />
                <label
                  htmlFor={`match-${matchId}`}
                  className={`
                    flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer
                    transition-all duration-300 group
                    ${isSelected
                      ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/10 border-2 border-green-500/40'
                      : 'bg-gradient-to-r from-gray-800/50 to-gray-800/30 border-2 border-gray-700/40 hover:border-yellow-500/30'
                    }
                    ${(isSubmitting || isPending) ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Custom Checkbox Icon */}
                    <div className={`
                      flex items-center justify-center w-6 h-6 rounded-lg
                      transition-all duration-300
                      ${isSelected
                        ? 'bg-green-500 shadow-lg shadow-green-500/50'
                        : 'bg-gray-700 group-hover:bg-gray-600'
                      }
                    `}>
                      {isSelected ? (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-yellow-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </div>

                    {/* Label Text */}
                    <span className={`
                      font-semibold transition-colors
                      ${isSelected ? 'text-green-400' : 'text-gray-300 group-hover:text-white'}
                    `}>
                      {isSelected ? 'Prediction Selected' : 'Click to Predict This Match'}
                    </span>
                  </div>

                  {/* Status Badge */}
                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-green-400 uppercase tracking-wide">Active</span>
                    </div>
                  )}
                </label>
              </div>
              
              {/* Match Card */}
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
          className="relative w-full group"
        >
          {/* Main button container */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 p-[1px]">
            
            {/* Inner button */}
            <div className="relative bg-gray-900 rounded-2xl px-6 py-4 flex items-center justify-between
                            group-hover:bg-transparent transition-all duration-300">
              
              {/* Left side - Icon + Text */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 
                             flex items-center justify-center border border-blue-500/30">
                  <span className="text-lg">🎯</span>
                </div>
                
                <div className="text-left">
                  <div className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                    Make Prediction
                  </div>
                  <div className="text-xs text-white/50">
                    Join the competition
                  </div>
                </div>
              </div>
              
              {/* Right side - Entry fee */}
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">✨</span>
                <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500/20 to-blue-500/20 
                                border border-green-500/30">
                  <span className="text-sm font-bold text-white">
                    {totalFee > 0 ? `${formatUSDC(totalFee)} USDC` : 'FREE'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Animated shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
                            animate-pulse" />
          </div>
          
          {/* Glow effect */}
          <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-blue-500/50 to-cyan-500/50 
                         blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>
        
        {!isFormValid && (
          <p className="text-sm text-gray-400 mt-3">
            Please select at least one match and choose outcomes
          </p>
        )}
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          onSuccess={async () => {
            setShowPaymentModal(false);
            await submitPredictions(true); // Skip modal check, proceed to wallet transaction
          }}
          onCancel={() => setShowPaymentModal(false)}
          amount={totalFee}
        />
      )}
    </div>
  );
}
