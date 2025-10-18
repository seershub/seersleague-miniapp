// import { parseUnits, formatUnits } from 'viem';
import { SEERSLEAGUE_ABI, USDC_ABI } from './contracts/abi';

// Re-export ABIs for components
export { SEERSLEAGUE_ABI, USDC_ABI };

// Contract addresses (Base Mainnet)
export const CONTRACTS = {
  SEERSLEAGUE: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`,
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
} as const;

// Entry fee: 1 USDC (6 decimals) - placeholder for now
export const ENTRY_FEE = BigInt(1000000); // 1 USDC = 1,000,000 units

export interface UserStats {
  correctPredictions: number;
  totalPredictions: number;
  currentStreak: number;
  longestStreak: number;
  lastPredictionDate: number;
  hasUsedFreeTrial: boolean;
}

export interface Prediction {
  matchId: number;
  outcome: number;
  timestamp: number;
}

export interface DailyPool {
  totalFees: bigint;
  participantCount: number;
  distributed: boolean;
}

/**
 * Check if user has free trial available
 */
export function hasFreeTrial(userStats: UserStats): boolean {
  return !userStats.hasUsedFreeTrial;
}

/**
 * Check if user already predicted today
 */
export function hasPredictedToday(userStats: UserStats): boolean {
  const today = Math.floor(Date.now() / 86400000); // Days since epoch
  return userStats.lastPredictionDate === today;
}

/**
 * Calculate accuracy percentage
 */
export function calculateAccuracy(userStats: UserStats): number {
  if (userStats.totalPredictions === 0) return 0;
  return Math.round((userStats.correctPredictions / userStats.totalPredictions) * 100);
}

/**
 * Format USDC amount for display - placeholder for now
 */
export function formatUSDC(amount: bigint): string {
  return (Number(amount) / 1000000).toFixed(6);
}

/**
 * Parse USDC amount from string - placeholder for now
 */
export function parseUSDC(amount: string): bigint {
  return BigInt(Math.floor(parseFloat(amount) * 1000000));
}

/**
 * Contract interaction hooks and utilities
 */
export const contractUtils = {
  // Check USDC balance
  checkUSDCBalance: async (address: `0x${string}`) => {
    // Implementation with wagmi hook
    return null; // Placeholder
  },

  // Check USDC allowance
  checkUSDCAllowance: async (address: `0x${string}`, spender: `0x${string}`) => {
    // Implementation with wagmi hook
    return null; // Placeholder
  },

  // Approve USDC spending
  approveUSDC: async (spender: `0x${string}`, amount: bigint) => {
    // Implementation with wagmi hook
    return null; // Placeholder
  },

  // Submit predictions
  submitPredictions: async (matchIds: number[], outcomes: number[]) => {
    // Implementation with wagmi hook
    return null; // Placeholder
  },

  // Get user stats
  getUserStats: async (address: `0x${string}`) => {
    // Implementation with wagmi hook
    return null; // Placeholder
  },

  // Get user prediction for specific match
  getUserPrediction: async (address: `0x${string}`, matchId: number) => {
    // Implementation with wagmi hook
    return null; // Placeholder
  },

  // Get daily pool info
  getDailyPool: async (date: number) => {
    // Implementation with wagmi hook
    return null; // Placeholder
  },

  // Calculate user accuracy
  getUserAccuracy: async (address: `0x${string}`) => {
    // Implementation with wagmi hook
    return null; // Placeholder
  }
};

/**
 * Error messages for common contract interactions
 */
export const CONTRACT_ERRORS = {
  ALREADY_PREDICTED_TODAY: 'Already predicted today',
  INSUFFICIENT_USDC_BALANCE: 'Insufficient USDC balance',
  USDC_APPROVAL_FAILED: 'USDC approval failed',
  USDC_TRANSFER_FAILED: 'USDC transfer failed',
  INVALID_OUTCOME: 'Invalid outcome (must be 1, 2, or 3)',
  MUST_PREDICT_5_MATCHES: 'Must predict exactly 5 matches',
  CONTRACT_PAUSED: 'Contract is paused',
  NO_PREDICTION_FOUND: 'No prediction found for this match',
} as const;

/**
 * Parse contract error messages
 */
export function parseContractError(error: any): string {
  const message = error?.message || error?.toString() || 'Unknown error';
  
  if (message.includes('Already predicted today')) {
    return 'You already submitted predictions today!';
  }
  if (message.includes('Insufficient')) {
    return 'Insufficient USDC balance. Please add more USDC to your wallet.';
  }
  if (message.includes('transfer failed')) {
    return 'Payment failed. Please try again.';
  }
  if (message.includes('Invalid outcome')) {
    return 'Please select an outcome for all matches.';
  }
  if (message.includes('Must predict exactly 5')) {
    return 'Please predict exactly 5 matches.';
  }
  if (message.includes('paused')) {
    return 'The platform is temporarily paused. Please try again later.';
  }
  
  return 'Transaction failed. Please try again.';
}
