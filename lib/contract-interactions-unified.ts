import { parseUnits, formatUnits } from 'viem';
import { SEERSLEAGUE_ABI } from './contracts/abi';

// Unified contract system - V1 + V2
export const CONTRACTS = {
  // V1 Contract (existing)
  SEERSLEAGUE_V1: process.env.NEXT_PUBLIC_SEERSLEAGUE_CONTRACT as `0x${string}`,
  
  // V2 Contract (new)
  SEERSLEAGUE_V2: process.env.NEXT_PUBLIC_SEERSLEAGUE_V2_CONTRACT as `0x${string}`,
  
  // Common
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
} as const;

// Determine which contract to use
export function getActiveContract(): 'v1' | 'v2' {
  // Use V2 if available, otherwise fallback to V1
  return process.env.NEXT_PUBLIC_SEERSLEAGUE_V2_CONTRACT ? 'v2' : 'v1';
}

export function getContractAddress(): `0x${string}` {
  const active = getActiveContract();
  return active === 'v2' ? CONTRACTS.SEERSLEAGUE_V2 : CONTRACTS.SEERSLEAGUE_V1;
}

export function getDeploymentBlock(): bigint {
  const active = getActiveContract();
  if (active === 'v2') {
    return BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK_V2 || '0');
  }
  return BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
}

// Unified ABI (will use V2 ABI if V2 is active)
export { SEERSLEAGUE_V2_ABI as SEERSLEAGUE_ABI } from './contracts/abi-v2';
export { SEERSLEAGUE_V2_ABI } from './contracts/abi-v2';

// Constants
export const PREDICTION_FEE = 500_000n; // 0.5 USDC (6 decimals)
export const TOTAL_FREE_PREDICTIONS = 5;

// Types
export interface UserStats {
  correctPredictions: bigint;
  totalPredictions: bigint;
  freePredictionsUsed: bigint;
  currentStreak: bigint;
  longestStreak: bigint;
  lastPredictionTime: bigint;
  totalFeesPaid: bigint;
}

export interface Prediction {
  matchId: bigint;
  outcome: number;
  timestamp: bigint;
  isProcessed: boolean;
}

export interface Match {
  id: bigint;
  startTime: bigint;
  homeScore: bigint;
  awayScore: bigint;
  isRecorded: boolean;
  exists: boolean;
  recordedAt: bigint;
}

// Helper functions
export function formatUSDC(amount: bigint): string {
  return formatUnits(amount, 6);
}

export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, 6);
}

export function getRemainingFreePredictions(userStats: UserStats): number {
  return Math.max(0, TOTAL_FREE_PREDICTIONS - Number(userStats.freePredictionsUsed));
}

export function calculatePredictionFee(userStats: UserStats, predictionCount: number): bigint {
  const remainingFree = getRemainingFreePredictions(userStats);
  const predictionsToPayFor = Math.max(0, predictionCount - remainingFree);
  return BigInt(predictionsToPayFor) * PREDICTION_FEE;
}

export function calculateAccuracy(userStats: UserStats): number {
  if (userStats.totalPredictions === 0n) return 0;
  return Math.round(Number(userStats.correctPredictions * 100n / userStats.totalPredictions));
}

export function isPredictionValid(prediction: Prediction): boolean {
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

export function getMatchStatus(match: Match): {
  status: 'upcoming' | 'live' | 'finished' | 'recorded';
  timeRemaining?: number;
  canPredict: boolean;
} {
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(match.startTime);
  const timeRemaining = startTime - now;
  const predictionDeadline = 10 * 60; // 10 minutes
  
  if (match.isRecorded) {
    return { status: 'recorded', canPredict: false };
  }
  
  if (timeRemaining > predictionDeadline) {
    return { 
      status: 'upcoming', 
      timeRemaining,
      canPredict: true 
    };
  }
  
  if (timeRemaining > 0) {
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
  userStats: UserStats
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
  userStats: UserStats
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
export async function getUserStats(
  publicClient: any,
  userAddress: string
): Promise<UserStats> {
  const contractAddress = getContractAddress();
  const stats = await publicClient.readContract({
    address: contractAddress,
    abi: SEERSLEAGUE_ABI,
    functionName: 'getUserStats',
    args: [userAddress as `0x${string}`]
  }) as UserStats;
  
  return stats;
}

export async function getUserPrediction(
  publicClient: any,
  userAddress: string,
  matchId: bigint
): Promise<Prediction> {
  const contractAddress = getContractAddress();
  const prediction = await publicClient.readContract({
    address: contractAddress,
    abi: SEERSLEAGUE_ABI,
    functionName: 'getUserPrediction',
    args: [userAddress as `0x${string}`, matchId]
  }) as Prediction;
  
  return prediction;
}

export async function getMatch(
  publicClient: any,
  matchId: bigint
): Promise<Match> {
  const contractAddress = getContractAddress();
  const match = await publicClient.readContract({
    address: contractAddress,
    abi: SEERSLEAGUE_ABI,
    functionName: 'getMatch',
    args: [matchId]
  }) as Match;
  
  return match;
}

export async function getUpcomingMatches(
  publicClient: any,
  limit: number = 20
): Promise<{ matchIds: bigint[]; startTimes: bigint[] }> {
  const contractAddress = getContractAddress();
  const active = getActiveContract();
  
  if (active === 'v2') {
    // Use V2 function
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: SEERSLEAGUE_ABI,
      functionName: 'getUpcomingMatches',
      args: [BigInt(limit)]
    }) as { matchIds: bigint[]; startTimes: bigint[] };
    
    return result;
  } else {
    // Fallback to V1 logic (implement as needed)
    return { matchIds: [], startTimes: [] };
  }
}

export async function getContractInfo(
  publicClient: any
): Promise<{
  version: string;
  owner: string;
  treasury: string;
  paused: boolean;
  totalMatches: bigint;
}> {
  const contractAddress = getContractAddress();
  const info = await publicClient.readContract({
    address: contractAddress,
    abi: SEERSLEAGUE_ABI,
    functionName: 'getContractInfo'
  }) as {
    version: string;
    owner: string;
    treasury: string;
    paused: boolean;
    totalMatches: bigint;
  };
  
  return info;
}
