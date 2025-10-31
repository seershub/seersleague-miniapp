# 🔔 Notification System Guide

SeersLeague miniapp artık **Farcaster ve Base App** bildirim sistemini destekliyor!

## 📋 Sistem Özeti

Kullanıcılar uygulamanızı favorilerine eklediğinde:
1. Webhook'a event gelir
2. Token otomatik kaydedilir (Upstash Redis)
3. Artık o kullanıcıya bildirim gönderebilirsiniz!

---

## 🚀 Kurulum (Tamamlandı ✅)

### Yüklenen Paketler:
- ✅ `@upstash/redis` - Redis client
- ✅ `@farcaster/miniapp-node` - Webhook event parser

### Oluşturulan Dosyalar:
```
lib/notifications/
  ├── redis.ts          # Redis client
  ├── storage.ts        # Token kaydetme/silme
  ├── send.ts           # Bildirim gönderme
  └── index.ts          # Exports

app/api/
  ├── webhook/route.ts           # Webhook endpoint (FAST!)
  └── notifications/send/route.ts # Örnek kullanım
```

### Environment Variables (Vercel'de otomatik eklendi):
```env
NOTIFY_REST_API_URL=https://...
NOTIFY_REST_API_TOKEN=...
NOTIFY_REST_API_READ_ONLY_TOKEN=...
```

---

## 📡 Webhook Events

Webhook endpoint: `https://league.seershub.com/api/webhook`

### Gelen Event Tipleri:

#### 1. `miniapp_added`
Kullanıcı uygulamayı favorilerine eklediğinde
```json
{
  "event": "miniapp_added",
  "notificationDetails": {
    "url": "https://api.farcaster.xyz/v1/frame-notifications",
    "token": "a05059ef2415c67b08ecceb539201cbc6"
  }
}
```
→ Token otomatik Redis'e kaydedilir

#### 2. `notifications_enabled`
Kullanıcı bildirimleri açtığında
```json
{
  "event": "notifications_enabled",
  "notificationDetails": { ... }
}
```
→ Yeni token Redis'e kaydedilir

#### 3. `notifications_disabled`
Kullanıcı bildirimleri kapattığında
```json
{
  "event": "notifications_disabled"
}
```
→ Token Redis'ten silinir

#### 4. `miniapp_removed`
Kullanıcı uygulamayı favorilerden kaldırdığında
```json
{
  "event": "miniapp_removed"
}
```
→ Token Redis'ten silinir

---

## 💡 Bildirim Gönderme Örnekleri

### Örnek 1: Tek Kullanıcıya Bildirim
```typescript
import { sendNotification } from '@/lib/notifications';

// Yeni maç başladığında
const result = await sendNotification(
  1076503,  // fid - Kullanıcının Farcaster ID'si
  309857,   // appFid - Base App = 309857, Farcaster değişir
  "New Matches Live!",  // title (max 32 chars)
  "5 exciting matches are now available for prediction",  // body (max 128 chars)
  "https://league.seershub.com"  // targetUrl (optional)
);

if (result.state === 'success') {
  console.log('Bildirim gönderildi!');
} else if (result.state === 'no_token') {
  console.log('Kullanıcı bildirimleri aktif etmemiş');
} else if (result.state === 'rate_limit') {
  console.log('Rate limit aşıldı, daha sonra tekrar dene');
}
```

### Örnek 2: Toplu Bildirim
```typescript
import { sendBulkNotifications } from '@/lib/notifications';

// Tüm kullanıcılara maç sonucu bildirimi
const results = await sendBulkNotifications([
  {
    fid: 1076503,
    appFid: 309857,
    title: "Match Results!",
    body: "Your predictions are scored. Check the leaderboard!",
  },
  {
    fid: 2000,
    appFid: 309857,
    title: "Match Results!",
    body: "Your predictions are scored. Check the leaderboard!",
  },
]);

console.log(\`Başarılı: \${results.successful}, Başarısız: \${results.failed}\`);
```

### Örnek 3: API Endpoint ile
```bash
curl -X POST https://league.seershub.com/api/notifications/send \\
  -H "Content-Type: application/json" \\
  -d '{
    "fid": 1076503,
    "appFid": 309857,
    "title": "New Matches!",
    "body": "5 new matches available",
    "targetUrl": "https://league.seershub.com"
  }'
```

---

## 🎯 Kullanım Senaryoları

