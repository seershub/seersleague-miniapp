# Vercel Dashboard Environment Variables

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

---

## 🔑 Add These Variables

### 1. FOOTBALL_DATA_API_KEY
```
Name: FOOTBALL_DATA_API_KEY
Value: [Your API key from football-data.org]
Environment: Production, Preview, Development
```

**How to get:**
1. Visit: https://www.football-data.org/client/register
2. Sign up (FREE - no credit card)
3. Verify email
4. Copy API key from dashboard

---

### 2. CRON_SECRET
```
Name: CRON_SECRET
Value: [Random secret - generate below]
Environment: Production, Preview, Development
```

**Generate secret:**
```bash
# Mac/Linux Terminal:
openssl rand -hex 32

# Or use this online:
# https://www.random.org/strings/?num=1&len=32&digits=on&loweralpha=on&unique=on&format=plain
```

Example: `a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456`

---

### 3. NEXT_PUBLIC_URL
```
Name: NEXT_PUBLIC_URL
Value: https://your-app-name.vercel.app
Environment: Production
```

**Your actual Vercel URL** (check Deployments page)

---

### 4. NEXT_PUBLIC_DEPLOYMENT_BLOCK (Optional but Recommended)
```
Name: NEXT_PUBLIC_DEPLOYMENT_BLOCK
Value: [Your contract deployment block number]
Environment: Production, Preview, Development
```

**How to find:**
1. Go to: https://basescan.org
2. Search your contract: `0x52F1819966A2F1F05baF86a5C5fcB58CDfe11Ec6`
3. Look for "Block:" in contract details
4. Copy the number (example: `12345678`)

---

## ✅ Verification Checklist

After adding variables:

1. **Check all variables are added:**
   - FOOTBALL_DATA_API_KEY
   - CRON_SECRET
   - NEXT_PUBLIC_URL
   - NEXT_PUBLIC_DEPLOYMENT_BLOCK (optional)

2. **Select correct environments:**
   - Production ✓
   - Preview ✓ (optional)
   - Development ✓ (optional)

3. **Redeploy:**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

---

## 🧪 Test After Deployment

### Test 1: Manual Cron Trigger

```bash
curl -X POST https://your-app.vercel.app/api/cron/record-results \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Expected:** `{"success":true,"matchesProcessed":...}`

### Test 2: Leaderboard

Visit: `https://your-app.vercel.app/api/leaderboard`

**Expected:** JSON with user rankings

### Test 3: History

Visit: `https://your-app.vercel.app/api/profile/YOUR_ADDRESS/history`

**Expected:** JSON with predictions

---

## 📸 Screenshot Guide

**Where to add in Vercel:**

```
Vercel Dashboard
  └─ Your Project
      └─ Settings (tab)
          └─ Environment Variables (left sidebar)
              └─ Add New Variable (button)
                  ├─ Key: FOOTBALL_DATA_API_KEY
                  ├─ Value: [paste your key]
                  └─ Environments: [select Production]
                  └─ Save
```

---

## ⚠️ Important Notes

1. **NEVER commit these to GitHub** (they're in Vercel only)
2. **CRON_SECRET must be random** (security!)
3. **Redeploy after adding** (changes don't apply until redeploy)
4. **Copy variables exactly** (no spaces, no quotes unless needed)

---

## 🎯 Quick Copy-Paste Template

```bash
# Variable 1
FOOTBALL_DATA_API_KEY
[your_key_from_football_data_org]

# Variable 2
CRON_SECRET
[generate_with_openssl_rand_hex_32]

# Variable 3
NEXT_PUBLIC_URL
https://[your-app].vercel.app

# Variable 4 (optional)
NEXT_PUBLIC_DEPLOYMENT_BLOCK
[your_contract_deployment_block_number]
```

---

## ✨ Done!

Once added and redeployed:
- Cron jobs will run daily at 00:00 UTC
- Match results will be recorded automatically
- Leaderboard will update
- History will show checkmarks ✓

**Sistem şimdi çalışacak! 🚀**
