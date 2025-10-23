#!/usr/bin/env node

/**
 * Update Treasury Address in SeersLeague Contract
 * 
 * Usage: node scripts/update-treasury.js
 * 
 * Prerequisites:
 * - Set NEW_TREASURY_ADDRESS in .env.local
 * - Set PRIVATE_KEY in .env.local (contract owner)
 * - Have Base Mainnet ETH for gas
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔄 Updating Treasury Address in SeersLeague contract...');
  
  // Load environment variables
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  
  const newTreasuryAddress = process.env.NEW_TREASURY_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x6b0720D001f65967358a31e319F63D3833217632';
  
  if (!newTreasuryAddress) {
    throw new Error('NEW_TREASURY_ADDRESS not set in .env.local');
  }
  
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in .env.local');
  }
  
  console.log('📋 Update Configuration:');
  console.log(`   Contract Address: ${contractAddress}`);
  console.log(`   New Treasury Address: ${newTreasuryAddress}`);
  console.log(`   Network: Base Mainnet`);
  
  // Connect to contract
  const SeersLeague = await ethers.getContractFactory('SeersLeague');
  const seersLeague = SeersLeague.attach(contractAddress);
  
  // Get current treasury address
  const currentTreasury = await seersLeague.treasury();
  console.log(`   Current Treasury: ${currentTreasury}`);
  
  if (currentTreasury.toLowerCase() === newTreasuryAddress.toLowerCase()) {
    console.log('⚠️  Treasury address is already set to the new address');
    return;
  }
  
  // Update treasury address
  console.log('⏳ Updating treasury address...');
  const tx = await seersLeague.setTreasury(newTreasuryAddress);
  
  console.log('⏳ Waiting for transaction confirmation...');
  const receipt = await tx.wait();
  
  console.log('✅ Treasury address updated successfully!');
  console.log(`   Transaction Hash: ${tx.hash}`);
  console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
  
  // Verify the update
  const updatedTreasury = await seersLeague.treasury();
  console.log(`   New Treasury: ${updatedTreasury}`);
  
  // Update deployment info
  const deploymentPath = path.join(__dirname, '..', 'deployments', 'base-mainnet.json');
  if (fs.existsSync(deploymentPath)) {
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    deploymentInfo.treasuryAddress = newTreasuryAddress;
    deploymentInfo.lastTreasuryUpdate = {
      txHash: tx.hash,
      updatedAt: new Date().toISOString(),
      previousTreasury: currentTreasury
    };
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('📄 Deployment info updated');
  }
  
  console.log('\n🎉 Treasury update complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Update TREASURY_ADDRESS in .env.local');
  console.log('2. Redeploy frontend to Vercel');
  console.log('3. Test the complete flow');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Treasury update failed:', error);
    process.exit(1);
  });
