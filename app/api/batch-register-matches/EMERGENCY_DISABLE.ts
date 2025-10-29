import { NextResponse } from 'next/server';

/**
 * EMERGENCY DISABLE - This file temporarily disables batch registration
 *
 * To activate: Rename this file to route.ts
 * mv app/api/batch-register-matches/EMERGENCY_DISABLE.ts app/api/batch-register-matches/route.ts.backup
 * mv app/api/batch-register-matches/EMERGENCY_DISABLE.ts app/api/batch-register-matches/route.ts
 */

export async function POST(request: Request) {
  return NextResponse.json(
    {
      error: 'Batch registration temporarily disabled',
      message: 'This endpoint has been disabled to prevent spam transactions',
      contact: 'Please contact admin to re-enable'
    },
    { status: 503 }
  );
}

export async function GET() {
  return NextResponse.json({
    status: 'DISABLED',
    message: 'Batch registration temporarily disabled to prevent spam',
    endpoint: '/api/batch-register-matches'
  });
}
