# Match Registration System - User Guide

## 🎯 Problem Solved

**OLD SYSTEM (Manual & Broken):**
- ❌ Had to toggle `ENABLE_AUTO_REGISTRATION` in Vercel every time
- ❌ Spam transactions when left enabled
- ❌ Started matches still showing on homepage
- ❌ Users couldn't make predictions (no matches to play)
- ❌ Time-consuming manual work

**NEW SYSTEM (Automated & Smart):**
- ✅ Batch register matches once per week
- ✅ No spam transactions
- ✅ Started matches automatically hidden
- ✅ Always shows playable matches
- ✅ One-time setup, runs automatically

---

## 🚀 How It Works

### 1. Admin Registers Matches (Once per Week)

Run this command to register upcoming matches for the next 14 days:

```bash
curl -X POST "https://league.seershub.com/api/batch-register-matches?days=14" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

**What this does:**
1. Fetches all upcoming matches from Football-data.org (next 14 days)
2. Checks which matches are already registered on blockchain
3. Registers NEW matches in batches (50 at a time)
4. Returns transaction hashes and match list

**Response:**
```json
{
  "success": true,
  "message": "Successfully registered 127 matches",
  "matchesFetched": 150,
  "matchesRegistered": 127,
  "alreadyRegistered": 23,
  "transactions": ["0x...", "0x..."],
  "matches": [
    {
      "id": "456789",
      "match": "Liverpool vs Arsenal",
      "league": "Premier League",
      "kickoff": "2025-10-25T20:00:00Z"
    }
  ]
}
```

### 2. Frontend Shows Smart Matches (Automatic)

`GET /api/matches` now:
1. Fetches `MatchRegistered` events from blockchain
2. Filters out matches that already started
3. Enriches with Football-data.org (team names, badges, etc.)
4. Returns only **REGISTERED + NOT STARTED** matches

**Frontend benefits:**
- Always shows playable matches
- Started matches auto-removed
- No manual intervention needed
- Pagination support (up to 50 matches)

---

## 🔧 Setup (One-Time)

### 1. Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```env
# Admin/Cron authentication
ADMIN_SECRET=your_random_admin_secret_string

# Football-data.org API (required)
FOOTBALL_DATA_API_KEY=your_api_key_from_football_data_org

# Blockchain (required)
PRIVATE_KEY=0x... # Contract owner wallet private key
NEXT_PUBLIC_BASE_RPC=https://mainnet.base.org

# Optional but recommended
NEXT_PUBLIC_DEPLOYMENT_BLOCK=block_number_when_contract_deployed
```

### 2. Initial Match Registration

After deploying, run batch registration once:

```bash
curl -X POST "https://league.seershub.com/api/batch-register-matches?days=14" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

---

## 📅 Weekly Workflow

### Option A: Manual (Recommended for Now)

**Once per week (e.g., every Monday):**

```bash
# Register matches for next 2 weeks
curl -X POST "https://league.seershub.com/api/batch-register-matches?days=14" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

**That's it!** Matches are registered, and the frontend automatically shows them.

### Option B: Automated (Future Enhancement)

Add a weekly cron job in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/batch-register",
      "schedule": "0 0 * * 1"  // Every Monday at 00:00 UTC
    }
  ]
}
```

---

## 🎮 Usage Examples

### Check Current Matches

```bash
# Get next 20 matches
curl "https://league.seershub.com/api/matches"

# Get more matches (up to 50)
curl "https://league.seershub.com/api/matches?limit=50"
```

**Response:**
```json
{
  "matches": [
    {
      "id": "456789",
      "homeTeam": "Liverpool",
      "awayTeam": "Arsenal",
      "league": "Premier League",
      "kickoff": "2025-10-25T20:00:00Z",
      "venue": "Anfield",
      "homeTeamBadge": "https://...",
      "awayTeamBadge": "https://...",
      "status": "Not Started"
    }
  ],
  "total": 45,
  "returned": 20,
  "hasMore": true,
  "registeredTotal": 127
}
```

### Register Matches for Different Periods

