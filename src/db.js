// Depolama katmani: MONGODB_URI tanimliysa bulut veritabani (MongoDB),
// yoksa yerel JSON dosyalari kullanilir. Iki backend de ayni arayuzu sunar.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const CONV_PATH = join(DATA_DIR, "conversations.json");
const PROF_PATH = join(DATA_DIR, "profile.json");

const MONGO = process.env.MONGODB_URI;
export const bulutModu = !!MONGO;

// ---------- MongoDB backend ----------
let _mongo = null;
async function mongo() {
  if (!_mongo) {
    _mongo = (async () => {
      const { MongoClient } = await import("mongodb");
      const client = new MongoClient(MONGO);
      await client.connect();
      const db = client.db(process.env.MONGODB_DB || "yasam_ekibi");
      console.log("  Bulut veritabanina baglanildi (MongoDB).");
      return { conv: db.collection("conversations"), prof: db.collection("profile") };
    })();
  }
  return _mongo;
}

// ---------- Dosya backend yardimcilari ----------
async function dosyaOku(path, varsayilan) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return varsayilan;
  }
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
    const { prof } = await mongo();
    const d = await prof.findOne({ _id: "main" });
    return d?.data || null;
  }
  return await dosyaOku(PROF_PATH, null);
}
export async function dbProfilYaz(data) {
  if (bulutModu) {
    const { prof } = await mongo();
    await prof.updateOne({ _id: "main" }, { $set: { data } }, { upsert: true });
    return data;
  }
  await dosyaYaz(PROF_PATH, data);
  return data;
}

// ---------- THREAD'LER ----------
export async function dbThreadOku(id) {
  if (bulutModu) {
    const { conv } = await mongo();
    const d = await conv.findOne({ _id: id });
    return d?.data || [];
  }
  const hepsi = await dosyaOku(CONV_PATH, {});
  return hepsi[id] || [];
}
export async function dbThreadYaz(id, liste) {
  if (bulutModu) {
    const { conv } = await mongo();
    await conv.updateOne({ _id: id }, { $set: { data: liste } }, { upsert: true });
    return liste;
  }
  const hepsi = await dosyaOku(CONV_PATH, {});
  hepsi[id] = liste;
  await dosyaYaz(CONV_PATH, hepsi);
  return liste;
}
export async function dbThreadSil(id) {
  if (bulutModu) {
    const { conv } = await mongo();
    await conv.deleteOne({ _id: id });
    return;
  }
  const hepsi = await dosyaOku(CONV_PATH, {});
  delete hepsi[id];
  await dosyaYaz(CONV_PATH, hepsi);
}
export async function dbThreadOzeti() {
  const ozet = {};
  if (bulutModu) {
    const { conv } = await mongo();
    const hepsi = await conv.find({}).toArray();
    for (const d of hepsi) ozet[d._id] = (d.data || []).length;
    return ozet;
  }
  const hepsi = await dosyaOku(CONV_PATH, {});
  for (const [id, liste] of Object.entries(hepsi)) ozet[id] = liste.length;
  return ozet;
}
