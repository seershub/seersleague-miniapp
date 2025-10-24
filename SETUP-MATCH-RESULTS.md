# Match Results & Leaderboard Setup Guide

## 🚨 Critical: System is Ready But Needs Configuration

Your match result recording and leaderboard system is **fully implemented and working**, but requires environment variables to function.

---

## 📋 What's Already Working

✅ **Automated Cron Jobs** (vercel.json)
- Runs daily at 00:00 UTC
- Records match results automatically
- Updates leaderboard

✅ **Result Recording** (`/api/record-results`)
- Fetches finished matches
- Gets results from football-data.org API
- Checks all user predictions
- Records correct/incorrect to blockchain

✅ **Leaderboard Calculation** (`/api/leaderboard`)
- Sorts by: 1) Accuracy → 2) Total Predictions → 3) Streak
- Real-time data from blockchain
- Cached for performance

✅ **Prediction History** (`/api/profile/[address]/history`)
- Shows correct/incorrect predictions
- Updates when results are recorded
- Displays checkmarks ✓ for correct predictions

---

## 🔧 Required Setup (5 minutes)

### Step 1: Get Football Data API Key

1. Visit: https://www.football-data.org/client/register
2. Register for **FREE tier** (10 API calls/minute - sufficient)
3. Copy your API key

### Step 2: Generate Cron Secret

```bash
# On Mac/Linux:
openssl rand -hex 32

# Or use any random string generator
```

### Step 3: Add to Vercel Environment Variables

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these variables:

```bash
# REQUIRED - Match Results
FOOTBALL_DATA_API_KEY=your_api_key_here

# REQUIRED - Cron Job Security
CRON_SECRET=your_random_secret_here

# REQUIRED - Your Contract Owner Private Key (already set?)
PRIVATE_KEY=0x...

# OPTIONAL - Performance Optimization
NEXT_PUBLIC_DEPLOYMENT_BLOCK=your_contract_deployment_block

# REQUIRED - Your App URL
NEXT_PUBLIC_URL=https://your-app.vercel.app
```

### Step 4: Redeploy

After adding environment variables:
1. Go to **Vercel Dashboard → Deployments**
2. Click **Redeploy** on latest deployment
3. Or push a new commit to trigger deployment

---

## 🧪 Testing

### Test Match Result Recording (Manual Trigger)

```bash
# Call the cron endpoint manually:
curl -X POST https://your-app.vercel.app/api/cron/record-results \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "matchesProcessed": 5,
  "predictionsRecorded": 23,
  "txHash": "0x..."
}
```

### Test Leaderboard

Visit: `https://your-app.vercel.app/api/leaderboard`

**Should see:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "address": "0x...",
      "accuracy": 75,
      "correctPredictions": 15,
      "totalPredictions": 20
    }
  ]
}
```

### Test Prediction History

Visit: `https://your-app.vercel.app/api/profile/YOUR_ADDRESS/history`

**Should see predictions with:**
- ✅ `isCorrect: true` (correct predictions)
- ❌ `isCorrect: false` (incorrect predictions)
- ⏳ `isCorrect: null` (pending - match not finished)

---

## 🕐 How It Works

### Daily Automated Process (00:00 UTC)

1. **Cron triggers** → `/api/cron/record-results`
2. **Fetch finished matches** from blockchain
3. **For each match:**
   - Get result from football-data.org API
   - Find all users who predicted
   - Check if prediction was correct
   - Record to blockchain via `batchRecordResults`
4. **Update leaderboard** → Calculates accuracy, sorts users
5. **History updates** → Checkmarks appear for correct predictions

### Real-Time Updates

- Leaderboard: Updates every hour (or on-demand)
- History: Shows latest data from blockchain
- Profile Stats: Real-time from smart contract

---

## 🐛 Troubleshooting

### "No matches to process"

✅ Normal! Means:
- All matches already recorded, OR
- No finished matches today

### "FOOTBALL_DATA_API_KEY not configured"

❌ Add the API key to Vercel environment variables
   and redeploy

### "Unauthorized" on cron endpoint

❌ CRON_SECRET missing or incorrect

### Leaderboard shows 0 accuracy

⚠️ Results haven't been recorded yet
   - Wait for daily cron (00:00 UTC)
   - Or manually trigger record-results

### History shows no checkmarks

⚠️ Match results not recorded yet
   - Matches finish → Wait for cron (next day 00:00)
   - Or manually trigger

---

## 📊 Manual Trigger Options

### Option 1: Via API

```bash
curl -X POST https://your-app.vercel.app/api/cron/record-results \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option 2: Via Vercel Dashboard

1. Go to **Vercel Dashboard → Cron Jobs**
2. Find `record-results`
3. Click **Run Now**

### Option 3: Wait for Automatic

Cron runs daily at 00:00 UTC automatically.

---

## 🎯 Expected User Experience

### After Match Finishes

**User predicts:** Arsenal vs Chelsea → Arsenal win ⚽
**Match finishes:** Arsenal 2 - 1 Chelsea 🏆
**Next day (00:00 UTC):** Cron runs
**Result:**
- ✅ User's history shows checkmark
- 📊 Leaderboard updates with accuracy
- 🔥 Streak increases

### Leaderboard

**Sorted by:**
1. **Accuracy** (highest first) - 80% beats 75%
2. **Total Predictions** (more is better) - 20 predictions beats 10
3. **Current Streak** (longest first) - 5 streak beats 3

---

## 📝 Summary Checklist

- [ ] Get Football Data API key
- [ ] Generate CRON_SECRET
- [ ] Add to Vercel environment variables
- [ ] Redeploy application
- [ ] Test manual trigger
- [ ] Wait for first cron run (00:00 UTC)
- [ ] Verify leaderboard updates
- [ ] Check prediction history checkmarks

---

## 💡 Pro Tips

1. **First cron run:** Takes 1-5 minutes (processes all finished matches)
2. **API rate limit:** Free tier = 10 calls/min (sufficient for daily runs)
3. **Gas costs:** Owner pays gas for `batchRecordResults` (automated)
4. **Performance:** Add DEPLOYMENT_BLOCK to skip old blocks
5. **Monitoring:** Check Vercel logs for cron execution

---

## 🎉 That's It!

Once environment variables are set, the system will:
- ✅ Automatically record results daily
- ✅ Update leaderboard with correct rankings
- ✅ Show checkmarks in prediction history
- ✅ Calculate accuracy and streaks

**No code changes needed - just configuration! 🚀**
