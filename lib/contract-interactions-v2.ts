import { parseUnits, formatUnits } from 'viem';
import { SEERSLEAGUE_V2_ABI } from './contracts/abi-v2';

// Contract addresses
export const CONTRACTS_V2 = {
  SEERSLEAGUE: process.env.NEXT_PUBLIC_SEERSLEAGUE_V2_CONTRACT as `0x${string}`,
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
} as const;

// Constants
export const PREDICTION_FEE = 500_000n; // 0.5 USDC (6 decimals)
export const TOTAL_FREE_PREDICTIONS = 5;

// Types
export interface UserStatsV2 {
  correctPredictions: bigint;
  totalPredictions: bigint;
  freePredictionsUsed: bigint;
  currentStreak: bigint;
  longestStreak: bigint;
  lastPredictionTime: bigint;
  totalFeesPaid: bigint;
}

export interface PredictionV2 {
  matchId: bigint;
  outcome: number;
  timestamp: bigint;
  isProcessed: boolean;
}

export interface MatchV2 {
  id: bigint;
  startTime: bigint;
  homeScore: bigint;
  awayScore: bigint;
  isRecorded: boolean;
  exists: boolean;
  recordedAt: bigint;
}

export interface ContractInfo {
  version: string;
  owner: string;
  treasury: string;
  paused: boolean;
  totalMatches: bigint;
}

// Helper functions
export function formatUSDC(amount: bigint): string {
  return formatUnits(amount, 6);
}

export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, 6);
}

export function getRemainingFreePredictions(userStats: UserStatsV2): number {
  return Math.max(0, TOTAL_FREE_PREDICTIONS - Number(userStats.freePredictionsUsed));
}

export function calculatePredictionFee(userStats: UserStatsV2, predictionCount: number): bigint {
  const remainingFree = getRemainingFreePredictions(userStats);
  const predictionsToPayFor = Math.max(0, predictionCount - remainingFree);
  return BigInt(predictionsToPayFor) * PREDICTION_FEE;
}

export function calculateAccuracy(userStats: UserStatsV2): number {
  if (userStats.totalPredictions === 0n) return 0;
  return Math.round(Number(userStats.correctPredictions * 100n / userStats.totalPredictions));
}

export function isPredictionValid(prediction: PredictionV2): boolean {
  return prediction.timestamp > 0n && !prediction.isProcessed;
}

export function getPredictionOutcomeText(outcome: number): string {
  switch (outcome) {
    case 1: return 'Home Win';
    case 2: return 'Draw';
    case 3: return 'Away Win';
    default: return 'Unknown';
  }
}

export function getMatchStatus(match: MatchV2): {
  status: 'upcoming' | 'live' | 'finished' | 'recorded';
  timeRemaining?: number;
  canPredict: boolean;
} {
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(match.startTime);
  const timeRemaining = startTime - now;
  
  if (match.isRecorded) {
    return { status: 'recorded', canPredict: false };
  }
  
  if (timeRemaining > 0) {
    return { 
      status: 'upcoming', 
      timeRemaining,
      canPredict: true 
    };
  }
  
  if (timeRemaining > -7200) { // Within 2 hours of start
    return { 
      status: 'live', 
      timeRemaining: 0,
      canPredict: false 
    };
  }
  
  return { 
    status: 'finished', 
    canPredict: false 
  };
}

