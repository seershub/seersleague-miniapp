# Leaderboard Setup Guide

This guide explains how to setup the leaderboard feature with Vercel KV caching.

## Overview

The leaderboard uses an event-driven indexing system:
1. A Vercel Cron Job runs every 10 minutes
2. It fetches on-chain events (`ResultRecorded`, `PredictionSubmitted`)
3. Reads `getUserStats` for each unique user
4. Sorts and caches data in Vercel KV
5. Frontend fetches from KV for instant loading

## Setup Steps

### 1. Create Vercel KV Store

1. Go to your Vercel dashboard
2. Navigate to Storage → KV
3. Click "Create Database"
4. Name it: `seersleague-leaderboard`
5. Select region closest to your users

### 2. Configure Environment Variables

Vercel will automatically add these to your project:
```
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

Add manually:
```
CRON_SECRET=your_random_secret_string_here
NEXT_PUBLIC_DEPLOYMENT_BLOCK=<contract_deployment_block_number>
```

**Generate CRON_SECRET:**
```bash
openssl rand -base64 32
```

**Find Deployment Block:**
- Go to BaseScan: https://basescan.org/address/YOUR_CONTRACT_ADDRESS
- Check "Contract Creation" transaction
- Note the block number

### 3. Deploy to Vercel

```bash
git push
```

Vercel will:
- Auto-deploy your app
- Setup the cron job (runs every 10 minutes)
- Connect to KV automatically

### 4. Initial Manual Trigger

After first deploy, trigger the leaderboard update manually:

```bash
curl -X POST https://your-app.vercel.app/api/cron/update-leaderboard \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 5. Verify

1. Check Vercel Logs for cron execution
2. Visit `/leaderboard` page
3. Should show real on-chain data

## How It Works

### Cron Job (`/api/cron/update-leaderboard`)

1. **Fetch Events:**
   ```typescript
   - PredictionSubmitted events → unique users
   - ResultRecorded events → match results
   ```

2. **Read User Stats:**
   ```typescript
   for each user:
     stats = contract.getUserStats(user)
     calculate accuracy, rank
   ```

3. **Sort & Rank:**
   ```typescript
   sort by:
     1. Accuracy (desc)
     2. Total predictions (desc)
     3. Current streak (desc)
   ```

4. **Cache in KV:**
   ```typescript
   kv.set('leaderboard:all', sortedData)
   kv.set('leaderboard:lastUpdated', timestamp)
   ```

### API Route (`/api/leaderboard`)

```typescript
GET /api/leaderboard?address=0x...
```

Returns:
```json
{
  "leaderboard": [...], // All entries
  "topPlayers": [...],  // Top 65
  "userRank": {...},    // Specific user (if address provided)
  "totalPlayers": 247,
  "lastUpdated": "2024-..."
}
```

### Frontend Page

- Fetches from `/api/leaderboard`
- Auto-refreshes every 30 seconds
- Shows top 65 players
- Highlights user's position
- Shows "Your Rank" card if user is below top 65

## Performance

- **Event Indexing:** ~10,000 blocks (~8 hours on Base)
- **Cron Frequency:** Every 10 minutes
- **KV Read Latency:** <10ms globally
- **Frontend Load:** Instant (cached data)

## Monitoring

### Check Cron Status

Vercel Dashboard → Your Project → Cron Jobs

### Check KV Data

Vercel Dashboard → Storage → KV → seersleague-leaderboard

### Debug Logs

```bash
vercel logs --follow
```

## Troubleshooting

### Leaderboard Empty

1. Check if cron job ran: Vercel Logs
2. Verify CRON_SECRET matches
3. Check contract address is correct
4. Ensure DEPLOYMENT_BLOCK is set

### Slow Updates

1. Reduce cron frequency (change schedule in vercel.json)
2. Optimize fromBlock (set accurate DEPLOYMENT_BLOCK)

### KV Errors

1. Verify KV environment variables
2. Check KV database exists
3. Ensure proper permissions

## Cost Estimation

### Vercel KV (Free Tier)

- 256 MB storage
- 100,000 reads/month
- 1,000 writes/month

**Usage:**
- Writes: ~4,320/month (every 10 min)
- Reads: ~86,400/month (2/sec average)
- Storage: <1 MB

✅ Fits within free tier!

### Upgrade If Needed

Pro plan: $20/month for 10M requests

## Next Steps

1. ✅ Setup Vercel KV
2. ✅ Deploy to production
3. ✅ Trigger initial update
4. Monitor cron job logs
5. Optimize DEPLOYMENT_BLOCK for faster indexing
6. Consider adding more ranking metrics

## Advanced: Custom Sorting

Edit `/api/cron/update-leaderboard/route.ts`:

```typescript
leaderboardData.sort((a, b) => {
  // Custom sorting logic
  const scoreA = a.accuracy * 10 + a.currentStreak;
  const scoreB = b.accuracy * 10 + b.currentStreak;
  return scoreB - scoreA;
});
```

## Support

For issues, check:
- [Vercel KV Docs](https://vercel.com/docs/storage/vercel-kv)
- [Vercel Cron Docs](https://vercel.com/docs/cron-jobs)
- [Viem Event Logs](https://viem.sh/docs/actions/public/getLogs.html)
