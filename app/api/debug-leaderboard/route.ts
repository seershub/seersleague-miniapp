import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Debug leaderboard - checking all components...');
    
    // 1. Check KV connection
    let kvStatus = 'unknown';
    let kvData: any[] | null = null;
    try {
      kvData = await kv.get('leaderboard:all');
      kvStatus = 'connected';
      console.log('KV Status: Connected, data length:', kvData ? kvData.length : 0);
    } catch (kvError) {
      kvStatus = 'error';
      console.error('KV Error:', kvError);
    }
    
    // 2. Check contract connection
    let contractStatus = 'unknown';
    let contractData = null;
    try {
      const currentBlock = await publicClient.getBlockNumber();
      contractStatus = 'connected';
      contractData = { currentBlock: currentBlock.toString() };
      console.log('Contract Status: Connected, block:', currentBlock);
    } catch (contractError) {
      contractStatus = 'error';
      console.error('Contract Error:', contractError);
    }
    
    // 3. Check environment variables
    const envCheck = {
      contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      baseRpc: process.env.NEXT_PUBLIC_BASE_RPC,
      cronSecret: process.env.CRON_SECRET ? 'set' : 'missing',
      kvUrl: process.env.KV_REST_API_URL ? 'set' : 'missing',
      deploymentBlock: process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK
    };
    
    console.log('Environment check:', envCheck);
    
    // 4. Try to fetch events
    let eventsStatus = 'unknown';
    let eventsCount = 0;
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
      
      const predictionEvents = await publicClient.getLogs({
        address: CONTRACTS.SEERSLEAGUE,
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
        fromBlock: deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n,
        toBlock: 'latest'
      });
      
      eventsStatus = 'success';
      eventsCount = predictionEvents.length;
      console.log('Events Status: Success, count:', eventsCount);
    } catch (eventsError) {
      eventsStatus = 'error';
      console.error('Events Error:', eventsError);
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        kv: {
          status: kvStatus,
          dataLength: kvData ? kvData.length : 0,
          hasData: kvData && kvData.length > 0
        },
        contract: {
          status: contractStatus,
          data: contractData
        },
        events: {
          status: eventsStatus,
          count: eventsCount
        },
        environment: envCheck
      }
    });

  } catch (error) {
    console.error('Debug leaderboard error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to debug leaderboard', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
