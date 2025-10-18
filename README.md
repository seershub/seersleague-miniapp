# SeersLeague Mini App

Daily prediction mini app on Farcaster & Base - 5 matches, on-chain competition

## Overview

SeersLeague is a daily prediction mini app that runs on Farcaster and Base blockchain. Users can make predictions on 5 daily matches and compete on-chain for rewards.

## Features

- ⚽ Daily match predictions (5 matches per day)
- 🏆 On-chain competition system
- 💰 Prize pools and rewards
- 📱 Farcaster MiniKit integration
- ⛓️ Base blockchain support
- 🎯 Free trial (first day)
- 💵 USDC payment integration

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript (strict mode)
- @coinbase/onchainkit/minikit for mini app SDK
- Wagmi/Viem for smart contract interactions
- Base Mainnet RPC
- Tailwind CSS for styling
- TheSportsDB API for match data

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Base Mainnet deployment setup

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp env.example .env.local

# Update .env.local with your values
NEXT_PUBLIC_URL=https://league.seershub.com
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # After deployment
PRIVATE_KEY=0x... # For result recording
TREASURY_ADDRESS=0x... # Where USDC fees go
```

### Development

```bash
# Run development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build
```

### Deployment

1. Deploy smart contract to Base Mainnet
2. Update contract address in environment variables
3. Deploy frontend to Vercel
4. Configure subdomain (league.seershub.com)
5. Generate account association via base.org/build
6. Update manifest configuration

## Smart Contract

The `SeersLeague.sol` contract handles:
- Daily predictions (5 matches)
- Free trial mechanics
- USDC payment collection
- Result recording and scoring
- Prize distribution
- Emergency pause functionality

## API Integration

- **TheSportsDB API**: Fetch daily match data
- Rate limiting: 30 requests per minute
- Caching: 1 hour for matches, 5 minutes for results

## Business Model

- First day: FREE (5 predictions)
- Subsequent days: $1 USDC entry fee
- Weekly prize distribution to top performers
- Treasury management for collected fees

## Security

- Minimal smart contract (reduced attack surface)
- Input validation everywhere
- Emergency pause mechanism
- Owner-controlled result recording
- Rate limiting on API endpoints

## License

MIT License - see LICENSE file for details.

## Support

For questions or issues, please contact the SeersLeague team.