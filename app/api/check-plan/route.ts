import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Check if we're running on Pro plan
 * This endpoint returns immediately to verify deployment
 */
export async function GET() {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || 'development',
    region: process.env.VERCEL_REGION || 'unknown',
    message: 'If you see this instantly, the deployment is working',
    note: 'Check Vercel Dashboard → Project Settings → General → Plan to confirm Pro is active',
    possibleIssues: [
      '1. Deployment was cached before Pro upgrade',
      '2. Pro plan not fully activated on Vercel',
      '3. New deployment needed to pick up Pro limits',
      '4. Project not linked to Pro team'
    ],
    solutions: [
      '1. Go to Vercel Dashboard',
      '2. Settings → General → check if Pro badge is shown',
      '3. Trigger a new deployment (Deployments → Redeploy)',
      '4. Make sure project is under a Pro team/account'
    ]
  });
}