### 1. Yeni Maçlar Açıldığında
```typescript
// app/api/cron/register-matches/route.ts gibi bir yerde
import { sendBulkNotifications } from '@/lib/notifications';
import { redis } from '@/lib/notifications';

// Tüm bildirimi aktif kullanıcıları bul
const keys = await redis.keys('miniapp:notifications:*:*');
const notifications = keys.map(key => {
  const [, , fid, appFid] = key.split(':');
  return {
    fid: parseInt(fid),
    appFid: parseInt(appFid),
    title: "New Matches Live!",
    body: "5 new matches ready for prediction",
  };
});

await sendBulkNotifications(notifications);
```

### 2. Maç Sonuçları Açıklandığında
```typescript
// Tahmin sonuçları kaydedildikten sonra
import { sendNotification } from '@/lib/notifications';

async function notifyUser(userAddress: string, correctPredictions: number) {
  // Kullanıcının FID'sini bul (kendi sisteminizden)
  const fid = await getUserFid(userAddress);

  await sendNotification(
    fid,
    309857, // Base App
    "Prediction Results!",
    \`You got \${correctPredictions}/5 predictions correct!\`,
    "https://league.seershub.com/leaderboard"
  );
}
```

### 3. Leaderboard Güncellendiğinde
```typescript
// Top 10'a girenlere bildirim
import { sendNotification } from '@/lib/notifications';

async function notifyTopPlayers(topPlayers: Array<{ fid: number, rank: number }>) {
  for (const player of topPlayers) {
    await sendNotification(
      player.fid,
      309857,
      "🏆 Top 10!",
      \`Congrats! You're #\${player.rank} on the leaderboard!\`,
      "https://league.seershub.com/leaderboard"
    );
  }
}
```

---

## ⚠️ Önemli Notlar

### Rate Limits (Farcaster/Base)
- **1 bildirim / 30 saniye** (kullanıcı başına)
- **100 bildirim / gün** (kullanıcı başına)

### Timeout Önleme
Webhook endpoint **10 saniye içinde** response dönüyor:
- ✅ Fire-and-forget pattern kullanılıyor
- ✅ Token kaydetme asenkron (setImmediate)
- ✅ Edge runtime kullanılıyor

### Token Sistemi
Her kullanıcı için **farklı token**:
- Fid: Kullanıcının Farcaster ID'si
- AppFid: Client app ID (Base = 309857)
- Aynı kullanıcı hem Base hem Farcaster'da uygulamayı ekleyebilir → 2 farklı token

---

## 🧪 Test Etme

### 1. Webhook Test
```bash
# Webhook çalışıyor mu?
curl https://league.seershub.com/api/webhook
```

### 2. Token Kaydetme Test
1. Base App'ten uygulamayı favorilerine ekle
2. Vercel logs'ta bak: "Saved notification token for fid=..."

### 3. Bildirim Gönderme Test
```bash
curl -X POST https://league.seershub.com/api/notifications/send \\
  -H "Content-Type: application/json" \\
  -d '{
    "fid": YOUR_FID,
    "appFid": 309857,
    "title": "Test",
    "body": "Test notification"
  }'
```

---

## 🛠️ Debugging

### Redis'te Token Var mı?
```typescript
import { getNotificationDetails } from '@/lib/notifications';

const details = await getNotificationDetails(fid, appFid);
console.log(details); // { url, token, createdAt } veya null
```

### Webhook Logs
Vercel dashboard → Functions → Logs → Filter: "/api/webhook"

---

## 📚 Kaynaklar

- [Farcaster Miniapp Specification](https://miniapps.farcaster.xyz/docs/specification)
- [Base App Notifications Guide](https://docs.base.org/mini-apps/notifications)
- [Upstash Redis Docs](https://upstash.com/docs/redis)

---

## ✅ Checklist

- [x] Upstash Redis kuruldu
- [x] Paketler yüklendi (@upstash/redis, @farcaster/miniapp-node)
- [x] Webhook endpoint oluşturuldu (/api/webhook)
- [x] Token storage fonksiyonları yazıldı
- [x] Notification sender fonksiyonları yazıldı
- [x] webhookUrl farcaster.json'da tanımlı
- [ ] Deploy edildi
- [ ] Base App'ten test edildi
- [ ] Farcaster'dan test edildi

---

**🎉 Bildirim sistemi hazır! Deploy et ve test etmeye başla!**