```bash
# Next 7 days (weekly)
curl -X POST "https://league.seershub.com/api/batch-register-matches?days=7" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"

# Next 30 days (monthly)
curl -X POST "https://league.seershub.com/api/batch-register-matches?days=30" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

---

## 🔍 Troubleshooting

### No Matches Showing on Homepage

**Possible Causes:**
1. No matches registered yet
2. All registered matches already started
3. Football-data.org API key not configured

**Solution:**
```bash
# Check matches endpoint
curl "https://league.seershub.com/api/matches"

# If empty, register new matches
curl -X POST "https://league.seershub.com/api/batch-register-matches?days=14" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

### "Unauthorized" Error

Check that:
- `ADMIN_SECRET` is set in Vercel environment variables
- You're using the correct secret in Authorization header

### Rate Limit Errors (Football-data.org)

**Free tier limits:**
- 10 requests per minute
- Solution: The batch endpoint handles this automatically with delays

### Transaction Failures

Check:
- `PRIVATE_KEY` is contract owner's key
- Wallet has enough ETH for gas
- Contract address is correct

---

## 📊 Monitoring

### Check Registration Status

```bash
curl "https://league.seershub.com/api/batch-register-matches"
```

Returns endpoint info without registering anything.

### Vercel Logs

1. Go to Vercel Dashboard → Your Project → Logs
2. Filter by function: `api/batch-register-matches`
3. Look for:
   - ✅ Successfully registered messages
   - ❌ Error messages

---

## 🎯 Best Practices

### 1. Register Weekly

Run batch registration every Monday:
- Covers next 2 weeks
- Ensures fresh matches always available
- Minimal API usage

### 2. Monitor Match Count

If frontend shows < 10 matches, register more:
```bash
curl -X POST "https://league.seershub.com/api/batch-register-matches?days=21" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

### 3. Football-data.org API Key

- Use free tier for testing
- Consider paid tier for production (higher limits)
- Rotate keys if rate limited

### 4. Gas Optimization

- Batch size: 50 matches per transaction
- Estimated gas: ~0.001-0.005 ETH per batch
- 200 matches ≈ 4 batches ≈ ~0.004-0.020 ETH total

---

## 🔐 Security

**IMPORTANT:**
- Never expose `ADMIN_SECRET` in client code
- Never expose `PRIVATE_KEY` in client code
- Only use `ADMIN_SECRET` in server-side API calls
- Rotate `ADMIN_SECRET` periodically

---

## 🆚 Old vs New Comparison

| Feature | Old System | New System |
|---------|-----------|------------|
| **Registration** | Manual toggle in Vercel | One API call per week |
| **Spam Transactions** | Yes (if left on) | No |
| **Started Matches** | Show on homepage | Auto-hidden |
| **Time Required** | ~5 min per deployment | ~30 seconds per week |
| **User Experience** | Broken (no matches to play) | Always fresh matches |
| **Maintenance** | High | Low |

---

## 📝 API Reference

### POST /api/batch-register-matches

Register upcoming matches in bulk.

**Auth:** Required (`ADMIN_SECRET` or `CRON_SECRET`)

**Query Params:**
- `days` (optional): Number of days to fetch (1-30, default: 14)

**Example:**
```bash
curl -X POST "https://league.seershub.com/api/batch-register-matches?days=14" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

### GET /api/matches

Get registered + upcoming matches.

**Auth:** None (public)

**Query Params:**
- `limit` (optional): Max matches to return (1-50, default: 20)

**Example:**
```bash
curl "https://league.seershub.com/api/matches?limit=30"
```

---

## ✅ Success Criteria

After setup, you should see:

1. **Homepage:** 15-20 fresh, playable matches
2. **No started matches:** All shown matches are in the future
3. **Auto-refresh:** Started matches disappear automatically
4. **Users can predict:** All matches are registered on blockchain

---

## 🎉 Summary

**Before:** Manual, broken, time-consuming
**After:** Automated, smart, seamless

**Action Required:**
1. Set `ADMIN_SECRET` in Vercel
2. Run batch registration once
3. Repeat weekly (or set up cron)

**Result:** Perfect user experience with minimal maintenance! 🚀

---

**Last Updated:** 2025-10-21
**Version:** 2.0
