import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🚀 [DEPLOY V2 COMPLETE] Starting SeersLeague V2 Complete deployment...");

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Contract addresses
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;

  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY is required in .env for deployment!');
  }

  // Deploy SeersLeagueV2Complete
  const SeersLeagueV2Complete = await ethers.getContractFactory("SeersLeagueV2Complete");
  const seersLeagueV2Complete = await SeersLeagueV2Complete.deploy(USDC_ADDRESS, TREASURY_ADDRESS);
  await seersLeagueV2Complete.waitForDeployment();
  const seersLeagueV2CompleteAddress = await seersLeagueV2Complete.getAddress();
  console.log("SeersLeagueV2Complete deployed to:", seersLeagueV2CompleteAddress);

  const deploymentBlock = await deployer.provider.getBlockNumber();

  console.log("✅ [DEPLOY V2 COMPLETE] SeersLeagueV2Complete deployed to:", seersLeagueV2CompleteAddress);
  console.log("✅ [DEPLOY V2 COMPLETE] Deployment block:", deploymentBlock);

  // Verify contract info
  const contractInfo = await seersLeagueV2Complete.getContractInfo();
  console.log("✅ [DEPLOY V2 COMPLETE] Contract version:", contractInfo[0]);
  console.log("✅ [DEPLOY V2 COMPLETE] Contract owner:", contractInfo[1]);
  console.log("✅ [DEPLOY V2 COMPLETE] Treasury:", contractInfo[2]);
  console.log("✅ [DEPLOY V2 COMPLETE] Paused:", contractInfo[3]);
  console.log("✅ [DEPLOY V2 COMPLETE] Total matches:", contractInfo[4]);

  console.log("📋 [DEPLOY V2 COMPLETE] Deployment completed successfully!");
  console.log("📋 [DEPLOY V2 COMPLETE] Deployment Info:", {
    contractAddress: seersLeagueV2CompleteAddress,
    deploymentBlock: deploymentBlock,
    version: contractInfo[0],
    owner: contractInfo[1],
    treasury: contractInfo[2],
    usdc: USDC_ADDRESS,
    timestamp: new Date().toISOString()
  });

  console.log("🔧 [DEPLOY V2 COMPLETE] Please update your environment variables:");
  console.log(`NEXT_PUBLIC_SEERSLEAGUE_V2_CONTRACT=${seersLeagueV2CompleteAddress}`);
  console.log(`NEXT_PUBLIC_DEPLOYMENT_BLOCK_V2=${deploymentBlock}`);
}

main().catch((error) => {
  console.error("💥 [DEPLOY V2 COMPLETE] Deployment failed:", error);
  process.exitCode = 1;
});
