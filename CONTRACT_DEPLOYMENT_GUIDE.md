# SeersLeague Contract Deployment Guide

## Prerequisites

1. **Base Mainnet ETH**: You need ETH on Base Mainnet for gas fees
2. **Private Key**: Your wallet's private key (NEVER share this!)
3. **Treasury Address**: Your wallet address for receiving funds

## Step 1: Setup Environment Variables

Create `.env.local` file in the project root:

```bash
# Treasury Address (your wallet address for receiving funds)
TREASURY_ADDRESS=0xYourWalletAddress

# Private Key (NEVER commit this to git!)
PRIVATE_KEY=0xYourPrivateKey

# Base Mainnet RPC
NEXT_PUBLIC_BASE_RPC=https://mainnet.base.org

# Optional: Basescan API Key for contract verification
BASESCAN_API_KEY=your_basescan_api_key
```

## Step 2: Get Base Mainnet ETH

1. **Bridge ETH to Base**: Use [Base Bridge](https://bridge.base.org)
2. **Buy ETH on Base**: Use Coinbase or other exchanges
3. **Minimum Required**: ~0.01 ETH for deployment (gas fees)

## Step 3: Deploy Contract

```bash
# Install dependencies
npm install

# Deploy to Base Mainnet
npx hardhat run scripts/deploy-contract.js --network base
```

## Step 4: Update Environment Variables

After successful deployment, update your environment variables:

```bash
# Add to .env.local
NEXT_PUBLIC_CONTRACT_ADDRESS=0xDeployedContractAddress
```

## Step 5: Update Vercel Environment Variables

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS`
   - `TREASURY_ADDRESS`
   - `PRIVATE_KEY` (for future updates)

## Step 6: Test Contract

1. Visit your deployed app
2. Check console for contract interactions
3. Test prediction submission
4. Verify USDC transactions

## Security Notes

- **NEVER** commit private keys to git
- Use environment variables for sensitive data
- Test on Base Sepolia first (testnet)
- Keep private keys secure

## Troubleshooting

### "Insufficient funds" error
- Add more ETH to your wallet
- Check gas price on Base

### "Invalid private key" error
- Ensure private key starts with `0x`
- Check for typos in the key

### Contract verification fails
- Try manual verification on Basescan
- Check constructor arguments

## Next Steps After Deployment

1. **Update Frontend**: Add contract address to environment
2. **Test Integration**: Verify all contract functions work
3. **Generate Account Association**: Use Base Build tool
4. **Deploy to Production**: Push to Vercel
5. **Test in Base App**: Verify everything works in Base App context
