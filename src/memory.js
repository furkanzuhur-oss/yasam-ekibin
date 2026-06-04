// Tum ajanlarin paylastigi ortak kullanici profili (bulut DB veya yerel dosya).
import { dbProfilOku, dbProfilYaz } from "./db.js";

const BOS_PROFIL = { veriler: {}, notlar: [], guncellenme: null };

export async function profilOku() {
  const d = await dbProfilOku();
  return d ? { ...BOS_PROFIL, ...d } : { ...BOS_PROFIL, veriler: {}, notlar: [] };
}

async function yaz(profil) {
  profil.guncellenme = new Date().toISOString();
  await dbProfilYaz(profil);
  return profil;
}

export async function profileNotEkle(ajanId, metin) {
  const profil = await profilOku();
  profil.notlar.push({ ajan: ajanId, metin: String(metin).slice(0, 500), tarih: new Date().toISOString() });
  profil.notlar = profil.notlar.slice(-100);
  return yaz(profil);
}

export async function profilVeriKaydet(veriler) {
  const profil = await profilOku();
  for (const [k, v] of Object.entries(veriler || {})) {
    if (v !== undefined && v !== null && String(v).trim() !== "") profil.veriler[k] = v;
  }
  return yaz(profil);
}

export function profilMetni(profil) {
  const v = profil?.veriler || {};
  const verSatir = Object.entries(v).map(([k, val]) => `- ${k}: ${val}`);
  const notSatir = (profil?.notlar || []).map((n) => `- (${n.ajan}) ${n.metin}`);
  if (!verSatir.length && !notSatir.length) return "Kullanici hakkinda henuz kaydedilmis bir bilgi yok.";
  let s = "Ekibin kullanici hakkinda bildikleri:\n";
  if (verSatir.length) s += "Profil bilgileri:\n" + verSatir.join("\n") + "\n";
  if (notSatir.length) s += "Notlar:\n" + notSatir.join("\n");
  return s;
}
