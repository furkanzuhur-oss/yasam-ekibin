import { generate, ayikla, AGENT_MODEL, ROUTER_MODEL } from "./llm.js";
import { AGENT_LIST, getAgent } from "./agents.js";
import { profilOku, profileNotEkle, profilMetni } from "./memory.js";
import { webArama } from "./search.js";

// --- Arac tanimlari (Gemini function declarations) ---------------------------
const WEB_ARAMA = {
  name: "web_arama",
  description:
    "Guncel, sayisal veya degisebilen bir bilgi gerektiginde internette GERCEK arama yapar (arastirmalar, besin degerleri, rehberler, haberler). Tahmin etme; gerektiginde bunu kullan ve kaynak goster.",
  parameters: {
    type: "object",
    properties: {
      sorgu: { type: "string", description: "Aranacak ifade." },
    },
    required: ["sorgu"],
  },
};

function consultDecl(currentAgentId) {
  const digerleri = AGENT_LIST.filter((a) => a.id !== currentAgentId);
  return {
    name: "meslektasina_danis",
    description:
      "Uzmanlik alanin disindaki bir konuda ekipteki bir meslektasina danis. Secenekler: " +
      digerleri.map((a) => `${a.id} (${a.isim})`).join(", "),
    parameters: {
      type: "object",
      properties: {
        meslektas: { type: "string", enum: digerleri.map((a) => a.id) },
        soru: {
          type: "string",
          description: "Baglam iceren net soru (kullanici durumunu ozetle).",
        },
      },
      required: ["meslektas", "soru"],
    },
  };
}

const PROFIL_GUNCELLE = {
  name: "profili_guncelle",
  description:
    "Kullanici hakkinda kalici ve onemli bir bilgiyi (hedef, alerji, kisit, tercih) tum ekibin gormesi icin ortak hafizaya kaydet.",
  parameters: {
    type: "object",
    properties: {
      bilgi: { type: "string", description: "Tek cumlelik net bilgi." },
    },
    required: ["bilgi"],
  },
};

// --- Mesajlari Gemini formatina cevir ----------------------------------------
function toContents(messages) {
  const c = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content) }],
  }));
  // Gemini ilk turun "user" olmasini ister; bastaki model turlarini at.
  while (c.length && c[0].role !== "user") c.shift();
  return c;
}

// --- Tek bir ajani calistir (arac dongusu ile) -------------------------------
function sistemKur(agent, profilStr) {
  const intake = agent.acilis?.length
    ? `\n\n--- ILK TANISMA ---\nKullaniciyi tanimak icin su bilgileri dogal bir sohbet icinde, hepsini birden degil 3-5 soruyla topla. Ortak hafizada zaten bilinenleri TEKRAR SORMA. Ogrendiklerini profili_guncelle ile kaydet:\n- ${agent.acilis.join(
        "\n- "
      )}`
    : "";
  return `${agent.sistem}${intake}\n\n--- ORTAK HAFIZA ---\n${profilStr}`;
}

