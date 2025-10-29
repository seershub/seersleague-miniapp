// Bu dosyayı route.ts olarak rename et
// mv app/api/batch-register-matches/route.ts app/api/batch-register-matches/route.ts.old
// mv app/api/batch-register-matches/route-with-rate-limit.ts app/api/batch-register-matches/route.ts

import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://api.developer.coinbase.com/rpc/v1/base/DzCv9JnMZKpreOiukHveGNUBbW7NBYUa';

// ⚠️ RATE LIMITING
let lastRegistrationTime = 0;
const COOLDOWN_MS = 300000; // 5 minutes cooldown
let isRegistering = false;

export async function POST(request: Request) {
  // EMERGENCY DISABLE
  if (process.env.DISABLE_BATCH_REGISTER === 'true') {
    return NextResponse.json(
      { error: 'Temporarily disabled to prevent spam' },
      { status: 503 }
    );
  }

  // AUTH
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
  if (!adminSecret || authHeader !== \`Bearer \${adminSecret}\`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // CONCURRENT CHECK
  if (isRegistering) {
    return NextResponse.json(
      { error: 'Registration already in progress' },
      { status: 429 }
    );
  }

  // RATE LIMIT
  const now = Date.now();
  const timeSince = now - lastRegistrationTime;
  if (lastRegistrationTime > 0 && timeSince < COOLDOWN_MS) {
    const remainingSec = Math.ceil((COOLDOWN_MS - timeSince) / 1000);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: \`Wait \${remainingSec} seconds\`,
        cooldownSeconds: remainingSec
      },
      { status: 429 }
    );
  }

  isRegistering = true;
  lastRegistrationTime = now;

  try {
    // Your registration logic here
    return NextResponse.json({ success: true, message: 'Registration logic here' });
  } finally {
    isRegistering = false;
  }
}

export async function GET() {
  return NextResponse.json({
    status: isRegistering ? 'BUSY' : 'READY',
    cooldownMs: COOLDOWN_MS,
    lastRun: lastRegistrationTime ? new Date(lastRegistrationTime).toISOString() : 'Never'
  });
}
