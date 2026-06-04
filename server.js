import dotenv from "dotenv";
dotenv.config({ override: true }); // .env, ortamdaki bos degiskenlerin uzerine yazsin
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mesajIsle } from "./src/orchestrator.js";
import { AGENT_LIST, getAgent } from "./src/agents.js";
import { profilOku, profileNotEkle, profilVeriKaydet } from "./src/memory.js";
import { threadOku, threadEkle, threadTemizle, threadOzeti, llmMesajlari } from "./src/threads.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(join(__dirname, "public"), { etag: false, lastModified: false, cacheControl: false, setHeaders: (res) => res.setHeader("Cache-Control", "no-store") }));

// Ajan listesi (UI icin)
app.get("/api/agents", (_req, res) => {
  res.json(
    AGENT_LIST.map((a) => ({
      id: a.id,
      isim: a.isim,
      emoji: a.emoji,
      renk: a.renk,
      kisaTanim: a.kisaTanim,
      kocAdi: a.kocAdi,
      tanitim: a.tanitim,
      form: a.form || [],
    }))
  );
});

// Ortak hafiza (profil)
app.get("/api/profile", async (_req, res) => {
  res.json(await profilOku());
});

// Tum thread'lerin ozeti (hangi sekmede kayit var)
app.get("/api/threads", async (_req, res) => {
  res.json(await threadOzeti());
});

// Bir thread'in kayitli mesajlari (gosterim icin)
app.get("/api/thread/:id", async (req, res) => {
  res.json(await threadOku(req.params.id));
});

// Thread'i sifirla (yeni sohbet)
app.delete("/api/thread/:id", async (req, res) => {
  await threadTemizle(req.params.id);
  res.json({ ok: true });
});

// Form gonderimi: tum alanlari alir, profili olusturur ve ajan ilk plani verir
app.post("/api/form/submit", async (req, res) => {
  try {
    const { mode, veriler } = req.body || {};
    const agent = getAgent(mode);
    if (!agent || !agent.form?.length) return res.status(400).json({ hata: "Bu bolumde form yok." });

    // 1) Yapilandirilmis veriyi ortak hafizaya kaydet (tum ekip paylasir)
    await profilVeriKaydet(veriler || {});

    // 2) Doldurulan formu okunabilir ozete cevir (gosterim + LLM baglami)
    const satirlar = agent.form
      .map((f) => {
        const v = veriler?.[f.ad];
        if (v === undefined || v === null || String(v).trim() === "") return null;
        return `• ${f.etiket}: ${v}`;
      })
      .filter(Boolean);
    const formOzeti = `📋 ${agent.isim} formumu doldurdum:\n${satirlar.join("\n")}`;

    const userKayit = { role: "user", content: formOzeti, meta: { tip: "form" } };
    await threadEkle(mode, userKayit);

    // 3) Ajan ilk degerlendirme + plani versin (tek LLM cagrisi)
    const guncel = await threadOku(mode);
    const llm = llmMesajlari(guncel);
    const yonerge =
      "\n\n(Kullanici tanisma formunu yeni doldurdu. Once kisa ve sicak bir sekilde karsila ve adiyla hitap et. Verdigi bilgileri 1-2 cumleyle ozetleyip dogrula. Sonra hedefi icin ilk somut degerlendirmeni ve atabilecegi ILK adimi ver. Gerekirse netlestirmek icin en fazla 1 soru sor. Liste yerine akici konus.)";
    if (llm.length && llm[llm.length - 1].role === "user") llm[llm.length - 1].content += yonerge;
    else llm.push({ role: "user", content: yonerge });

    let sonuc = await mesajIsle({ messages: llm, mode });
    if (!sonuc.metin || !sonuc.metin.trim()) sonuc = await mesajIsle({ messages: llm, mode });

    const cevapKayit = {
      role: "assistant", content: sonuc.metin, agentId: sonuc.agentId,
      isim: sonuc.isim, emoji: sonuc.emoji, renk: sonuc.renk,
      kaynaklar: sonuc.kaynaklar, trace: sonuc.trace, meta: { tip: "ozet" },
    };
    await threadEkle(mode, cevapKayit);

    res.json({ kullanici: userKayit, cevap: cevapKayit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ hata: err.dostca || err.message });
  }
});

// Sohbet: tek yeni mesaj alir, gecmisi sunucu yonetir
app.post("/api/chat", async (req, res) => {
  try {
    const { message, mode = "auto" } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ hata: "message alani gerekli." });
    }
    const threadId = mode;
    const gecmis = await threadOku(threadId);
    const userKayit = { role: "user", content: String(message) };
    const llm = llmMesajlari([...gecmis, userKayit]);

    const sonuc = await mesajIsle({ messages: llm, mode });

    // Asistan kayitlarini olustur ve kaydet.
    const asistanKayitlari = [];
    if (sonuc.mode === "panel") {
      for (const y of sonuc.yanitlar) {
        asistanKayitlari.push({
          role: "assistant", content: y.metin, agentId: y.agentId,
          isim: y.isim, emoji: y.emoji, renk: y.renk,
          kaynaklar: y.kaynaklar, trace: y.trace,
        });
      }
    } else {
      asistanKayitlari.push({
        role: "assistant", content: sonuc.metin, agentId: sonuc.agentId,
        isim: sonuc.isim, emoji: sonuc.emoji, renk: sonuc.renk,
        kaynaklar: sonuc.kaynaklar, trace: sonuc.trace,
      });
    }
    await threadEkle(threadId, userKayit, ...asistanKayitlari);

    res.json(sonuc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ hata: err.dostca || err.message || "Sunucu hatasi" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  Saglik & Yasam Ekibi calisiyor:  http://localhost:${PORT}\n`);
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    console.log(
      "  UYARI: GEMINI_API_KEY yok. Ucretsiz anahtar: https://aistudio.google.com/apikey\n"
    );
  }
});
