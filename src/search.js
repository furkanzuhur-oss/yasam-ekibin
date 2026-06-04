// Anahtarsiz, ucretsiz ve guvenilir web aramasi.
// Iki resmi/kararli kaynagi birlestirir (scraping yok, engellenmez):
//   1) DuckDuckGo resmi Instant Answer API
//   2) Wikipedia API (makale ozetleri)

const UA = { "User-Agent": "YasamEkibi/1.0 (kisisel saglik asistani)" };

async function ddgInstant(sorgu) {
  const out = [];
  try {
    const url =
      "https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=" +
      encodeURIComponent(sorgu);
    const r = await fetch(url, { headers: UA });
    const d = await r.json();
    if (d.AbstractText) {
      out.push({
        baslik: d.Heading || sorgu,
        url: d.AbstractURL || "",
        ozet: d.AbstractText,
      });
    }
    const flatten = (arr) => {
      for (const t of arr || []) {
        if (t.Topics) flatten(t.Topics);
        else if (t.FirstURL && t.Text)
          out.push({
            baslik: t.Text.split(" - ")[0],
            url: t.FirstURL,
            ozet: t.Text,
          });
      }
    };
    flatten(d.RelatedTopics);
  } catch {
    /* sessizce gec */
  }
  return out;
}

async function wikiAra(sorgu, dil = "tr") {
  const out = [];
  try {
    const url =
      `https://${dil}.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
      `&generator=search&gsrlimit=4&gsrsearch=${encodeURIComponent(sorgu)}` +
      `&prop=extracts&exintro=1&explaintext=1&exchars=400`;
    const r = await fetch(url, { headers: UA });
    const d = await r.json();
    const pages = d?.query?.pages || {};
    for (const p of Object.values(pages)) {
      if (!p.extract) continue;
      out.push({
        baslik: p.title,
        url: `https://${dil}.wikipedia.org/wiki/${encodeURIComponent(
          p.title.replace(/ /g, "_")
        )}`,
        ozet: p.extract.replace(/\s+/g, " ").trim(),
      });
    }
  } catch {
    /* sessizce gec */
  }
  return out;
}

// (Opsiyonel) Tavily ile yuksek kaliteli arama. Ucretsiz anahtar (kart gerekmez):
// https://app.tavily.com  ->  .env icine TAVILY_API_KEY=tvly-...
async function tavily(sorgu, limit) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query: sorgu,
        max_results: limit,
        search_depth: "basic",
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return (d.results || []).map((x) => ({
      baslik: x.title,
      url: x.url,
      ozet: (x.content || "").slice(0, 400),
    }));
  } catch {
    return null;
  }
}

export async function webArama(sorgu, limit = 6) {
  // Tavily anahtari varsa once onu dene (cok daha kaliteli).
  const tv = await tavily(sorgu, limit);
  if (tv && tv.length) return { sonuclar: tv };

  const [a, b, c] = await Promise.all([
    ddgInstant(sorgu),
    wikiAra(sorgu, "tr"),
    wikiAra(sorgu, "en"),
  ]);

  // Birlestir, bos url'leri ve tekrarlari ele.
  const hepsi = [...a, ...b, ...c].filter((x) => x.url && x.ozet);
  const gorulen = new Set();
  const sonuclar = [];
  for (const s of hepsi) {
    if (gorulen.has(s.url)) continue;
    gorulen.add(s.url);
    sonuclar.push(s);
    if (sonuclar.length >= limit) break;
  }
  return { sonuclar };
}
