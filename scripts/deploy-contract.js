#!/usr/bin/env node

/**
 * Deploy SeersLeague contract to Base Mainnet
 * 
 * Usage: node scripts/deploy-contract.js
 * 
 * Prerequisites:
 * - Set TREASURY_ADDRESS in .env.local
 * - Set PRIVATE_KEY in .env.local
 * - Have Base Mainnet ETH for gas
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Deploying SeersLeague contract to Base Mainnet...');
  
  // Load environment variables
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  
  const treasuryAddress = process.env.TREASURY_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!treasuryAddress) {
    throw new Error('TREASURY_ADDRESS not set in .env.local');
  }
  
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in .env.local');
  }
  
  console.log('📋 Deployment Configuration:');
  console.log(`   Treasury Address: ${treasuryAddress}`);
  console.log(`   Network: Base Mainnet`);
  
  // Get the contract factory
  const SeersLeague = await ethers.getContractFactory('SeersLeague');
  
  // Deploy the contract
  console.log('⏳ Deploying contract...');
  const seersLeague = await SeersLeague.deploy(treasuryAddress);
  
  console.log('⏳ Waiting for deployment confirmation...');
  await seersLeague.waitForDeployment();
  
  const contractAddress = await seersLeague.getAddress();
  
  console.log('✅ Contract deployed successfully!');
  console.log(`   Contract Address: ${contractAddress}`);
  console.log(`   Transaction Hash: ${seersLeague.deploymentTransaction().hash}`);
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    treasuryAddress,
    deploymentTx: seersLeague.deploymentTransaction().hash,
    deployedAt: new Date().toISOString(),
    network: 'base-mainnet'
  };
  
  const deploymentPath = path.join(__dirname, '..', 'deployments', 'base-mainnet.json');
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log('📄 Deployment info saved to deployments/base-mainnet.json');
  
  // Verify contract (optional)
  console.log('🔍 Verifying contract on Basescan...');
  try {
    await hre.run('verify:verify', {
      address: contractAddress,
      constructorArguments: [treasuryAddress],
    });
    console.log('✅ Contract verified successfully!');
  } catch (error) {
    console.log('⚠️  Contract verification failed:', error.message);
    console.log('   You can verify manually later using:');
    console.log(`   npx hardhat verify --network base ${contractAddress} "${treasuryAddress}"`);
  }
  
  console.log('\n🎉 Deployment complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local');
  console.log('2. Deploy frontend to Vercel');
  console.log('3. Configure subdomain (league.seershub.com)');
  console.log('4. Generate account association via base.org/build');
  console.log('5. Test the complete flow');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
