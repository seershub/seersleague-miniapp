import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ⚠️ EMERGENCY: ENDPOINT TEMPORARILY DISABLED
// Her sayfa yenilendiğinde spam transaction oluşturuyordu

export async function POST(request: Request) {
  return NextResponse.json(
    {
      error: 'TEMPORARILY DISABLED',
      reason: 'Spam transaction prevention',
      message: 'This endpoint was causing spam transactions on every page refresh',
      solution: 'Contact admin to manually register matches',
      timestamp: new Date().toISOString()
    },
    { status: 503 }
  );
}

export async function GET() {
  return NextResponse.json({
    status: 'DISABLED',
    reason: 'Emergency spam prevention',
    message: 'Batch registration temporarily disabled',
    contact: 'Admin intervention required'
  });
}
