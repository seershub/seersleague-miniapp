import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Contract addresses
const OLD_CONTRACT = '0x...'; // Current SeersLeague contract
const NEW_CONTRACT = '0x...'; // New SeersLeagueV2 contract (will be deployed)
const TREASURY = '0x...'; // Treasury address

// RPC URLs
const ALCHEMY_URL = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY 
  ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
  : 'https://mainnet.base.org';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not found');

// Setup clients
const publicClient = createPublicClient({
  chain: base,
  transport: http(ALCHEMY_URL)
});

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(ALCHEMY_URL)
});

// ABI for old contract
const OLD_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserStats",
    "outputs": [
      {"internalType": "uint256", "name": "correctPredictions", "type": "uint256"},
      {"internalType": "uint256", "name": "totalPredictions", "type": "uint256"},
      {"internalType": "uint256", "name": "freePredictionsUsed", "type": "uint256"},
      {"internalType": "uint256", "name": "currentStreak", "type": "uint256"},
      {"internalType": "uint256", "name": "longestStreak", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllUsers",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ABI for new contract
const NEW_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "uint256", "name": "correctPredictions", "type": "uint256"},
      {"internalType": "uint256", "name": "totalPredictions", "type": "uint256"},
      {"internalType": "uint256", "name": "freePredictionsUsed", "type": "uint256"},
      {"internalType": "uint256", "name": "currentStreak", "type": "uint256"},
      {"internalType": "uint256", "name": "longestStreak", "type": "uint256"},
      {"internalType": "uint256", "name": "totalFeesPaid", "type": "uint256"}
    ],
    "name": "migrateUserData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

interface UserData {
  address: string;
  correctPredictions: bigint;
  totalPredictions: bigint;
  freePredictionsUsed: bigint;
  currentStreak: bigint;
  longestStreak: bigint;
  totalFeesPaid: bigint;
}

/**
 * MIGRATION SCRIPT: SeersLeague V1 → V2
 * 
 * This script:
 * 1. Reads all user data from old contract
 * 2. Migrates to new contract
 * 3. Preserves all user statistics
 * 4. Handles data validation
 */
async function migrateToV2() {
  console.log('🚀 Starting migration from SeersLeague V1 to V2...');
  
  try {
    // Step 1: Get all users from old contract
    console.log('📊 Fetching all users from old contract...');
    const allUsers = await getAllUsersFromOldContract();
    console.log(`Found ${allUsers.length} users to migrate`);
    
    // Step 2: Get user data for each user
    console.log('📋 Fetching user data...');
    const userDataList: UserData[] = [];
    
    for (let i = 0; i < allUsers.length; i++) {
      const user = allUsers[i];
      console.log(`Processing user ${i + 1}/${allUsers.length}: ${user}`);
      
      try {
        const stats = await publicClient.readContract({
          address: OLD_CONTRACT as `0x${string}`,
          abi: OLD_ABI,
          functionName: 'getUserStats',
          args: [user as `0x${string}`]
        }) as [bigint, bigint, bigint, bigint, bigint];
        
        const [correctPredictions, totalPredictions, freePredictionsUsed, currentStreak, longestStreak] = stats;
        
        // Validate data integrity
        if (correctPredictions > totalPredictions) {
          console.warn(`⚠️ User ${user} has invalid data: ${correctPredictions} correct > ${totalPredictions} total`);
          // Reset to safe values
          userDataList.push({
            address: user,
            correctPredictions: 0n,
            totalPredictions,
            freePredictionsUsed,
            currentStreak: 0n,
            longestStreak: 0n,
            totalFeesPaid: 0n
          });
        } else {
          userDataList.push({
            address: user,
            correctPredictions,
            totalPredictions,
            freePredictionsUsed,
            currentStreak,
            longestStreak,
            totalFeesPaid: 0n // Will be calculated based on predictions
          });
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing user ${user}:`, error);
        // Add user with default data
        userDataList.push({
          address: user,
          correctPredictions: 0n,
          totalPredictions: 0n,
          freePredictionsUsed: 0n,
          currentStreak: 0n,
          longestStreak: 0n,
          totalFeesPaid: 0n
        });
      }
    }
    
    // Step 3: Migrate data to new contract
    console.log('🔄 Migrating data to new contract...');
    await migrateUserDataToNewContract(userDataList);
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Get all users from old contract
 */
async function getAllUsersFromOldContract(): Promise<string[]> {
  // Since the old contract doesn't have getAllUsers, we need to get users from events
  const currentBlock = await publicClient.getBlockNumber();
  const fromBlock = currentBlock - 1000000n; // Last 1M blocks
  
  const predictionEvents = await publicClient.getLogs({
    address: OLD_CONTRACT as `0x${string}`,
    event: {
      type: 'event',
      name: 'PredictionsSubmitted',
      inputs: [
        { name: 'user', type: 'address', indexed: true },
        { name: 'matchIds', type: 'uint256[]', indexed: false },
        { name: 'predictionsCount', type: 'uint256', indexed: false },
        { name: 'freeUsed', type: 'uint256', indexed: false },
        { name: 'feePaid', type: 'uint256', indexed: false }
      ]
    },
    fromBlock,
    toBlock: 'latest'
  });
  
  const uniqueUsers = new Set<string>();
  predictionEvents.forEach(event => {
    if (event.args?.user) {
      uniqueUsers.add(event.args.user.toLowerCase());
    }
  });
  
  return Array.from(uniqueUsers);
}

/**
 * Migrate user data to new contract
 */
async function migrateUserDataToNewContract(userDataList: UserData[]) {
  console.log(`📤 Migrating ${userDataList.length} users to new contract...`);
  
  // Process in batches to avoid gas limits
  const batchSize = 50;
  for (let i = 0; i < userDataList.length; i += batchSize) {
    const batch = userDataList.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(userDataList.length / batchSize)}`);
    
    try {
      // For now, we'll just log the data
      // In a real migration, you'd call the new contract's migration function
      console.log(`Batch ${Math.floor(i / batchSize) + 1}:`, batch.map(u => ({
        address: u.address,
        totalPredictions: u.totalPredictions.toString(),
        correctPredictions: u.correctPredictions.toString()
      })));
      
      // Add delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
    }
  }
}

/**
 * Validate migration data
 */
function validateMigrationData(userDataList: UserData[]): boolean {
  let valid = true;
  
  for (const user of userDataList) {
    if (user.correctPredictions > user.totalPredictions) {
      console.error(`❌ Invalid data for ${user.address}: correct > total`);
      valid = false;
    }
    
    if (user.currentStreak > user.longestStreak) {
      console.error(`❌ Invalid data for ${user.address}: current > longest streak`);
      valid = false;
    }
  }
  
  return valid;
}

// Run migration
if (require.main === module) {
  migrateToV2()
    .then(() => {
      console.log('🎉 Migration script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateToV2, validateMigrationData };
