import { NextResponse } from 'next/server';

/**
 * Check environment variables
 * Show what might be causing the timeout
 */
export async function GET() {
  const deploymentBlock = process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK;
  const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  // Check if deployment block is too old
  const currentBlock = 37184045n; // Approximate current Base block
  const deployBlock = deploymentBlock ? BigInt(deploymentBlock) : 0n;
  const blockDiff = currentBlock - deployBlock;

  const issues: string[] = [];

  if (!alchemyKey) {
    issues.push('⚠️ NEXT_PUBLIC_ALCHEMY_API_KEY not set - using slow public RPC');
  } else if (alchemyKey.length < 20) {
    issues.push('⚠️ NEXT_PUBLIC_ALCHEMY_API_KEY looks invalid (too short)');
  }

  if (!deploymentBlock || deployBlock === 0n) {
    issues.push('⚠️ NEXT_PUBLIC_DEPLOYMENT_BLOCK not set - will scan many blocks');
  } else if (blockDiff > 1000000n) {
    issues.push(`🚨 CRITICAL: DEPLOYMENT_BLOCK is ${blockDiff.toString()} blocks old! This causes timeout!`);
    issues.push(`   Scanning ${blockDiff.toString()} blocks takes 60+ seconds`);
  } else if (blockDiff > 100000n) {
    issues.push(`⚠️ DEPLOYMENT_BLOCK is ${blockDiff.toString()} blocks old - may be slow`);
  }

  if (!contractAddress) {
    issues.push('❌ NEXT_PUBLIC_CONTRACT_ADDRESS not set');
  }

  return NextResponse.json({
    status: issues.length === 0 ? 'ok' : 'issues-found',
    environment: {
      NEXT_PUBLIC_DEPLOYMENT_BLOCK: deploymentBlock || 'NOT SET',
      NEXT_PUBLIC_ALCHEMY_API_KEY: alchemyKey ? `${alchemyKey.slice(0, 8)}...` : 'NOT SET',
      NEXT_PUBLIC_CONTRACT_ADDRESS: contractAddress || 'NOT SET',
    },
    analysis: {
      currentBlock: currentBlock.toString(),
      deploymentBlock: deployBlock.toString(),
      blockDifference: blockDiff.toString(),
      blockDifferenceHuman: `${(Number(blockDiff) / 1000).toFixed(0)}K blocks`,
    },
    issues,
    recommendation: issues.length > 0
      ? 'Fix the issues above to resolve timeout problems'
      : 'Configuration looks good - timeout might be due to network/RPC issues'
  });
}
