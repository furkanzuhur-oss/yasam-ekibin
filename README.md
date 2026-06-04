# Sağlık & Yaşam Ekibin 🧭

Birbirine bağlı, internetten **gerçekten** araştırma yapan ve şablon değil sana özel konuşan
çok-ajanlı bir koçluk uygulaması.

İçindeki uzmanlar:

| Ajan | Uzmanlık |
|------|----------|
| 🎯 Yaşam Koçu (Aylin) | Hedefler, alışkanlıklar, motivasyon, zaman yönetimi |
| 🧠 Psikolog (Deniz) | Stres, kaygı, uyku, duygu düzenleme |
| 🥗 Diyetisyen (Selin) | Beslenme, öğün planı, kalori/makro |
| 💪 Spor Koçu (Kerem) | Egzersiz programı, hareket, toparlanma |

## Nasıl bağlı çalışıyorlar?

- **Ortak hafıza:** Tüm ajanlar senin hakkındaki notları (`data/profile.json`) paylaşır. Biri
  bir şey öğrenince hepsi bilir.
- **Ajanlar arası danışma:** Bir uzman, kendi alanı dışındaki bir konuda `meslektaşına_danış`
  aracıyla başka bir uzmana sorar ve cevabı kendi yanıtına harmanlar (sohbette "💬 …danışıyor"
  rozetiyle görürsün).
- **Gerçek internet araştırması (ÜCRETSİZ):** Güncel/sayısal bilgi gerektiğinde `web_arama`
  aracıyla DuckDuckGo üzerinden anahtarsız canlı arama yapar ve **kaynak linki** gösterir.

## Maliyet: sıfır 💸

- **Motor:** Google Gemini — ücretsiz API anahtarı (kredi kartı gerekmez).
- **Arama:** DuckDuckGo — anahtarsız, ücretsiz.

## Kurulum

1. **Ücretsiz anahtarı al:** https://aistudio.google.com/apikey → "Create API key".
2. **Anahtarı ekle:** `.env` dosyasındaki `GEMINI_API_KEY=AIza...` satırına yapıştır.

   PowerShell:
   ```powershell
   notepad .env
   ```

2. **Başlat:**
   ```powershell
   npm install   # ilk seferde
   npm start
   ```

3. Tarayıcıda aç: http://localhost:3000

## Modlar

- **🧭 Otomatik:** Mesajını okuyup en uygun uzmana yönlendirir.
- **👥 Ekip Paneli:** Tüm uzmanlar aynı anda kendi açısından görüş verir.
- **Tek uzman:** Soldan birini seçip doğrudan onunla konuşursun.

## Yeni meslek eklemek

`src/agents.js` içindeki `AGENTS` nesnesine yeni bir kayıt ekle (id, isim, emoji, kısa tanım,
sistem talimatı). Gerisi (yönlendirme, danışma, arayüz) otomatik çalışır.

## Ayarlar (.env)

- `GEMINI_API_KEY` — ücretsiz Gemini anahtarı (zorunlu)
- `AGENT_MODEL` — ana ajan modeli (varsayılan `gemini-2.5-flash`)
- `ROUTER_MODEL` — yönlendirici modeli (varsayılan `gemini-2.5-flash-lite`)
- `PORT` — sunucu portu (varsayılan 3000)

> ⚠️ Bu uygulama bir destek/koçluk aracıdır; lisanslı bir sağlık profesyonelinin yerini tutmaz.
> Acil durumlarda bir uzmana veya acil servise başvurun.
