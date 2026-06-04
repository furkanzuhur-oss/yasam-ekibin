// Sohbet gecmisi (bulut DB veya yerel dosya — db.js karar verir).
import { dbThreadOku, dbThreadYaz, dbThreadSil, dbThreadOzeti } from "./db.js";

export async function threadOku(id) {
  return await dbThreadOku(id);
}

export async function threadEkle(id, ...kayitlar) {
  const liste = await dbThreadOku(id);
  for (const k of kayitlar) liste.push({ ...k, ts: new Date().toISOString() });
  const kirpik = liste.slice(-200); // son 200 mesaj
  await dbThreadYaz(id, kirpik);
  return kirpik;
}

export async function threadTemizle(id) {
  await dbThreadSil(id);
}

export async function threadOzeti() {
  return await dbThreadOzeti();
}

// Zengin kayitlari LLM icin sade {role, content} listesine cevirir.
// Ardisik ayni rol mesajlarini birlestirir (Gemini ardisik ayni rolu sevmez).
export function llmMesajlari(kayitlar) {
  const out = [];
  for (const k of kayitlar) {
    const role = k.role === "assistant" ? "assistant" : "user";
    const metin = k.role === "assistant" && k.isim ? `${k.isim}: ${k.content}` : k.content;
    const son = out[out.length - 1];
    if (son && son.role === role) son.content += "\n\n" + metin;
    else out.push({ role, content: metin });
  }
  return out;
}
