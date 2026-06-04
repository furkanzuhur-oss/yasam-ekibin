# 📱 Buluta Taşıma + Android APK (tamamen ücretsiz)

Hedef: Uygulama bulutta çalışsın (her cihazdan eriş), veriler bulut veritabanında
güvende olsun ve telefona **APK olarak** kurulabilsin.

Üç ücretsiz hesap gerekiyor: **Firebase** (veritabanı — Google hesabınla), **GitHub** (kod),
**Render** (barındırma). Sonra **PWABuilder** ile APK üretilecek. Hiçbiri ücret almaz.

---

## 1) Bulut veritabanı — Firebase Firestore (5 dk)

1. https://console.firebase.google.com → **Add project** (Google hesabınla). Analytics'i kapatabilirsin.
2. Sol menü **Build → Firestore Database** → **Create database** → **Production mode** → bölge (örn. eur3) → Enable.
3. Sol üstte ⚙️ **Project settings** → **Service accounts** sekmesi → **Generate new private key** → bir **JSON dosyası** iner.
4. Bu JSON'u base64'e çevirip tek satır yap (PowerShell):
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\inen\serviceAccount.json")) | Set-Clipboard
   ```
   (Artık panoda; bir yere yapıştırıp saklayabilirsin. Bu değer `FIREBASE_SERVICE_ACCOUNT_B64` olacak.)

---

## 2) Kodu GitHub'a yükle (5 dk)

1. https://github.com/new → boş bir repo oluştur (örn. `yasam-ekibin`), **Private** seçebilirsin.
2. Bilgisayarda proje klasöründe (PowerShell):
   ```powershell
   cd D:\1-Projeler\FZHYT
   git init
   git add .
   git commit -m "Yasam Ekibin"
   git branch -M main
   git remote add origin https://github.com/KULLANICI_ADIN/yasam-ekibin.git
   git push -u origin main
   ```
   > `.env` dosyası `.gitignore`'da olduğu için **anahtarların GitHub'a gitmez** (güvenli).

---

## 3) Buluta dağıt — Render (5 dk)

1. https://render.com → GitHub ile giriş yap.
2. **New** → **Web Service** → repo'yu seç.
3. Ayarlar otomatik gelir (Build: `npm install`, Start: `npm start`). Plan: **Free**.
4. **Environment** bölümüne şu değişkenleri ekle:
   - `GEMINI_API_KEY` = (kendi Gemini anahtarın)
   - `TAVILY_API_KEY` = (kendi Tavily anahtarın)
   - `FIREBASE_SERVICE_ACCOUNT_B64` = (1. adımdaki base64 değeri)
5. **Create Web Service** → birkaç dakikada `https://yasam-ekibin.onrender.com` gibi bir adres verir.
6. O adresi telefonda/masaüstünde aç — çalışıyor olmalı.
   > Ücretsiz plan 15 dk hareketsizlikte uyur; ilk açılış ~30-50 sn sürebilir, sonra hızlanır.

---

## 4) APK üret — PWABuilder (5 dk)

1. https://www.pwabuilder.com → Render adresini (`https://...onrender.com`) yaz, **Start**.
2. Skor ekranında **Package For Stores** → **Android** → **Generate Package**.
3. (Paket adı örn. `com.furkan.yasamekibin` olabilir.) **Download** ile `.apk` / `.aab` iner.
4. Zip içindeki **APK**'yı telefona at, aç ve kur.
   > "Bilinmeyen kaynak" uyarısı çıkarsa Ayarlar'dan bu uygulamaya kurulum izni ver.

İstersen APK yerine telefonda tarayıcıdan adresi açıp **"Ana ekrana ekle"** de diyebilirsin —
o da ikon olarak ekler (APK üretmeden).

---

## Notlar
- Veriler artık Firebase Firestore'da; hangi cihazdan girersen aynı sohbetler.
- Anahtarları sadece Render'ın Environment bölümüne girdin; kodda/GitHub'da yok.
- İleride kod güncelleyince `git push` yeterli — Render otomatik yeniden dağıtır.
