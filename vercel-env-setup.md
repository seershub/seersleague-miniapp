# Vercel Environment Variables Setup

## 🔧 **Vercel Dashboard'da Ayarlanacak Environment Variables:**

### **1. Vercel Dashboard'a Git:**
- https://vercel.com/dashboard
- SeersLeague projesini seç
- Settings > Environment Variables

### **2. Şu Variables'ları Ekle:**

```
NEXT_PUBLIC_URL = https://league.seershub.com
NEXT_PUBLIC_CHAIN_ID = 8453
NEXT_PUBLIC_BASE_RPC = https://mainnet.base.org
NEXT_PUBLIC_USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
SPORTS_DB_API_KEY = 3
VERCEL = 1
```

### **3. Contract Address (Deploy Sonrası):**
```
NEXT_PUBLIC_CONTRACT_ADDRESS = [DEPLOY SONRASI GÜNCELLENECEK]
TREASURY_ADDRESS = [SENİN WALLET ADDRESSİN]
```

### **4. Private Key (GÜVENLİK İÇİN):**
```
PRIVATE_KEY = [SENİN PRIVATE KEY'İN - SADECE DEPLOY İÇİN]
```

## ⚠️ **GÜVENLİK UYARISI:**
- Private key'i asla git'e commit etme!
- Sadece Vercel environment variables'da sakla
- Deploy sonrası silebilirsin

## 📋 **DEPLOY SIRASI:**
1. ✅ Environment variables ayarla
2. ✅ Frontend deploy et
3. ✅ Contract deploy et (private key ile)
4. ✅ Contract address'i güncelle
5. ✅ Test et
