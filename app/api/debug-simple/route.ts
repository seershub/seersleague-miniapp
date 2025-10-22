import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Ultra-simple debug - NO external calls
 * Just shows environment configuration
 */
export async function GET() {
  const config = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,

    // Environment Variables (show which are missing)
    env: {
      NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || '❌ MISSING',
      NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '❌ MISSING',
      NEXT_PUBLIC_USDC_ADDRESS: process.env.NEXT_PUBLIC_USDC_ADDRESS || '❌ MISSING',
      NEXT_PUBLIC_DEPLOYMENT_BLOCK: process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '❌ MISSING',
      NEXT_PUBLIC_BASE_RPC: process.env.NEXT_PUBLIC_BASE_RPC || '❌ MISSING',
      NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '❌ MISSING',

      // Server-only vars (just check if SET)
      FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY ? '✅ SET' : '❌ MISSING',
      KV_REST_API_URL: process.env.KV_REST_API_URL ? '✅ SET' : '❌ MISSING',
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? '✅ SET' : '❌ MISSING',
      CRON_SECRET: process.env.CRON_SECRET ? '✅ SET' : '❌ MISSING',
      PRIVATE_KEY: process.env.PRIVATE_KEY ? '✅ SET' : '❌ MISSING'
    },

    // Runtime info
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      maxDuration: '10s (Hobby plan limit)'
    },

    // Quick diagnosis
    diagnosis: {
      message: 'Check for ❌ MISSING values above',
      criticalVars: [
        'NEXT_PUBLIC_CONTRACT_ADDRESS',
        'NEXT_PUBLIC_DEPLOYMENT_BLOCK',
        'KV_REST_API_URL',
        'KV_REST_API_TOKEN'
      ],
      instructions: [
        '1. Go to Vercel Dashboard → Settings → Environment Variables',
        '2. Add missing variables',
        '3. Redeploy',
        '4. If timeout persists, check NEXT_PUBLIC_BASE_RPC endpoint'
      ]
    }
  };

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
