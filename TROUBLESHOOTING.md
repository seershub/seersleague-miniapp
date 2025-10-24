# 🔧 Troubleshooting: Match Results Not Recording

## Quick Diagnosis

Your system shows:
- ✅ Predictions working (users can submit)
- ❌ History showing all "pending"
- ❌ Leaderboard showing 0/X accuracy
- ❌ No correct/incorrect markers

**Root Cause:** Match results are not being recorded to blockchain.

---

## Step 1: Run System Test

Visit this URL in your browser:

```
https://your-app.vercel.app/api/test-record-results
```

This will show you:
- ✅ Which environment variables are set
- ✅ If Football Data API is working
- ✅ If blockchain connection works
- ✅ How many matches are registered
- ✅ How many matches need recording
- ❌ What's wrong and how to fix it

---

## Step 2: Check Common Issues

### Issue 1: Missing FOOTBALL_DATA_API_KEY

**Symptom:** Test shows `FOOTBALL_DATA_API_KEY: ❌ Missing`

**Fix:**
1. Go to: https://www.football-data.org/client/register
2. Sign up (FREE - no credit card needed)
3. Verify your email
4. Copy API key from dashboard
5. Add to Vercel:
   ```
   FOOTBALL_DATA_API_KEY = your_key_here
   ```
6. Redeploy

---

### Issue 2: Missing or Wrong PRIVATE_KEY

**Symptom:** Test shows `PRIVATE_KEY: ❌ Missing`

**What it does:** Signs blockchain transactions to record results

**Fix:**
1. This must be the **contract owner's private key**
2. Check in your contract on Basescan: who is the owner?
3. Add to Vercel:
   ```
   PRIVATE_KEY = 0xyour_private_key_here
   ```
4. **CRITICAL:** Never commit this to GitHub!
5. Redeploy

**How to check owner:**
```
Visit: https://basescan.org/address/0x52F1819966A2F1F05baF86a5C5fcB58CDfe11Ec6
Look for: "owner()" method
```

---

### Issue 3: Missing CRON_SECRET

**Symptom:** Test shows `CRON_SECRET: ❌ Missing`

**Fix:**
```bash
# Generate secret:
openssl rand -hex 32

# Add to Vercel:
CRON_SECRET = generated_secret_here
```

Redeploy.

---

### Issue 4: Matches Not Registered

**Symptom:** Test shows `0 matches registered`

**What this means:** No matches in the contract to record results for

**Fix:**
1. Matches must be registered first via `/api/batch-register-matches`
2. This should happen automatically when matches are fetched
3. Check if matches are showing in the app
4. If not, check `/api/matches` endpoint

---

### Issue 5: Matches Not Finished Yet

**Symptom:** Test shows matches but all say "Not finished yet"

**This is normal!** Results can only be recorded after match finishes + 2 hour buffer.

**Wait for:**
- Match to finish
- Next day 00:00 UTC (cron runs automatically)
- Or manually trigger (see Step 3)

---

## Step 3: Manual Trigger (Force Recording Now)

If everything is configured but you don't want to wait for cron:

### Method 1: Via API

```bash
curl -X POST https://your-app.vercel.app/api/trigger-record-results
```

### Method 2: Via Browser

Simply visit:
```
https://your-app.vercel.app/api/trigger-record-results
```

**This will:**
1. Find all finished matches
2. Get results from Football Data API
3. Check all user predictions
4. Record correct/incorrect to blockchain
5. Return detailed results

**Expected Response:**
```json
{
  "success": true,
  "matchesProcessed": 5,
  "predictionsRecorded": 23,
  "txHash": "0x..."
}
```

---

## Step 4: Verify It Worked

### Check History

Visit: `https://your-app.vercel.app/api/profile/YOUR_ADDRESS/history`

**Should now see:**
```json
{
  "history": [
    {
      "matchId": 123,
      "userPrediction": 1,
      "actualResult": 1,
      "isCorrect": true  // ✅ No longer null!
    }
  ]
}
```

### Check Leaderboard

Visit: `https://your-app.vercel.app/api/leaderboard`

**Should now see:**
```json
{
  "leaderboard": [
    {
      "address": "0x...",
      "accuracy": 75,        // ✅ No longer 0!
      "correctPredictions": 3,
      "totalPredictions": 4
    }
  ]
}
```

### Check In App

- Profile → History → Should show ✓ or ✗ markers
- Leaderboard → Should show accuracy percentages
- Ranks should be sorted correctly

---

## Common Error Messages

### "FOOTBALL_DATA_API_KEY not configured"
➡️ Add FOOTBALL_DATA_API_KEY to Vercel env vars

### "Unauthorized"
➡️ Check CRON_SECRET is set correctly

### "No private key configured"
➡️ Add PRIVATE_KEY to Vercel env vars

### "No matches to process"
✅ This is normal! Means:
- All matches already recorded, OR
- No finished matches yet

### "Failed to fetch result for match X"
⚠️ Football Data API issue:
- Match might not be in their database
- API rate limit reached (free = 10/min)
- API temporarily down

---

## Debug Checklist

- [ ] Ran `/api/test-record-results`
- [ ] Fixed all CRITICAL issues shown
- [ ] FOOTBALL_DATA_API_KEY is set
- [ ] PRIVATE_KEY is set (contract owner key)
- [ ] CRON_SECRET is set
- [ ] NEXT_PUBLIC_URL is set
- [ ] Redeployed after adding env vars
- [ ] Waited 5 minutes for deployment
- [ ] Manually triggered via `/api/trigger-record-results`
- [ ] Checked response for errors
- [ ] Verified history shows isCorrect values
- [ ] Verified leaderboard shows accuracy

---

## Still Not Working?

### Check Vercel Logs

1. Vercel Dashboard → Your Project → Logs
2. Filter by: `record-results`
3. Look for error messages
4. Share the error with support

### Check Contract Owner

```bash
# Using cast (Foundry):
cast call 0x52F1819966A2F1F05baF86a5C5fcB58CDfe11Ec6 "owner()" --rpc-url https://mainnet.base.org

# Should return your wallet address
# If not, your PRIVATE_KEY doesn't match the owner!
```

### Check Transaction on Basescan

If manual trigger returns `txHash`:
1. Visit: https://basescan.org/tx/0xYOUR_TX_HASH
2. Check if transaction succeeded
3. Look for error message if failed

---

## Expected Timeline

### First Time Setup:
1. Add env vars → 2 minutes
2. Redeploy → 3-5 minutes
3. Manual trigger → 1-2 minutes
4. Verify results → 1 minute

**Total: ~10 minutes**

### Daily Automated:
- Cron runs at 00:00 UTC
- Takes 2-5 minutes to process
- Results appear automatically
- No manual intervention needed

---

## Success Indicators

✅ Test endpoint shows all green checkmarks
✅ Manual trigger returns success
✅ History shows `isCorrect: true/false`
✅ Leaderboard shows accuracy > 0
✅ Profile shows ✓ or ✗ markers
✅ Rankings are sorted by accuracy

---

## Need More Help?

1. Run test endpoint
2. Copy full JSON response
3. Share in support chat
4. Include any error messages from Vercel logs

**Test URL:** `https://your-app.vercel.app/api/test-record-results`

This will give us everything we need to diagnose! 🔍
