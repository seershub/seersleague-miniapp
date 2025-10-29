# 🚀 SeersLeague V2 Contract Deployment Guide

## 📋 **DEPLOYMENT ADIMLARI:**

### **1. ENVIRONMENT VARIABLES AYARLA:**

#### **A. Local .env.local dosyası oluştur:**
```bash
# .env.local dosyası oluştur
cp env.example .env.local
```

#### **B. .env.local dosyasını düzenle:**
```env
# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_BASE_RPC=https://mainnet.base.org
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# RPC Endpoints
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here

# Private Keys (REQUIRED FOR DEPLOYMENT)
PRIVATE_KEY=0x1234567890abcdef... # SENİN PRIVATE KEY'İN
TREASURY_ADDRESS=0x1234567890abcdef... # SENİN WALLET ADDRESSİN

# Contract Deployment Block (will be set after deployment)
NEXT_PUBLIC_DEPLOYMENT_BLOCK_V2=0

# API Keys
FOOTBALL_DATA_API_KEY=your_football_data_api_key_here

# Security
CRON_SECRET=your_cron_secret_here
```

### **2. CONTRACT'ı COMPILE ET:**
```bash
npx hardhat compile
```

### **3. CONTRACT'ı DEPLOY ET:**
```bash
npx hardhat run scripts/deploy-v2.ts --network base
```

### **4. DEPLOYMENT SONRASI:**

#### **A. Contract Address'i kaydet:**
Deployment sonrası çıkan contract address'i kopyala.

#### **B. .env.local dosyasını güncelle:**
```env
NEXT_PUBLIC_SEERSLEAGUE_V2_CONTRACT=0x1234567890abcdef... # DEPLOY SONRASI ADDRESS
NEXT_PUBLIC_DEPLOYMENT_BLOCK_V2=12345678 # DEPLOY SONRASI BLOCK NUMBER
```

#### **C. Vercel Environment Variables'ı güncelle:**
- Vercel Dashboard'a git
- Settings > Environment Variables
- Yeni variables ekle:
  - `NEXT_PUBLIC_SEERSLEAGUE_V2_CONTRACT`
  - `NEXT_PUBLIC_DEPLOYMENT_BLOCK_V2`

### **5. TEST ET:**
```bash
# Local test
npm run dev

# Vercel deploy
vercel --prod
```

## ⚠️ **GÜVENLİK UYARILARI:**

1. **PRIVATE KEY'İ ASLA GİT'E COMMİT ETME!**
2. **.env.local dosyası .gitignore'da olmalı**
3. **Private key'i sadece deployment için kullan**
4. **Deployment sonrası private key'i silebilirsin**

## 🔧 **TROUBLESHOOTING:**

### **Error: "No signers available"**
- PRIVATE_KEY environment variable'ını kontrol et
- .env.local dosyasının doğru yerde olduğunu kontrol et

### **Error: "Insufficient funds"**
- Wallet'ında yeterli ETH olduğunu kontrol et
- Base network'te olduğunu kontrol et

### **Error: "Gas estimation failed"**
- Gas price'ı artır
- Network congestion'ı kontrol et

## 📊 **DEPLOYMENT SONRASI KONTROLLER:**

1. Contract address'i doğru mu?
2. Contract'ın Base network'te deploy olduğunu kontrol et
3. Contract'ın doğru owner'a sahip olduğunu kontrol et
4. USDC address'inin doğru olduğunu kontrol et
5. Treasury address'inin doğru olduğunu kontrol et

## 🎯 **SONRAKI ADIMLAR:**

1. ✅ Contract deploy et
2. ✅ Environment variables güncelle
3. ✅ Frontend'i V2'ye geçir
4. ✅ Test et
5. ✅ Production'a al