async function ajaniCalistir({ agentId, contents, profilStr, trace, derinlik = 0 }) {
  const agent = getAgent(agentId);
  const system = sistemKur(agent, profilStr);

  const decls = [WEB_ARAMA, PROFIL_GUNCELLE];
  if (derinlik < 2) decls.push(consultDecl(agentId));
  const tools = [{ function_declarations: decls }];

  const calisma = [...contents];
  let kaynaklar = [];
  let guvenlik = 0;

  while (guvenlik++ < 6) {
    const content = await generate({
      model: AGENT_MODEL,
      system,
      contents: calisma,
      tools,
    });
    const { metin, cagrilar } = ayikla(content);

    if (!cagrilar.length) {
      return { metin: metin || "(Bos yanit)", kaynaklar };
    }

    calisma.push(content); // modelin fonksiyon cagrisi iceren yaniti
    const yanitParcalari = [];

    for (const cagri of cagrilar) {
      const ad = cagri.name;
      const args = cagri.args || {};

      if (ad === "web_arama") {
        trace.push({ tur: "arama", ajan: agentId, sorgu: args.sorgu });
        const { sonuclar = [] } = await webArama(args.sorgu);
        kaynaklar = kaynaklar.concat(
          sonuclar.map((s) => ({ baslik: s.baslik, url: s.url }))
        );
        yanitParcalari.push({
          functionResponse: {
            name: ad,
            response: { sonuclar: sonuclar.slice(0, 5) },
          },
        });
      } else if (ad === "profili_guncelle") {
        await profileNotEkle(agentId, args.bilgi);
        trace.push({ tur: "hafiza", ajan: agentId, bilgi: args.bilgi });
        yanitParcalari.push({
          functionResponse: { name: ad, response: { durum: "kaydedildi" } },
        });
      } else if (ad === "meslektasina_danis") {
        const hedef = getAgent(args.meslektas);
        trace.push({
          tur: "danisma",
          soran: agentId,
          sorulan: args.meslektas,
          soru: args.soru,
        });
        let gorus = "Meslektas bulunamadi.";
        if (hedef) {
          const profilGuncel = profilMetni(await profilOku());
          const sonuc = await ajaniCalistir({
            agentId: hedef.id,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Ekip arkadasin (${agent.isim}) sana danisiyor:\n\n${args.soru}\n\nKisa, net, uzmanlik alanina uygun bir gorus ver.`,
                  },
                ],
              },
            ],
            profilStr: profilGuncel,
            trace,
            derinlik: derinlik + 1,
          });
          gorus = sonuc.metin;
          kaynaklar = kaynaklar.concat(sonuc.kaynaklar);
          trace.push({ tur: "danisma_cevap", sorulan: hedef.id, cevap: gorus });
        }
        yanitParcalari.push({
          functionResponse: { name: ad, response: { gorus } },
        });
      } else {
        yanitParcalari.push({
          functionResponse: { name: ad, response: { durum: "bilinmeyen arac" } },
        });
      }
    }

    calisma.push({ role: "user", parts: yanitParcalari });
  }

  return { metin: "(Yanit sinira ulasti, tekrar deneyin.)", kaynaklar };
}

// --- Yonlendirici ------------------------------------------------------------
async function ajanSec(messages) {
  const son = [...messages].reverse().find((m) => m.role === "user");
  const metin = son ? String(son.content) : "";
  const secenekler = AGENT_LIST.map(
    (a) => `${a.id}: ${a.isim} - ${a.kisaTanim}`
  ).join("\n");
  try {
    const content = await generate({
      model: ROUTER_MODEL,
      system: `Kullanici mesajini en iyi karsilayacak uzmanin SADECE id'sini yaz, baska hicbir sey yazma.\nUzmanlar:\n${secenekler}`,
      contents: [{ role: "user", parts: [{ text: metin }] }],
    });
    const secim = ayikla(content).metin.toLowerCase();
    return AGENT_LIST.find((a) => secim.includes(a.id))?.id || "yasam_kocu";
  } catch {
    return "yasam_kocu";
  }
}

// --- Acilis mesaji: ajan kendini tanitip intake sorularina baslar ------------
export async function acilisMesaji(agentId) {
  const agent = getAgent(agentId);
  if (!agent) return null;
  const profilStr = profilMetni(await profilOku());
  const system = sistemKur(agent, profilStr);
  const content = await generate({
    model: AGENT_MODEL,
    system,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "(SISTEM YONERGESI: Kullanici bu bolumu yeni acti ve henuz bir sey yazmadi. Once kendini tek cumleyle sicakca tanit, sonra 'ILK TANISMA' bilgilerinden birkacini dogal, akici ve tek tek degil sohbet eder gibi sor. Profilde zaten bilinenleri sorma. Kisa tut.)",
          },
        ],
      },
    ],
  });
  const { metin } = ayikla(content);
  return {
    agentId,
    isim: agent.isim,
    emoji: agent.emoji,
    metin: metin || `Merhaba, ben ${agent.isim}. Seni biraz taniyabilir miyim?`,
  };
}

// --- Ana fonksiyon -----------------------------------------------------------
export async function mesajIsle({ messages, mode = "auto" }) {
  const profilStr = profilMetni(await profilOku());
  const contents = toContents(messages);

  if (mode === "panel") {
    const yanitlar = await Promise.all(
      AGENT_LIST.map(async (a) => {
        const t = [];
        const r = await ajaniCalistir({
          agentId: a.id,
          contents,
          profilStr,
          trace: t,
        });
        return {
          agentId: a.id,
          isim: a.isim,
          emoji: a.emoji,
          renk: a.renk,
          metin: r.metin,
          kaynaklar: r.kaynaklar,
          trace: t,
        };
      })
    );
    return { mode: "panel", yanitlar };
  }

  const agentId =
    mode === "auto" || !getAgent(mode) ? await ajanSec(messages) : mode;
  const agent = getAgent(agentId);
  const trace = [];
  const r = await ajaniCalistir({ agentId, contents, profilStr, trace });
  return {
    mode: "single",
    agentId,
    isim: agent.isim,
    emoji: agent.emoji,
    renk: agent.renk,
    metin: r.metin,
    kaynaklar: r.kaynaklar,
    trace,
  };
}