export function validatePredictionData(
  matchIds: number[],
  outcomes: (1 | 2 | 3)[],
  userStats: UserStatsV2
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic validation
  if (matchIds.length === 0) {
    errors.push('At least one match must be selected');
  }
  
  if (matchIds.length > 5) {
    errors.push('Maximum 5 matches can be selected');
  }
  
  if (matchIds.length !== outcomes.length) {
    errors.push('Match count and outcome count must match');
  }
  
  // Outcome validation
  for (let i = 0; i < outcomes.length; i++) {
    if (outcomes[i] < 1 || outcomes[i] > 3) {
      errors.push(`Invalid outcome for match ${i + 1}: ${outcomes[i]}`);
    }
  }
  
  // Fee validation
  const totalFee = calculatePredictionFee(userStats, matchIds.length);
  if (totalFee > 0) {
    warnings.push(`This will cost ${formatUSDC(totalFee)} USDC`);
  }
  
  // Free predictions check
  const remainingFree = getRemainingFreePredictions(userStats);
  if (remainingFree > 0 && matchIds.length <= remainingFree) {
    warnings.push(`This will use ${matchIds.length} of your ${remainingFree} remaining free predictions`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function getPredictionSummary(
  matchIds: number[],
  outcomes: (1 | 2 | 3)[],
  userStats: UserStatsV2
): {
  totalMatches: number;
  freePredictions: number;
  paidPredictions: number;
  totalCost: string;
  remainingFree: number;
} {
  const remainingFree = getRemainingFreePredictions(userStats);
  const freePredictions = Math.min(matchIds.length, remainingFree);
  const paidPredictions = Math.max(0, matchIds.length - remainingFree);
  const totalCost = formatUSDC(calculatePredictionFee(userStats, matchIds.length));
  
  return {
    totalMatches: matchIds.length,
    freePredictions,
    paidPredictions,
    totalCost,
    remainingFree
  };
}

// Contract interaction helpers
export async function getUserStatsV2(
  publicClient: any,
  userAddress: string
): Promise<UserStatsV2> {
  const stats = await publicClient.readContract({
    address: CONTRACTS_V2.SEERSLEAGUE,
    abi: SEERSLEAGUE_V2_ABI,
    functionName: 'getUserStats',
    args: [userAddress as `0x${string}`]
  }) as UserStatsV2;
  
  return stats;
}

export async function getUserPredictionV2(
  publicClient: any,
  userAddress: string,
  matchId: bigint
): Promise<PredictionV2> {
  const prediction = await publicClient.readContract({
    address: CONTRACTS_V2.SEERSLEAGUE,
    abi: SEERSLEAGUE_V2_ABI,
    functionName: 'getUserPrediction',
    args: [userAddress as `0x${string}`, matchId]
  }) as PredictionV2;
  
  return prediction;
}

export async function getMatchV2(
  publicClient: any,
  matchId: bigint
): Promise<MatchV2> {
  const match = await publicClient.readContract({
    address: CONTRACTS_V2.SEERSLEAGUE,
    abi: SEERSLEAGUE_V2_ABI,
    functionName: 'getMatch',
    args: [matchId]
  }) as MatchV2;
  
  return match;
}

export async function getUserPredictionHistoryV2(
  publicClient: any,
  userAddress: string,
  offset: number = 0,
  limit: number = 50
): Promise<bigint[]> {
  const history = await publicClient.readContract({
    address: CONTRACTS_V2.SEERSLEAGUE,
    abi: SEERSLEAGUE_V2_ABI,
    functionName: 'getUserPredictionHistory',
    args: [userAddress as `0x${string}`, BigInt(offset), BigInt(limit)]
  }) as bigint[];
  
  return history;
}

export async function getContractInfoV2(
  publicClient: any
): Promise<ContractInfo> {
  const info = await publicClient.readContract({
    address: CONTRACTS_V2.SEERSLEAGUE,
    abi: SEERSLEAGUE_V2_ABI,
    functionName: 'getContractInfo'
  }) as ContractInfo;
  
  return info;
}

export async function isResultProcessedV2(
  publicClient: any,
  userAddress: string,
  matchId: bigint
): Promise<boolean> {
  const processed = await publicClient.readContract({
    address: CONTRACTS_V2.SEERSLEAGUE,
    abi: SEERSLEAGUE_V2_ABI,
    functionName: 'isResultProcessed',
    args: [userAddress as `0x${string}`, matchId]
  }) as boolean;
  
  return processed;
}
