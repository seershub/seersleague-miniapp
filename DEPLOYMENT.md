# SeersLeague Deployment Guide

This guide walks you through deploying SeersLeague to Base Mainnet and setting up the Farcaster mini app.

## Prerequisites

- Node.js 18+
- Base Mainnet ETH for gas fees
- USDC on Base Mainnet for testing
- Domain/subdomain access (league.seershub.com)
- Vercel account for frontend deployment

## Phase 1: Smart Contract Deployment

### 1. Setup Environment Variables

Create `.env.local` with the following variables:

```env
# Deployment
NEXT_PUBLIC_URL=https://league.seershub.com

# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # After deployment
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# RPC Endpoints
NEXT_PUBLIC_BASE_RPC=https://mainnet.base.org

# API Keys
SPORTS_DB_API_KEY=3 # Free tier, upgrade to Patreon key later

# Private Keys (Server-side only - DO NOT expose to client)
PRIVATE_KEY=0x... # For result recording (owner key)
TREASURY_ADDRESS=0x... # Where USDC fees go

# MiniKit Configuration (Generated via base.org/build)
NEXT_PUBLIC_ACCOUNT_ASSOCIATION_HEADER=""
LB_PUBLIC_ACCOUNT_ASSOCIATION_PAYLOAD=""
LB_PUBLIC_ACCOUNT_ASSOCIATION_SIGNATURE=""
```

### 2. Install Hardhat Dependencies

```bash
npm install --save-dev @nomicfoundation/hardhat-toolbox hardhat dotenv
```

### 3. Deploy Smart Contract

```bash
# Deploy to Base Mainnet
npx hardhat run scripts/deploy-contract.js --network base
```

### 4. Verify Contract

```bash
# Verify on Basescan
npx hardhat verify --network base <CONTRACT_ADDRESS> "<TREASURY_ADDRESS>"
```

### 5. Update Environment Variables

After successful deployment, update `.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # Your deployed contract address
```

## Phase 2: Frontend Deployment

### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### 2. Configure Custom Domain

1. Go to Vercel Dashboard → Project Settings → Domains
2. Add `league.seershub.com` as custom domain
3. Configure DNS records as instructed by Vercel

### 3. Update Environment Variables in Vercel

Add all environment variables from `.env.local` to Vercel project settings.

## Phase 3: Farcaster Mini App Setup

### 1. Generate Account Association

1. Visit [base.org/build](https://www.base.org/build)
2. Enter your domain: `league.seershub.com`
3. Generate account association credentials
4. Copy the generated values

### 2. Update Mini App Manifest

Update `minikit.config.ts` with the generated credentials:

```typescript
export const miniappManifest: MiniAppManifest = {
  accountAssociation: {
    header: "your-generated-header",
    payload: "your-generated-payload", 
    signature: "your-generated-signature"
  },
  // ... rest of config
};
```

### 3. Test Manifest

Visit `https://league.seershub.com/.well-known/farcaster.json` to verify the manifest is accessible.

## Phase 4: Testing & Launch

### 1. Test Smart Contract Functions

```bash
# Test in local environment first
npx hardhat test

# Test on Base Mainnet
# - Connect wallet
# - Test free trial predictions
# - Test USDC payment flow
# - Test result recording
```

### 2. Test Mini App Integration

1. Create a test cast on Farcaster
2. Include your mini app URL
3. Test the launch flow
4. Verify wallet connection
5. Test prediction submission

### 3. Monitor & Iterate

- Monitor transaction success rates
- Track user engagement
- Watch for errors in logs
- Collect user feedback
- Iterate based on data

## Security Checklist

### Pre-Launch

- [ ] Smart contract audited
- [ ] All owner functions tested
- [ ] Emergency pause tested
- [ ] USDC payment flow verified
- [ ] Free trial mechanics working
- [ ] API rate limiting implemented
- [ ] Error handling comprehensive
- [ ] Input validation complete

### Post-Launch

- [ ] Monitor transaction failures
- [ ] Track gas costs
- [ ] Watch for unusual activity
- [ ] Regular security reviews
- [ ] Keep dependencies updated

## Troubleshooting

### Common Issues

1. **Contract deployment fails**
   - Check gas price and limits
   - Verify private key has enough ETH
   - Ensure treasury address is valid

2. **Frontend deployment fails**
   - Check environment variables
   - Verify all dependencies installed
   - Check for TypeScript errors

3. **Mini app not launching**
   - Verify manifest accessibility
   - Check account association credentials
   - Ensure subdomain is configured correctly

4. **USDC payments failing**
   - Check user has USDC balance
   - Verify approval transaction succeeded
   - Check contract has correct USDC address

### Getting Help

- Check Base documentation: [docs.base.org](https://docs.base.org)
- Farcaster mini apps docs: [miniapps.farcaster.xyz](https://miniapps.farcaster.xyz)
- TheSportsDB API docs: [thesportsdb.com/documentation](https://thesportsdb.com/documentation)

## Maintenance

### Daily Tasks

- Record match results
- Monitor API usage
- Check for errors

### Weekly Tasks

- Distribute prizes
- Update leaderboards
- Review user feedback

### Monthly Tasks

- Security audit
- Performance optimization
- Feature updates

## Success Metrics

### Week 1 Goals

- [ ] 50 unique users
- [ ] 200+ predictions made
- [ ] <1% transaction error rate
- [ ] Free trial working
- [ ] Payment flow working

### Month 1 Goals

- [ ] 500 unique users
- [ ] 10,000+ predictions
- [ ] D1 retention >40%
- [ ] D7 retention >30%
- [ ] $5,000+ revenue

---

**Remember**: Security first, user experience second, features third. Deploy with confidence! 🚀
