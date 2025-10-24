# Batch Register Script - Kullanım Kılavuzu

## 🎯 Bu Script Ne İşe Yarar?

Production API endpoint'ine istek atmak yerine, **doğrudan local'den blockchain'e maç kaydeder**.

Curl veya Talend ile uğraşmana gerek yok!

## 📋 Gereksinimler

### 1. Environment Variables (.env.local)

Projenin root dizininde `.env.local` dosyası oluştur:

```env
# Football-data.org API Key
FOOTBALL_DATA_API_KEY=ab4bf8eeaf614f969dfe8de37c58107d

# Contract Owner Private Key
PRIVATE_KEY=0x_YOUR_PRIVATE_KEY_HERE

# RPC (zaten var olabilir)
NEXT_PUBLIC_BASE_RPC=https://mainnet.base.org
```

**ÖNEMLİ:**
- `FOOTBALL_DATA_API_KEY`: Maçları çekmek için
- `PRIVATE_KEY`: Blockchain'e kayıt için (contract owner key)

### 2. Dependencies

Zaten yüklü olmalı, ama kontrol et:

```bash
npm install
```

## 🚀 Kullanım

### Adım 1: Terminal'i Aç

Projenin root dizininde terminal aç.

### Adım 2: Script'i Çalıştır

```bash
npx tsx scripts/batch-register.ts
```

### Adım 3: Bekle

Script şunları yapacak:

1. **Fetch Matches** (5-10 dakika):
   - 10 ligden maçları çeker
   - Önümüzdeki 14 günün maçlarını alır
   - Rate limit bekler (6.5s her istek arası)

2. **Check Registered**:
   - Blockchain'den kayıtlı maçları kontrol eder
   - Yeni olanları filtreler

3. **Register to Blockchain**:
   - 50'şer gruplar halinde kaydeder
   - Her batch için transaction yapar

## 📊 Örnek Çıktı

```
🚀 SeersLeague Batch Registration

==================================================

📥 Fetching matches from Football-data.org for next 14 days...

📡 PREMIER_LEAGUE...
  ✅ Found 15 matches
📡 LA_LIGA...
  ✅ Found 18 matches
📡 BUNDESLIGA...
  ✅ Found 12 matches

✅ Total matches found: 127

🔍 Checking blockchain for already registered matches...

✅ 127 matches need registration

📝 Registering matches to blockchain...

📦 Batch 1: Registering 50 matches...
   First match: Liverpool vs Arsenal
   ✅ TX: 0x1234567890abcdef...

📦 Batch 2: Registering 50 matches...
   First match: Real Madrid vs Barcelona
   ✅ TX: 0xabcdef1234567890...

📦 Batch 3: Registering 27 matches...
   First match: Bayern vs Dortmund
   ✅ TX: 0x9876543210fedcba...

==================================================
✅ BATCH REGISTRATION COMPLETE!

📊 Summary:
   - Matches fetched: 127
   - Matches registered: 127
   - Already registered: 0
   - Transactions: 3

📝 Transaction Hashes:
   1. 0x1234567890abcdef...
   2. 0xabcdef1234567890...
   3. 0x9876543210fedcba...

✅ Done! Check https://league.seershub.com/ for matches.
```

## ⚠️ Olası Hatalar

### "PRIVATE_KEY not found"

**Neden:** `.env.local` dosyası yok veya PRIVATE_KEY eksik

**Çözüm:**
```bash
# .env.local dosyası oluştur ve PRIVATE_KEY ekle
echo "PRIVATE_KEY=0x_YOUR_KEY" >> .env.local
```

### "FOOTBALL_DATA_API_KEY not found"

**Çözüm:**
```bash
echo "FOOTBALL_DATA_API_KEY=ab4bf8eeaf614f969dfe8de37c58107d" >> .env.local
```

### Rate Limit Hatası

**Neden:** Football-data.org free tier 10 req/min limiti

**Çözüm:** Normal, script otomatik bekler (6.5s aralar)

### Gas Hatası

**Neden:** Wallet'ta yeterli ETH yok

**Çözüm:** Contract owner wallet'a ETH ekle

## 💰 Maliyet

- **Gas per batch:** ~0.001-0.005 ETH
- **100 match ≈ 2 batch:** ~0.002-0.010 ETH total
- **Çok ucuz!**

## 🔄 Kaç Sıklıkla Çalıştırmalı?

**Haftada 1 kere yeterli:**

```bash
# Her Pazartesi sabahı
npx tsx scripts/batch-register.ts
```

Bu 14 günlük maçları register eder, sürekli güncel kalırsınız.

## ✅ Avantajlar

**API endpoint yerine local script:**
- ✅ Curl/Talend ile uğraşmana gerek yok
- ✅ Authorization header problemi yok
- ✅ Direkt blockchain'e yazar
- ✅ Detaylı log görürsün
- ✅ Hata ayıklama kolay

## 🚨 Güvenlik

**ÖNEMLİ:**
- `.env.local` dosyasını **ASLA** GitHub'a pushlama!
- `.gitignore` içinde `.env.local` var mı kontrol et!
- `PRIVATE_KEY` çok gizli, kimseyle paylaşma!

## 📝 İsteğe Bağlı: Farklı Gün Sayısı

Script'i düzenle (satır 239):

```typescript
// 7 gün için
const allMatches = await fetchUpcomingMatches(7);

// 30 gün için
const allMatches = await fetchUpcomingMatches(30);
```

Ya da parametre olarak ver:

```bash
# İleride eklenebilir
npx tsx scripts/batch-register.ts --days 21
```

## 🎉 Başarı Kriteri

Script başarılı olduysa:

1. **Terminalde:** "✅ BATCH REGISTRATION COMPLETE!"
2. **Blockchain:** Transaction hash'leri görünür
3. **Anasayfa:** https://league.seershub.com/ → Maçlar görünür!

## 💰 Treasury Address Update

To update the treasury address in the deployed contract:

1. Set `NEW_TREASURY_ADDRESS` in `.env.local`
2. Ensure `PRIVATE_KEY` is set (must be contract owner)
3. Run the update script:

```bash
node scripts/update-treasury.js
```

This will:
- Update the treasury address in the contract
- Save the transaction details
- Update deployment info
- Verify the change was successful

**Note:** This only changes where USDC goes, doesn't break any functionality!

---

**Son Güncelleme:** 2025-10-21
**Version:** 1.0
