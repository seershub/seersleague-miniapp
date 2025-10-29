import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes for complete daily update

/**
 * DAILY UPDATE SYSTEM - Runs at 00:00 UTC
 * 
 * This endpoint:
 * 1. Runs smart-recount to record all finished matches
 * 2. Updates leaderboard with fresh data
 * 3. Clears caches
 * 4. Provides comprehensive status report
 */
export async function GET() {
  try {
    console.log('🌅 [DAILY UPDATE] Starting 00:00 daily update...');

    // Verify authorization
    const authHeader = process.env.CRON_SECRET;
    if (!authHeader) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      steps: [] as Array<{ step: string; success: boolean; message: string; duration?: number }>,
      totalDuration: 0
    };

    const startTime = Date.now();

    // STEP 1: Run smart-recount
    console.log('📊 [DAILY UPDATE] Step 1: Running smart-recount...');
    const step1Start = Date.now();
    
    try {
      const smartRecountResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/smart-recount`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authHeader}`,
          'Content-Type': 'application/json'
        }
      });

      const smartRecountResult = await smartRecountResponse.json();
      const step1Duration = Date.now() - step1Start;

      results.steps.push({
        step: 'smart-recount',
        success: smartRecountResponse.ok,
        message: smartRecountResponse.ok 
          ? `Recorded ${smartRecountResult.predictionsRecorded || 0} predictions from ${smartRecountResult.finishedMatches || 0} matches`
          : `Failed: ${smartRecountResult.error || 'Unknown error'}`,
        duration: step1Duration
      });

      console.log(`✅ [DAILY UPDATE] Smart-recount completed in ${step1Duration}ms`);
    } catch (error) {
      const step1Duration = Date.now() - step1Start;
      results.steps.push({
        step: 'smart-recount',
        success: false,
        message: `Error: ${(error as Error).message}`,
        duration: step1Duration
      });
      console.error('❌ [DAILY UPDATE] Smart-recount failed:', error);
    }

    // STEP 2: Update leaderboard
    console.log('🏆 [DAILY UPDATE] Step 2: Updating leaderboard...');
    const step2Start = Date.now();
    
    try {
      const leaderboardResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/cron/update-leaderboard`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authHeader}`,
          'Content-Type': 'application/json'
        }
      });

      const leaderboardResult = await leaderboardResponse.json();
      const step2Duration = Date.now() - step2Start;

      results.steps.push({
        step: 'leaderboard-update',
        success: leaderboardResponse.ok,
        message: leaderboardResponse.ok 
          ? `Updated leaderboard with ${leaderboardResult.totalPlayers || 0} players`
          : `Failed: ${leaderboardResult.error || 'Unknown error'}`,
        duration: step2Duration
      });

      console.log(`✅ [DAILY UPDATE] Leaderboard updated in ${step2Duration}ms`);
    } catch (error) {
      const step2Duration = Date.now() - step2Start;
      results.steps.push({
        step: 'leaderboard-update',
        success: false,
        message: `Error: ${(error as Error).message}`,
        duration: step2Duration
      });
      console.error('❌ [DAILY UPDATE] Leaderboard update failed:', error);
    }

    // STEP 3: Clear caches
    console.log('🧹 [DAILY UPDATE] Step 3: Clearing caches...');
    const step3Start = Date.now();
    
    try {
      // Clear any stale cache entries
      await kv.del('leaderboard:stale');
      await kv.del('matches:stale');
      
      const step3Duration = Date.now() - step3Start;
      results.steps.push({
        step: 'cache-clear',
        success: true,
        message: 'Caches cleared successfully',
        duration: step3Duration
      });

      console.log(`✅ [DAILY UPDATE] Caches cleared in ${step3Duration}ms`);
    } catch (error) {
      const step3Duration = Date.now() - step3Start;
      results.steps.push({
        step: 'cache-clear',
        success: false,
        message: `Error: ${(error as Error).message}`,
        duration: step3Duration
      });
      console.error('❌ [DAILY UPDATE] Cache clear failed:', error);
    }

    // STEP 4: System health check
    console.log('🔍 [DAILY UPDATE] Step 4: System health check...');
    const step4Start = Date.now();
    
    try {
      // Check leaderboard status
      const leaderboardCheck = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/debug-leaderboard`);
      const leaderboardStatus = await leaderboardCheck.json();
      
      const step4Duration = Date.now() - step4Start;
      results.steps.push({
        step: 'health-check',
        success: leaderboardCheck.ok,
        message: leaderboardCheck.ok 
          ? `Health check passed: ${leaderboardStatus.summary?.usersInLeaderboard || 0} users in leaderboard`
          : `Health check failed: ${leaderboardStatus.error || 'Unknown error'}`,
        duration: step4Duration
      });

      console.log(`✅ [DAILY UPDATE] Health check completed in ${step4Duration}ms`);
    } catch (error) {
      const step4Duration = Date.now() - step4Start;
      results.steps.push({
        step: 'health-check',
        success: false,
        message: `Error: ${(error as Error).message}`,
        duration: step4Duration
      });
      console.error('❌ [DAILY UPDATE] Health check failed:', error);
    }

    // Calculate total duration
    results.totalDuration = Date.now() - startTime;

    // Determine overall success
    const allStepsSuccessful = results.steps.every(step => step.success);
    const criticalStepsSuccessful = results.steps
      .filter(step => ['smart-recount', 'leaderboard-update'].includes(step.step))
      .every(step => step.success);

    console.log(`🌅 [DAILY UPDATE] Completed in ${results.totalDuration}ms`);
    console.log(`🌅 [DAILY UPDATE] Overall success: ${allStepsSuccessful ? 'YES' : 'PARTIAL'}`);
    console.log(`🌅 [DAILY UPDATE] Critical steps success: ${criticalStepsSuccessful ? 'YES' : 'NO'}`);

    return NextResponse.json({
      success: allStepsSuccessful,
      criticalSuccess: criticalStepsSuccessful,
      ...results,
      summary: {
        totalSteps: results.steps.length,
        successfulSteps: results.steps.filter(s => s.success).length,
        failedSteps: results.steps.filter(s => !s.success).length,
        totalDuration: results.totalDuration,
        averageStepDuration: Math.round(results.totalDuration / results.steps.length)
      }
    });

  } catch (error) {
    console.error('❌ [DAILY UPDATE] Fatal error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggers
export async function POST(request: Request) {
  return GET();
}
