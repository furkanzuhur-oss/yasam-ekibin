# 📱 Buluta Taşıma + Android APK (tamamen ücretsiz)

Hedef: Uygulama bulutta çalışsın (her cihazdan eriş), veriler bulut veritabanında
güvende olsun ve telefona **APK olarak** kurulabilsin.

Üç ücretsiz hesap gerekiyor: **MongoDB Atlas** (veritabanı), **GitHub** (kod),
**Render** (barındırma). Sonra **PWABuilder** ile APK üretilecek. Hiçbiri ücret almaz.

---

## 1) Bulut veritabanı — MongoDB Atlas (5 dk)

1. https://www.mongodb.com/cloud/atlas/register → ücretsiz kayıt ol.
2. **Create** → **M0 (Free)** cluster oluştur (bölge: sana yakın, örn. Frankfurt).
3. **Database Access** → **Add New Database User** → kullanıcı adı + şifre belirle (not al).
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (0.0.0.0/0).
5. **Database** → **Connect** → **Drivers** → çıkan bağlantı adresini kopyala:
   `mongodb+srv://KULLANICI:SIFRE@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`
   (KULLANICI/SIFRE kısmını kendi bilgilerinle değiştir.)

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
   - `MONGODB_URI` = (1. adımdaki bağlantı adresi)
   - `MONGODB_DB` = `yasam_ekibi`
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
- Veriler artık MongoDB Atlas'ta; hangi cihazdan girersen aynı sohbetler.
- Anahtarları sadece Render'ın Environment bölümüne girdin; kodda/GitHub'da yok.
- İleride kod güncelleyince `git push` yeterli — Render otomatik yeniden dağıtır.
