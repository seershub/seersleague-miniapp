# 🚨 URGENT FIX: 503 RPC Error + 403 API Error

Your test results show **2 critical issues**:

---

## Issue 1: Football Data API - 403 Invalid Key ❌

**Error:**
```
"footballData": {
  "status": "❌ Failed",
  "error": "HTTP 403",
  "hint": "Invalid API key"
}
```

### Fix (2 minutes):

1. **Get NEW API Key:**
   - Visit: https://www.football-data.org/client/profile
   - Login with your account
   - Find "API Token" section
   - **Copy the key** (it's a long string)

2. **Update in Vercel:**
   - Vercel Dashboard → Your Project → Settings → Environment Variables
   - Find: `FOOTBALL_DATA_API_KEY`
   - Click **Edit**
   - Paste NEW key
   - Click **Save**

3. **Redeploy:**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

**Why it failed:**
- Key might have expired
- Key might be wrong
- You might have copied it incorrectly

**Test again after redeploy:**
```
https://your-app.vercel.app/api/test-record-results
```

Should show: `"footballData": { "status": "✅ Working" }`

---

## Issue 2: Base RPC Down - 503 Error ❌

**Error:**
```
"blockchain": {
  "status": "❌ Error",
  "error": "Status: 503... no backend is currently healthy"
}
```

**Why it failed:**
- `mainnet.base.org` is Base's FREE public RPC
- It's **overloaded** and frequently down
- Not reliable for production

### Fix: Use Alchemy RPC (3 minutes):

#### Step 1: Get Alchemy Key (FREE)

1. Visit: https://dashboard.alchemy.com/
2. Sign up (free - no credit card)
3. Click **"Create New App"**
4. Settings:
   - Name: `SeersLeague Base`
   - Chain: **Base**
   - Network: **Base Mainnet**
5. Click **"Create App"**
6. Click **"View Key"**
7. Copy the **"HTTPS"** URL (looks like: `https://base-mainnet.g.alchemy.com/v2/ABC123...`)

#### Step 2: Add to Vercel

1. Vercel Dashboard → Settings → Environment Variables
2. Find: `NEXT_PUBLIC_BASE_RPC`
3. Click **Edit**
4. Replace with: `https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY`
5. Save
6. **Redeploy**

**Free Tier Limits:**
- 300M compute units/month
- More than enough for your app
- Much faster and more reliable

---

## Quick Reference

### Alchemy RPC URL Format:
```
https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

Example:
```
https://base-mainnet.g.alchemy.com/v2/abc123def456...
```

### Alternative RPC Providers:

**Option 1: Alchemy** (Recommended)
```
https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
Free: 300M compute units/month
```

**Option 2: Infura**
```
https://base-mainnet.infura.io/v3/YOUR_KEY
Free: 100K requests/day
Get key: https://infura.io/
```

**Option 3: QuickNode**
```
https://your-endpoint.base-mainnet.quiknode.pro/YOUR_KEY/
Free: Limited requests
Get key: https://www.quicknode.com/
```

---

## After Both Fixes

### Test Again:

```
https://your-app.vercel.app/api/test-record-results
```

**Should see:**
```json
{
  "environment": {
    "FOOTBALL_DATA_API_KEY": "✅ Set",
    "PRIVATE_KEY": "✅ Set"
  },
  "api": {
    "footballData": {
      "status": "✅ Working"
    }
  },
  "contract": {
    "blockchain": {
      "status": "✅ Connected"
    }
  },
  "summary": {
    "status": "✅ All Good",
    "criticalIssues": 0
  }
}
```

### Then Manually Trigger:

```
https://your-app.vercel.app/api/trigger-record-results
```

**Should return:**
```json
{
  "success": true,
  "matchesProcessed": 5,
  "predictionsRecorded": 23,
  "txHash": "0x..."
}
```

### Verify in App:

1. **Profile → History**
   - Should show ✓ or ✗ markers
   - No more "pending" only

2. **Leaderboard**
   - Should show accuracy percentages (75%, 80%, etc.)
   - Not 0/9 anymore

---

## Summary Checklist

- [ ] Got NEW Football Data API key
- [ ] Updated FOOTBALL_DATA_API_KEY in Vercel
- [ ] Got Alchemy API key
- [ ] Updated NEXT_PUBLIC_BASE_RPC in Vercel
- [ ] Redeployed app
- [ ] Waited 5 minutes
- [ ] Tested: /api/test-record-results shows all green
- [ ] Triggered: /api/trigger-record-results
- [ ] Verified: History shows ✓ markers
- [ ] Verified: Leaderboard shows accuracy

---

## Why These Services Are Free

### Football-Data.org:
- Free tier: 10 API calls/minute
- Perfect for daily cron jobs
- No credit card needed

### Alchemy:
- Free tier: 300M compute units/month
- ~1M requests/month
- Your app won't exceed this
- No credit card needed

---

## Expected Time

- Get Alchemy key: 3 minutes
- Get new Football Data key: 2 minutes
- Update Vercel: 2 minutes
- Redeploy: 5 minutes
- Test and verify: 3 minutes

**Total: ~15 minutes**

---

## Still Getting Errors?

Share the NEW test results after:
1. Updating both keys
2. Redeploying
3. Waiting 5 minutes
4. Running test again

The test endpoint will tell us exactly what's still wrong! 🔍
