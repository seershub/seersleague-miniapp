'use client';

import { useState, useEffect } from 'react';
import { Match } from '@/lib/matches';
import { MatchCard } from './MatchCard';
import { CONTRACTS, SEERSLEAGUE_ABI, PREDICTION_FEE, UserStats, formatUSDC, USDC_ABI } from '@/lib/contract-interactions';
import { useMiniKit } from './MiniKitProvider';
import { encodeFunctionData, parseUnits } from 'viem';
import { publicClient } from '@/lib/viem-config';
import toast from 'react-hot-toast';
import { Check, Plus, Sparkles } from 'lucide-react';

interface PredictionFormProps {
  matches: Match[];
}

export function PredictionForm({ matches }: PredictionFormProps) {
  const { isReady, sdk } = useMiniKit();
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [currentAllowance, setCurrentAllowance] = useState<bigint | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);

  useEffect(() => {
    const fetchUSDCData = async () => {
      if (!address) {
        setCurrentAllowance(null);
        setUsdcBalance(null);
        return;
      }

      try {
        const allowance = await publicClient.readContract({
          address: CONTRACTS.USDC,
          abi: USDC_ABI,
          functionName: 'allowance',
          args: [address as `0x${string}`, CONTRACTS.SEERSLEAGUE]
        }) as bigint;
        setCurrentAllowance(allowance);

        const balance = await publicClient.readContract({
          address: CONTRACTS.USDC,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`]
        }) as bigint;
        setUsdcBalance(balance);

        console.log('💰 USDC Data:', {
          balance: balance.toString(),
          allowance: allowance.toString(),
          balanceFormatted: formatUSDC(balance),
          allowanceFormatted: formatUSDC(allowance)
        });
      } catch (error) {
        console.error('Error fetching USDC data:', error);
        setCurrentAllowance(BigInt(0));
        setUsdcBalance(BigInt(0));
      }
    };

    fetchUSDCData();
  }, [address]);

  const [selectedMatches, setSelectedMatches] = useState<number[]>([]);
  const [predictions, setPredictions] = useState<{ [matchId: number]: 1 | 2 | 3 }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const getUserData = async () => {
      console.log('PredictionForm: Getting user data...', { isReady, sdk: !!sdk });

      if (isReady && sdk) {
        try {
          if (sdk.wallet && sdk.wallet.ethProvider) {
            console.log('PredictionForm: Requesting accounts...');
            const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_accounts' });
            console.log('PredictionForm: Accounts received:', accounts);

            if (accounts && accounts.length > 0) {
              setAddress(accounts[0]);
              setIsConnected(true);
              console.log('PredictionForm: User connected:', accounts[0]);
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
      const timer = setTimeout(getUserData, 1000);
      return () => clearTimeout(timer);
    }
  }, [isReady, sdk]);

  const getUserStats = async (userAddress: string) => {
    if (!sdk) return;
    try {
      console.log('PredictionForm: Fetching user stats for:', userAddress);

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
      const newPredictions = { ...predictions };
      delete newPredictions[matchId];
      setPredictions(newPredictions);
      setSelectedMatches(prev => prev.filter(id => id !== matchId));
    } else {
      setSelectedMatches(prev => [...prev, matchId]);
    }
  };

  const handleOutcomeSelect = (matchId: number, outcome: 1 | 2 | 3) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: outcome
    }));

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

    if (Object.keys(predictions).length === 0) {
      toast.error('Please select at least one match to predict');
      return;
    }

    const predictionCount = Object.keys(predictions).length;
    const remainingFree = userStats ? Math.max(0, 5 - userStats.freePredictionsUsed) : 0;
    const predictionsToPayFor = Math.max(0, predictionCount - remainingFree);
    const totalFee = BigInt(predictionsToPayFor) * PREDICTION_FEE;

    if (totalFee > 0) {
      if (usdcBalance === null) {
        toast.error('Loading USDC balance...');
        return;
      }

      if (usdcBalance < totalFee) {
        toast.error(`Insufficient USDC balance! Need ${formatUSDC(totalFee)} USDC`);
        return;
      }

      console.log('✅ Balance check passed:', {
        required: formatUSDC(totalFee),
        available: formatUSDC(usdcBalance)
      });
    }

    await submitPredictions();
  };

  const submitPredictions = async (skipModal: boolean = false) => {
    if (!sdk || !address) {
      toast.error('Wallet not connected');
      return;
    }

    const loadingToast = toast.loading('Submitting predictions...');

    try {
      setIsSubmitting(true);
      setIsPending(true);

      const matchIds = Object.keys(predictions).map(id => BigInt(parseInt(id)));
      const outcomes = Object.keys(predictions).map(matchId => predictions[parseInt(matchId)]);

      const predictionCount = Object.keys(predictions).length;
      const remainingFreePredictions = userStats ? Math.max(0, 5 - userStats.freePredictionsUsed) : 0;
      const predictionsToPayFor = Math.max(0, predictionCount - remainingFreePredictions);
      const totalFee = BigInt(predictionsToPayFor) * PREDICTION_FEE;

      console.log('🔍 Fee calculation:', {
        predictionCount,
        remainingFreePredictions,
        predictionsToPayFor,
        totalFee: totalFee.toString()
      });

      console.log('Submitting predictions:', { matchIds, outcomes, address, totalFee: totalFee.toString() });

      if (totalFee > 0) {
        await submitBatchPredictions(matchIds, outcomes, totalFee);
      } else {
        await submitFreePredictions(matchIds, outcomes);
      }

      toast.dismiss(loadingToast);
      toast.success('Predictions submitted successfully!');

      setUserStats(prev => prev ? {
        ...prev,
        totalPredictions: prev.totalPredictions + predictionCount,
        freePredictionsUsed: Math.min(prev.freePredictionsUsed + predictionCount, 5)
      } : null);

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

  const submitBatchPredictions = async (matchIds: bigint[], outcomes: (1 | 2 | 3)[], totalFee: bigint) => {
    if (!address || !sdk) return;

    try {
      console.log('🚀 Starting EIP-5792 batch transaction...');

      const predictData = encodeFunctionData({
        abi: SEERSLEAGUE_ABI,
        functionName: 'submitPredictions',
        args: [matchIds, outcomes]
      });

      const needsApproval = !currentAllowance || currentAllowance < totalFee;

      if (needsApproval) {
        console.log('📦 Sending batch: approve + predict (EIP-5792)');

        const approveData = encodeFunctionData({
          abi: USDC_ABI,
          functionName: 'approve',
          args: [CONTRACTS.SEERSLEAGUE, totalFee]
        });

        const batchId = await sdk.wallet.ethProvider.request({
          method: 'wallet_sendCalls',
          params: [{
            version: '1.0',
            chainId: '0x2105',
            from: address as `0x${string}`,
            calls: [
              { to: CONTRACTS.USDC, data: approveData, value: '0x0' },
              { to: CONTRACTS.SEERSLEAGUE, data: predictData, value: '0x0' }
            ]
          }]
        });

        console.log('✅ Batch transaction submitted:', batchId);
      } else {
        console.log('✅ Sufficient allowance, sending prediction only');

        await sdk.wallet.ethProvider.request({
          method: 'eth_sendTransaction',
          params: [{
            to: CONTRACTS.SEERSLEAGUE,
            data: predictData,
            from: address as `0x${string}`,
            value: '0x0'
          }]
        });

        console.log('✅ Prediction transaction submitted');
      }

      const [newAllowance, newBalance] = await Promise.all([
        publicClient.readContract({
          address: CONTRACTS.USDC,
          abi: USDC_ABI,
          functionName: 'allowance',
          args: [address as `0x${string}`, CONTRACTS.SEERSLEAGUE]
        }) as Promise<bigint>,
        publicClient.readContract({
          address: CONTRACTS.USDC,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`]
        }) as Promise<bigint>
      ]);

      setCurrentAllowance(newAllowance);
      setUsdcBalance(newBalance);

    } catch (error) {
      console.error('❌ EIP-5792 batch transaction failed:', error);
      throw error;
    }
  };

  const submitFreePredictions = async (matchIds: bigint[], outcomes: (1 | 2 | 3)[]) => {
    if (!address || !sdk) return;

    try {
      console.log('Submitting free predictions');
      const predictData = encodeFunctionData({
        abi: SEERSLEAGUE_ABI,
        functionName: 'submitPredictions',
        args: [matchIds, outcomes]
      });

      await sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          to: CONTRACTS.SEERSLEAGUE,
          data: predictData,
          from: address as `0x${string}`,
          value: '0x0'
        }]
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
        <p className="text-[rgb(var(--text-muted))]">Please connect your wallet to make predictions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Payment Summary */}
      {Object.keys(predictions).length > 0 && (
        <div className="glass-card p-4 border-[rgba(34,197,94,0.2)]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-white">Selected: {Object.keys(predictions).length}</span>
            <span className="font-semibold text-[rgb(var(--brand-green))]">
              {predictionsToPayFor > 0 ? `${formatUSDC(totalFee)} USDC` : 'FREE'}
            </span>
          </div>
          {usdcBalance !== null && predictionsToPayFor > 0 && (
            <div className="flex items-center justify-between text-sm pt-2 border-t border-[rgba(34,197,94,0.1)]">
              <span className="text-[rgb(var(--text-muted))]">Your Balance:</span>
              <span className={`font-medium ${usdcBalance >= totalFee ? 'text-[rgb(var(--brand-green))]' : 'text-[rgb(var(--brand-red))]'}`}>
                {formatUSDC(usdcBalance)} USDC
              </span>
            </div>
          )}
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
              {/* Match Selection Toggle */}
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
                      ? 'bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.25)]'
                      : 'bg-[rgba(24,24,30,0.6)] border border-[rgba(55,55,65,0.4)] hover:border-[rgba(245,158,11,0.3)]'
                    }
                    ${(isSubmitting || isPending) ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox Icon */}
                    <div className={`
                      flex items-center justify-center w-6 h-6 rounded-lg
                      transition-all duration-300
                      ${isSelected
                        ? 'bg-[rgb(var(--brand-green))]'
                        : 'bg-[rgba(55,55,65,0.8)] group-hover:bg-[rgba(75,75,85,0.8)]'
                      }
                    `}>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-black" strokeWidth={3} />
                      ) : (
                        <Plus className="w-4 h-4 text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--brand-gold))] transition-colors" />
                      )}
                    </div>

                    <span className={`
                      font-medium transition-colors text-sm
                      ${isSelected ? 'text-[rgb(var(--brand-green))]' : 'text-[rgb(var(--text-secondary))] group-hover:text-white'}
                    `}>
                      {isSelected ? 'Prediction Selected' : 'Click to Predict'}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[rgb(var(--brand-green))] rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-[rgb(var(--brand-green))] uppercase tracking-wide">Active</span>
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
      <div className="pt-2">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting || isPending}
          className={`
            w-full relative overflow-hidden rounded-2xl transition-all duration-300
            ${isFormValid
              ? 'bg-gradient-to-r from-[rgb(var(--brand-gold))] to-[rgb(var(--brand-gold-light))] hover:shadow-[0_10px_40px_rgba(245,158,11,0.25)] hover:-translate-y-0.5'
              : 'bg-[rgba(55,55,65,0.5)] cursor-not-allowed'
            }
          `}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center
                ${isFormValid ? 'bg-black/10' : 'bg-white/5'}
              `}>
                <Sparkles className={`w-5 h-5 ${isFormValid ? 'text-black' : 'text-[rgb(var(--text-muted))]'}`} />
              </div>
              <div className="text-left">
                <div className={`text-sm font-semibold ${isFormValid ? 'text-black' : 'text-[rgb(var(--text-muted))]'}`}>
                  Make Prediction
                </div>
                <div className={`text-xs ${isFormValid ? 'text-black/60' : 'text-[rgb(var(--text-muted))]'}`}>
                  Submit to blockchain
                </div>
              </div>
            </div>

            <div className={`
              px-4 py-2 rounded-xl text-sm font-bold
              ${isFormValid
                ? 'bg-black/10 text-black'
                : 'bg-white/5 text-[rgb(var(--text-muted))]'
              }
            `}>
              {totalFee > 0 ? formatUSDC(totalFee) + ' USDC' : 'FREE'}
            </div>
          </div>
        </button>

        {!isFormValid && (
          <p className="text-xs text-[rgb(var(--text-muted))] mt-3 text-center">
            Select at least one match and choose an outcome
          </p>
        )}
      </div>
    </div>
  );
}
