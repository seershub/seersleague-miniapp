# SeersLeague Prize Distribution Guide

## Ödül Mekanizması

### 1. Ödül Toplama
- Kullanıcılar günlük $1 USDC ödüyor
- USDC treasury address'te toplanıyor
- Her gün için ayrı havuz (Daily Pool)

### 2. Ödül Dağıtım Süreci

#### Manuel Dağıtım (İlk Aşama)
```solidity
function distributePrizes(
    uint32 date,           // YYYYMMDD format
    address[] calldata winners,    // Kazanan adresler
    uint256[] calldata amounts     // Ödül miktarları
) external onlyOwner
```

#### Dağıtım Adımları:
1. **Sonuçları Kaydet**: `recordResults()` ile doğru tahminleri kaydet
2. **Kazananları Belirle**: Accuracy'ye göre sırala
3. **Ödülleri Dağıt**: `distributePrizes()` ile manuel dağıtım
4. **Treasury'den Transfer**: USDC treasury'den kazananlara

### 3. Ödül Havuzu Yapısı

```solidity
struct DailyPool {
    uint256 totalFees;        // Toplam toplanan ücretler
    uint256 participantCount; // Katılımcı sayısı
    bool distributed;         // Dağıtım yapıldı mı?
}
```

### 4. Kazanan Belirleme Kriterleri

1. **Accuracy**: Doğru tahmin yüzdesi
2. **Streak**: Ardışık doğru tahminler
3. **Total Predictions**: Toplam tahmin sayısı

### 5. Ödül Dağıtım Örnekleri

#### Günlük Ödüller:
- **1. Place**: Havuzun %50'si
- **2. Place**: Havuzun %30'u
- **3. Place**: Havuzun %20'si

#### Haftalık Ödüller:
- **En Yüksek Streak**: Bonus ödül
- **En Yüksek Accuracy**: Bonus ödül

### 6. Treasury Management

#### Treasury Address:
- Ana cüzdan adresin
- Tüm USDC burada toplanır
- Manuel ödül dağıtımı buradan yapılır

#### Güvenlik:
- Only owner can distribute
- Reentrancy protection
- Pausable for emergencies

### 7. Future Automation

#### Otomatik Dağıtım (Gelecek):
```solidity
function autoDistributePrizes(uint32 date) external onlyOwner {
    // Otomatik kazanan belirleme
    // Otomatik ödül dağıtımı
}
```

### 8. Monitoring & Analytics

#### Takip Edilecek Metrikler:
- Daily pool sizes
- Participant counts
- Distribution amounts
- Winner addresses
- Treasury balance

#### Dashboard Gereksinimleri:
- Real-time pool tracking
- Winner leaderboards
- Distribution history
- Treasury balance monitoring

