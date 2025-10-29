import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🚀 [DEPLOY V2] Starting SeersLeague V2 deployment...");

  const signers = await ethers.getSigners();
  console.log("Available signers:", signers.length);
  
  if (signers.length === 0) {
    throw new Error("No signers available. Please check your private key configuration.");
  }
  
  const deployer = signers[0];
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Contract addresses
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;

  console.log("USDC Address:", USDC_ADDRESS);
  console.log("Treasury Address:", TREASURY_ADDRESS);

  // Deploy SeersLeagueV2
  console.log("📦 [DEPLOY V2] Deploying SeersLeagueV2...");
  const SeersLeagueV2 = await ethers.getContractFactory("SeersLeagueV2");
  const seersLeagueV2 = await SeersLeagueV2.deploy(USDC_ADDRESS, TREASURY_ADDRESS);

  await seersLeagueV2.waitForDeployment();

  const contractAddress = await seersLeagueV2.getAddress();
  const deploymentBlock = await deployer.provider.getBlockNumber();

  console.log("✅ [DEPLOY V2] SeersLeagueV2 deployed to:", contractAddress);
  console.log("✅ [DEPLOY V2] Deployment block:", deploymentBlock);

  // Verify contract info
  const contractInfo = await seersLeagueV2.getContractInfo();
  console.log("✅ [DEPLOY V2] Contract version:", contractInfo[0]);
  console.log("✅ [DEPLOY V2] Contract owner:", contractInfo[1]);
  console.log("✅ [DEPLOY V2] Treasury:", contractInfo[2]);
  console.log("✅ [DEPLOY V2] Paused:", contractInfo[3]);
  console.log("✅ [DEPLOY V2] Total matches:", contractInfo[4].toString());

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    deploymentBlock,
    deploymentTx: seersLeagueV2.deploymentTransaction()?.hash,
    version: contractInfo[0],
    owner: contractInfo[1],
    treasury: contractInfo[2],
    usdc: USDC_ADDRESS,
    timestamp: new Date().toISOString()
  };

  console.log("📋 [DEPLOY V2] Deployment completed successfully!");
  console.log("📋 [DEPLOY V2] Deployment Info:", JSON.stringify(deploymentInfo, null, 2));

  // Update environment variables
  console.log("🔧 [DEPLOY V2] Please update your environment variables:");
  console.log(`NEXT_PUBLIC_SEERSLEAGUE_V2_CONTRACT=${contractAddress}`);
  console.log(`NEXT_PUBLIC_DEPLOYMENT_BLOCK_V2=${deploymentBlock}`);

  return deploymentInfo;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error("💥 [DEPLOY V2] Deployment failed:", error);
  process.exitCode = 1;
});