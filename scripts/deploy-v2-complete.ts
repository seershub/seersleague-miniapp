import hre from "hardhat";

async function main() {
  console.log("🚀 [DEPLOY V2 COMPLETE] Starting SeersLeague V2 Complete deployment...");

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy SeersLeagueV2Complete
  console.log("📦 Deploying SeersLeagueV2Complete...");
  const SeersLeagueV2Complete = await hre.ethers.getContractFactory("SeersLeagueV2Complete");
  const seersLeagueV2Complete = await SeersLeagueV2Complete.deploy();
  await seersLeagueV2Complete.waitForDeployment();

  const contractAddress = await seersLeagueV2Complete.getAddress();
  console.log("✅ SeersLeagueV2Complete deployed to:", contractAddress);

  // Get deployment block
  const deploymentBlock = await deployer.provider.getBlockNumber();
  console.log("📊 Deployment block:", deploymentBlock);

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const code = await deployer.provider.getCode(contractAddress);
  if (code === "0x") {
    throw new Error("Contract deployment failed - no code at address");
  }
  console.log("✅ Contract verification successful");

  console.log("🎉 [DEPLOY V2 COMPLETE] Deployment completed successfully!");
  console.log("📋 Summary:");
  console.log("  - Contract Address:", contractAddress);
  console.log("  - Deployment Block:", deploymentBlock);
  console.log("  - Deployer:", deployer.address);
  console.log("  - Network:", hre.network.name);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ [DEPLOY V2 COMPLETE] Deployment failed:", error);
    process.exit(1);
  });
