# Match Results Recording System

## Overview

This system automatically fetches match results from Football-data.org API and records them to the blockchain, updating user statistics (accuracy, streaks, etc.) based on their predictions.

## Architecture

### 1. Data Flow

```
Football-data.org API → /api/record-results → Blockchain (batchRecordResults)
                                    ↓
                            User Stats Updated
                                    ↓
                            Leaderboard Reflects Accuracy
```

### 2. Components

#### `/app/api/record-results/route.ts`
Main endpoint that processes finished matches:
1. Fetches all registered matches from blockchain
2. Filters matches that are finished but not yet recorded
3. Gets match results from Football-data.org API
4. Finds all users who predicted each match
5. Checks if each prediction was correct
6. Batch records all results to blockchain

#### `/app/api/cron/record-results/route.ts`
Vercel cron job endpoint that triggers the main endpoint daily at 00:00 UTC.

### 3. Football-data.org API Integration

**Documentation:** https://docs.football-data.org/general/v4/index.html

**Endpoint Used:**
```
GET /v4/matches/{matchId}
```

**Response Structure:**
```json
{
  "match": {
    "id": 123,
    "status": "FINISHED",
    "score": {
      "fullTime": {
        "home": 2,
        "away": 1
      }
    }
  }
}
```

**Match Statuses:**
- `TIMED`: Scheduled, not started
- `IN_PLAY`: Currently playing
- `PAUSED`: Half-time
- `FINISHED`: Match completed ✓
- `POSTPONED`: Match postponed
- `CANCELLED`: Match cancelled

### 4. Blockchain Contract Functions

**batchRecordResults:**
```solidity
function batchRecordResults(
    address[] users,
    uint256[] matchIds,
    bool[] corrects
) external onlyOwner
```

Records multiple results in one transaction for gas efficiency.

**Events Emitted:**
```solidity
event ResultRecorded(
    address indexed user,
    uint256 matchId,
    bool correct
)
```

### 5. Outcome Determination

```typescript
function determineOutcome(homeScore: number, awayScore: number): 1 | 2 | 3 {
  if (homeScore > awayScore) return 1; // Home win
  if (homeScore < awayScore) return 3; // Away win
  return 2; // Draw
}
```

User predictions are compared against actual outcomes:
- User predicted `1` (home win) and home won → ✓ Correct
- User predicted `2` (draw) and match drew → ✓ Correct
- User predicted `3` (away win) and away won → ✓ Correct
- Any mismatch → ✗ Incorrect

## Configuration

### Required Environment Variables

```env
# Football-data.org API (Primary source)
FOOTBALL_DATA_API_KEY=your_api_key_here

# Blockchain
PRIVATE_KEY=0x... # Owner wallet private key for recording results
NEXT_PUBLIC_BASE_RPC=https://mainnet.base.org

# Cron Job Security
CRON_SECRET=random_secret_string

# Optional: Optimize event fetching
NEXT_PUBLIC_DEPLOYMENT_BLOCK=block_number_when_contract_deployed
```

### Get Football-data.org API Key

1. Visit: https://www.football-data.org/client/register
2. Register for a free account
3. Free tier allows **10 requests/minute**
4. API key will be emailed to you

## Cron Schedule

**Vercel Hobby Plan Limitation:**
- Only supports daily cron jobs
- Cannot run more frequently

**Current Schedule:**
```json
{
  "path": "/api/cron/record-results",
  "schedule": "0 0 * * *"  // Daily at 00:00 UTC
}
```

This means results are recorded once per day. Matches finishing today will have their results recorded by tomorrow.

### Future Improvement (with Paid Plan)

With Vercel Pro plan, you could run more frequently:
```
"schedule": "0 */3 * * *"  // Every 3 hours
```

## Manual Triggering

For testing or emergency processing:

```bash
curl -X POST https://your-domain.com/api/record-results \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "matchesProcessed": 5,
  "predictionsRecorded": 42,
  "txHash": "0x...",
  "matches": [
    {
      "matchId": "12345",
      "score": "2-1",
      "outcome": "HOME"
    }
  ]
}
```

## Error Handling

### Football-data.org API Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid API key | Check FOOTBALL_DATA_API_KEY |
| 429 Rate Limited | Too many requests | Free tier: max 10/min |
| 404 Not Found | Match ID doesn't exist | Skip and continue |

### Blockchain Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Insufficient Gas | Gas limit too low | Increase gas limit |
| Unauthorized | Wrong private key | Check PRIVATE_KEY (must be owner) |
| Already Recorded | Results already on chain | Safe to ignore |

## Monitoring

### Logs to Watch

**Successful Processing:**
```
[CRON] Record results job started
Match 12345 finished: 2-1
Match 12345: 7 users made predictions
[CRON] Record results completed
```

**No Matches to Process:**
```
No matches to process
```

**Errors:**
```
Football-data.org API error: 429 Too Many Requests
Error recording results to blockchain: ...
```

### Vercel Dashboard

1. Go to your Vercel project
2. Click "Logs" tab
3. Filter by "cron" to see scheduled executions
4. Check for errors in red

## Testing

### Local Testing

1. Set up `.env.local` with all required variables
2. Run development server: `npm run dev`
3. Test endpoint manually:

```bash
curl -X POST http://localhost:3000/api/record-results \
  -H "Authorization: Bearer your_cron_secret" \
  -H "Content-Type: application/json"
```

### Production Testing

After deployment, manually trigger the cron:

```bash
curl -X POST https://your-domain.com/api/cron/record-results \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## How It Fixes the Leaderboard Issue

**Before:** All predictions showed 0% accuracy because results were never recorded.

**After:**
1. Matches finish during the day
2. Cron runs at midnight (00:00 UTC)
3. System fetches results from Football-data.org
4. System compares user predictions vs actual results
5. Contract updates user stats (correctPredictions, totalPredictions, streak)
6. Leaderboard API reads updated stats
7. Users see accurate statistics! ✓

## Troubleshooting

### Leaderboard Still Shows 0% Accuracy

**Possible Causes:**
1. Cron hasn't run yet (wait until after 00:00 UTC)
2. No matches have finished yet
3. Football-data.org API key not configured
4. Private key (owner) not configured
5. Matches not registered in contract

**Debug Steps:**
1. Check Vercel logs for cron execution
2. Manually trigger `/api/record-results` and check response
3. Verify FOOTBALL_DATA_API_KEY works:
   ```bash
   curl -H "X-Auth-Token: YOUR_KEY" \
     https://api.football-data.org/v4/matches/12345
   ```
4. Check if matches are registered:
   ```bash
   # Use contract explorer to call getMatch(matchId)
   ```

### High Gas Costs

If processing many predictions is expensive:
1. Process in smaller batches
2. Consider L2 scaling solutions
3. Optimize batch size in code

## Future Enhancements

1. **Real-time Processing**: Use webhooks or polling for immediate updates
2. **Multiple Data Sources**: Add backup APIs for reliability
3. **Partial Results**: Record live match results (half-time, etc.)
4. **Analytics**: Track processing metrics and success rates
5. **Notifications**: Alert admins on failures

## Security Notes

⚠️ **IMPORTANT:**
- `PRIVATE_KEY` must be the contract owner's key
- Never expose `PRIVATE_KEY` in client-side code
- Use `CRON_SECRET` to prevent unauthorized result recording
- Rotate keys periodically for security

## Support

For issues or questions:
- Check logs in Vercel Dashboard
- Review Football-data.org API docs
- Verify all environment variables are set
- Test locally before deploying

---

**Last Updated:** 2025-10-21
**Version:** 1.0
