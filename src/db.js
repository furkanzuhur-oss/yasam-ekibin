// Depolama katmani: Firebase (Firestore) kimlik bilgisi tanimliysa bulut,
// yoksa yerel JSON dosyalari. Iki backend de ayni arayuzu sunar.
// Veriler Firestore'da JSON metni olarak tutulur (tip kisitlamalarindan kacinmak icin).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const CONV_PATH = join(DATA_DIR, "conversations.json");
const PROF_PATH = join(DATA_DIR, "profile.json");

// Servis hesabini coz (ham JSON ya da base64).
function servisHesabi() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  try {
    if (b64) return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("FIREBASE servis hesabi cozulemedi:", e.message);
  }
  return null;
}

const SVC = servisHesabi();
export const bulutModu = !!SVC;

// ---------- Firestore backend ----------
let _fs = null;
async function firestore() {
  if (!_fs) {
    _fs = (async () => {
      const { default: admin } = await import("firebase-admin");
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(SVC) });
      }
      console.log("  Bulut veritabanina baglanildi (Firebase Firestore).");
      return admin.firestore();
    })();
  }
  return _fs;
}

// ---------- Dosya yardimcilari ----------
async function dosyaOku(path, varsayilan) {
  try { return JSON.parse(await readFile(path, "utf8")); } catch { return varsayilan; }
}
async function dosyaYaz(path, obj) {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const eski = await readFile(path, "utf8");
    if (eski && eski.length > 2) await writeFile(path + ".backup", eski, "utf8");
  } catch {}
  await writeFile(path, JSON.stringify(obj, null, 2), "utf8");
}

// ---------- PROFIL ----------
export async function dbProfilOku() {
  if (bulutModu) {
    const db = await firestore();
    const d = await db.collection("meta").doc("profile").get();
    return d.exists ? JSON.parse(d.data().json) : null;
  }
  return await dosyaOku(PROF_PATH, null);
}
export async function dbProfilYaz(data) {
  if (bulutModu) {
    const db = await firestore();
    await db.collection("meta").doc("profile").set({ json: JSON.stringify(data) });
    return data;
  }
  await dosyaYaz(PROF_PATH, data);
  return data;
}

// ---------- THREAD'LER ----------
export async function dbThreadOku(id) {
  if (bulutModu) {
    const db = await firestore();
    const d = await db.collection("conversations").doc(id).get();
    return d.exists ? JSON.parse(d.data().json) : [];
  }
  const hepsi = await dosyaOku(CONV_PATH, {});
  return hepsi[id] || [];
}
export async function dbThreadYaz(id, liste) {
  if (bulutModu) {
    const db = await firestore();
    await db.collection("conversations").doc(id).set({ json: JSON.stringify(liste) });
    return liste;
  }
  const hepsi = await dosyaOku(CONV_PATH, {});
  hepsi[id] = liste;
  await dosyaYaz(CONV_PATH, hepsi);
  return liste;
}
export async function dbThreadSil(id) {
  if (bulutModu) {
    const db = await firestore();
    await db.collection("conversations").doc(id).delete();
    return;
  }
  const hepsi = await dosyaOku(CONV_PATH, {});
  delete hepsi[id];
  await dosyaYaz(CONV_PATH, hepsi);
}
export async function dbThreadOzeti() {
  const ozet = {};
  if (bulutModu) {
    const db = await firestore();
    const snap = await db.collection("conversations").get();
    snap.forEach((d) => {
      try { ozet[d.id] = JSON.parse(d.data().json).length; } catch { ozet[d.id] = 0; }
    });
    return ozet;
  }
  const hepsi = await dosyaOku(CONV_PATH, {});
  for (const [id, liste] of Object.entries(hepsi)) ozet[id] = liste.length;
  return ozet;
}
