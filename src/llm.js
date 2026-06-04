// Google Gemini REST istemcisi (ucretsiz API anahtariyla calisir).
// Ek bir SDK gerekmez; sadece fetch kullanir.

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const AGENT_MODEL = process.env.AGENT_MODEL || "gemini-2.0-flash";
export const ROUTER_MODEL = process.env.ROUTER_MODEL || "gemini-2.0-flash-lite";

function getKey() {
  const k = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!k) {
    throw new Error(
      "GEMINI_API_KEY tanimli degil. Ucretsiz anahtari https://aistudio.google.com/apikey adresinden alip .env dosyasina ekleyin."
    );
  }
  return k;
}

const uyu = (ms) => new Promise((r) => setTimeout(r, ms));

// Yedek model zinciri: her modelin AYRI ucretsiz kotasi vardir.
// Biri 429 verince digerine gecerek efektif kotayi katlariz.
const YEDEK_MODELLER = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

function modelZinciri(ilk) {
  const zincir = [ilk, ...YEDEK_MODELLER.filter((m) => m !== ilk)];
  return [...new Set(zincir)];
}

async function tekCagri(model, body, key) {
  const r = await fetch(`${BASE}/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}

// Tek bir uretim cagrisi. 429/503'te once kisaca bekler, sonra yedek modele gecer.
export async function generate({ model, system, contents, tools }) {
  const key = getKey();
  const body = { contents };
  if (system) body.system_instruction = { parts: [{ text: system }] };
  if (tools) body.tools = tools;
  body.generationConfig = { temperature: 0.8, maxOutputTokens: 2048 };

  const zincir = modelZinciri(model);
  let sonMsg = "";

  for (let i = 0; i < zincir.length; i++) {
    const m = zincir[i];
    // Her model icin en fazla 2 kisa deneme (kisa bekleme), sonra siradaki modele gec.
    for (let deneme = 1; deneme <= 2; deneme++) {
      const { ok, status, data } = await tekCagri(m, body, key);
      if (ok) return data?.candidates?.[0]?.content || { parts: [] };
      sonMsg = data?.error?.message || JSON.stringify(data);

      if (status === 429 || status === 503) {
        if (deneme < 2) await uyu(1500); // kisa bekle, sonra tekrar dene
        break; // bu model dolu -> siradaki modele gec
      }
      // Kota disi gercek hata -> hemen firlat.
      const e = new Error(sonMsg);
      e.status = status;
      throw e;
    }
  }

  // Tum modeller dolu.
  const e = new Error(sonMsg);
  e.status = 429;
  e.dostca =
    "Ücretsiz kullanım sınırına ulaşıldı 😅 Tüm ücretsiz modeller şu an dolu. Birkaç dakika sonra tekrar dener misin? (İstersen .env içine ücretli/başka bir Gemini anahtarı eklenebilir.)";
  throw e;
}

// Bir model yanitindaki parcalardan metni ve fonksiyon cagrilarini ayikla.
export function ayikla(content) {
  const parts = content?.parts || [];
  const metin = parts
    .filter((p) => typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();
  const cagrilar = parts
    .filter((p) => p.functionCall)
    .map((p) => p.functionCall); // { name, args }
  return { metin, cagrilar };
}
