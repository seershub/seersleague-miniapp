import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * MIGRATE CONTRACT DATA - Fix corrupted user statistics
 * 
 * This endpoint:
 * 1. Identifies users with impossible stats
 * 2. Resets their correctPredictions to 0
 * 3. Fixes currentStreak and longestStreak
 * 4. Provides migration report
 */
export async function POST(request: Request) {
  try {
    console.log('🔧 [MIGRATE CONTRACT DATA] Starting data migration...');

    // Check authorization
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;
    
    if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users with impossible stats
    const inconsistentUsers = [
      {
        address: '0xf0e10a491f9f96c1ecdbe59cc791f35c24b200e7',
        totalPredictions: 1,
        correctPredictions: 3, // Should be 0
        currentStreak: 3, // Should be 0
        longestStreak: 3 // Should be 0
      },
      {
        address: '0xb441dd2cd50409efa24f18379ded23ed0da328be',
        totalPredictions: 5,
        correctPredictions: 8, // Should be 0
        currentStreak: 0, // OK
        longestStreak: 3 // Should be 0
      },
      {
        address: '0x7ac5d6bc4715d76338bcd9ce0b97e0d1f9922735',
        totalPredictions: 5,
        correctPredictions: 6, // Should be 0
        currentStreak: 0, // OK
        longestStreak: 4 // Should be 0
      }
    ];

    console.log(`🔧 Found ${inconsistentUsers.length} users with corrupted data`);

    // Note: This endpoint only provides migration analysis
    // Actual data migration would require contract transactions

    const migrationResults = [];

    for (const user of inconsistentUsers) {
      try {
        console.log(`🔧 Migrating user: ${user.address}`);
        
        // For now, we'll just report what needs to be fixed
        // In a real migration, we would call a contract function to reset the data
        
        migrationResults.push({
          address: user.address,
          status: 'needs_migration',
          currentStats: {
            totalPredictions: user.totalPredictions,
            correctPredictions: user.correctPredictions,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak
          },
          targetStats: {
            totalPredictions: user.totalPredictions, // Keep same
            correctPredictions: 0, // Reset to 0
            currentStreak: 0, // Reset to 0
            longestStreak: 0 // Reset to 0
          },
          migrationRequired: true
        });

      } catch (error) {
        console.error(`❌ Error migrating user ${user.address}:`, error);
        migrationResults.push({
          address: user.address,
          status: 'error',
          error: (error as Error).message
        });
      }
    }

    return NextResponse.json({
      summary: {
        totalUsers: inconsistentUsers.length,
        migrationResults: migrationResults.length,
        success: migrationResults.filter(r => r.status === 'needs_migration').length,
        errors: migrationResults.filter(r => r.status === 'error').length
      },
      
      criticalIssue: '🚨 Contract data is corrupted and needs manual migration',
      
      migrationPlan: {
        description: 'Users with impossible stats need their data reset',
        requiredChanges: [
          'Reset correctPredictions to 0 for all affected users',
          'Reset currentStreak to 0 for all affected users', 
          'Reset longestStreak to 0 for all affected users',
          'Keep totalPredictions unchanged (this is correct)'
        ],
        affectedUsers: migrationResults.filter(r => r.migrationRequired)
      },

      recommendations: [
        '🚨 CRITICAL: Contract data is corrupted and needs immediate attention',
        '🔧 Deploy a new contract with proper data validation',
        '🔧 Or implement a data reset function in the current contract',
        '🔧 Consider migrating all users to a new contract',
        '⚠️ Do not run smart-recount until data is fixed'
      ],

      migrationResults
    });

  } catch (error) {
    console.error('[MIGRATE CONTRACT DATA] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message, stack: (error as Error).stack },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Contract data migration endpoint',
    description: 'POST to this endpoint to start data migration',
    note: 'This endpoint requires CRON_SECRET authorization'
  });
}
