const elMessages = document.getElementById("messages");
const elForm = document.getElementById("composer");
const elInput = document.getElementById("input");
const elSend = document.getElementById("sendBtn");
const elAgentList = document.getElementById("agentList");
const elModeLabel = document.getElementById("modeLabel");
const elMemory = document.getElementById("memory");
const elReset = document.getElementById("resetBtn");

let mode = "auto";
let agents = [];
let profil = { veriler: {} };

const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const find = (id) => agents.find((a) => a.id === id);
const isimOf = (id) => find(id)?.isim || id;
const colorOf = (id) => find(id)?.renk || "#8a8f98";

function renderWelcome() {
  const kartlar = agents
    .map(
      (a) => `
      <button class="team-card" data-mode="${a.id}" style="--c:${a.renk}">
        <div class="tc-ava">${a.emoji}</div>
        <div class="tc-body">
          <div class="tc-name">${a.kocAdi ? a.kocAdi + " · " : ""}${a.isim}</div>
          <p>${escapeHtml(a.tanitim || a.kisaTanim)}</p>
          <span class="tc-cta">Tanışmaya başla →</span>
        </div>
      </button>`
    )
    .join("");

  elMessages.innerHTML = `
    <div class="welcome">
      <div class="welcome-mark">✦</div>
      <h2>Ekiple Tanış 👋</h2>
      <p>Aşağıdaki dört uzman birbiriyle konuşur, gerektiğinde internetten araştırır.
      Biriyle başlamak için kartına dokun — kendini tanıtıp sana özel bir form açacak.</p>
      <div class="team">${kartlar}</div>
    </div>`;

  elMessages.querySelectorAll(".team-card").forEach((c) =>
    c.addEventListener("click", () => selectMode(c.dataset.mode))
  );
}

// ---------- Yukleme ----------
async function loadAgents() {
  agents = await (await fetch("/api/agents")).json();
  for (const a of agents) {
    const btn = document.createElement("button");
    btn.className = "agent-btn";
    btn.dataset.mode = a.id;
    btn.style.setProperty("--c", a.renk);
    btn.innerHTML = `<span class="ava">${a.emoji}</span>
      <span class="info"><b>${a.isim}</b><small>${a.kisaTanim}</small></span>`;
    elAgentList.appendChild(btn);
  }
}

// Hangi sekmede kayitli sohbet var -> kucuk nokta goster
async function markThreads() {
  try {
    const ozet = await (await fetch("/api/threads")).json();
    document.querySelectorAll(".agent-btn").forEach((b) => {
      const v = ozet[b.dataset.mode] || 0;
      b.classList.toggle("has-history", v > 0);
    });
  } catch {}
}

async function loadMemory() {
  try {
    profil = await (await fetch("/api/profile")).json();
    const v = profil.veriler || {};
    const notlar = profil.notlar || [];
    const parcalar = [];
    for (const [k, val] of Object.entries(v)) parcalar.push(`<div class="note"><b>${k}:</b> ${escapeHtml(val)}</div>`);
    notlar.slice(-8).reverse().forEach((n) => parcalar.push(`<div class="note"><b>${isimOf(n.ajan)}:</b> ${escapeHtml(n.metin)}</div>`));
    elMemory.innerHTML = parcalar.length ? parcalar.join("") : `<span class="empty">Henüz kayıt yok.</span>`;
  } catch {}
  markThreads();
}

function showComposer(show) {
  elForm.style.display = show ? "" : "none";
}

async function loadThread() {
  elMessages.innerHTML = "";
  const records = await (await fetch("/api/thread/" + mode)).json();

  if (records.length) {
    records.forEach(renderRecord);
    showComposer(true);
  } else if (find(mode)) {
    renderForm(find(mode));   // tek ajan, gecmis yok -> FORM goster
    showComposer(false);
  } else {
    renderWelcome();
    showComposer(true);
  }
  elMessages.scrollTop = 0;
}

function renderRecord(rec) {
  if (rec.role === "user") {
    addBubble({ role: "user", text: rec.content });
  } else {
    addBubble({
      role: "agent", agentId: rec.agentId, name: rec.isim, emoji: rec.emoji,
      color: rec.renk || colorOf(rec.agentId), text: rec.content,
      trace: rec.trace, kaynaklar: rec.kaynaklar, plan: rec.plan,
    });
  }
}

// ---------- FORM ----------
function renderForm(agent) {
  const v = profil.veriler || {};
  const alanlar = agent.form.map((f) => {
    const deger = v[f.ad] ?? "";
    let ctrl = "";
    if (f.tip === "select") {
      const opts = f.secenekler.map((o) => `<option value="${escapeAttr(o)}" ${o === deger ? "selected" : ""}>${escapeHtml(o)}</option>`).join("");
      ctrl = `<select name="${f.ad}">${opts}</select>`;
    } else if (f.tip === "textarea") {
      ctrl = `<textarea name="${f.ad}" rows="2" placeholder="${escapeAttr(f.placeholder || "")}">${escapeHtml(deger)}</textarea>`;
    } else {
      const t = f.tip === "number" ? "number" : "text";
      ctrl = `<input type="${t}" name="${f.ad}" placeholder="${escapeAttr(f.placeholder || "")}" value="${escapeAttr(deger)}" ${f.tip === "number" ? 'inputmode="numeric"' : ""}/>`;
    }
    const hint = f.ipucu ? `<div class="field-hint" data-hint="${f.ipucu}"></div>` : "";
    return `<div class="field ${f.yarim ? "half" : "full"}">
      <label>${escapeHtml(f.etiket)}</label>${ctrl}${hint}</div>`;
  }).join("");

  const card = document.createElement("div");
  card.className = "intake-wrap";
  card.innerHTML = `
    <div class="intake-head" style="--c:${agent.renk}">
      <div class="intake-ava">${agent.emoji}</div>
      <div>
        <h2>${agent.kocAdi ? agent.kocAdi + " · " : ""}${agent.isim}</h2>
        <p>${escapeHtml(agent.selam || "Seni tanımak için birkaç bilgi alalım.")}</p>
      </div>
    </div>
    <form class="intake" id="intakeForm">
      <div class="intake-grid">${alanlar}</div>
      <div class="intake-actions">
        <button type="button" class="btn-geri" id="intakeBack">← Geri Dön</button>
        <button type="submit" class="btn-olustur" style="--c:${agent.renk}">Profilimi Oluştur & Başla ✦</button>
      </div>
    </form>`;
  elMessages.appendChild(card);

  // Hedef kilo ipucu (canli)
  const kiloEl = card.querySelector('[name="kilo"]');
  const hedefEl = card.querySelector('[name="hedefKilo"]');
  const hintEl = card.querySelector('.field-hint[data-hint="kiloHedef"]');
  if (kiloEl && hedefEl && hintEl) {
    const guncelle = () => {
      const k = parseFloat(kiloEl.value), h = parseFloat(hedefEl.value);
      if (!isNaN(k) && !isNaN(h) && k !== h) {
        const fark = +(k - h).toFixed(1);
        const hafta = Math.max(1, Math.ceil(Math.abs(fark) / 0.75));
        const d = new Date(Date.now() + hafta * 7 * 86400000);
        const tarih = `${d.getDate()} ${AYLAR[d.getMonth()]}`;
        hintEl.textContent = fark > 0 ? `Hedef: ${tarih}'a kadar -${fark} kg!` : `Hedef: ${tarih}'a kadar +${-fark} kg!`;
        hintEl.style.display = "block";
      } else { hintEl.style.display = "none"; }
    };
    kiloEl.addEventListener("input", guncelle);
    hedefEl.addEventListener("input", guncelle);
    guncelle();
  }

  card.querySelector("#intakeBack").addEventListener("click", () => selectMode("auto"));
  card.querySelector("#intakeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    submitForm(agent, e.target);
  });
}

async function submitForm(agent, formEl) {
  const veriler = {};
  for (const f of agent.form) {
    const el = formEl.querySelector(`[name="${f.ad}"]`);
    if (el) veriler[f.ad] = el.value.trim();
  }
  // basit dogrulama: isim zorunlu
  if (veriler.isim !== undefined && !veriler.isim) {
    const isimEl = formEl.querySelector('[name="isim"]');
    isimEl?.focus();
    isimEl?.classList.add("err");
    return;
  }

  elMessages.innerHTML = "";
  showComposer(true);
  const typing = addTyping();
  try {
    const data = await (await fetch("/api/form/submit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, veriler }),
    })).json();
    typing.remove();
    if (data.hata) { addBubble({ role: "agent", name: "Hata", emoji: "⚠️", color: "#c56b6b", text: data.hata }); return; }
    renderRecord(data.kullanici);
    renderRecord(data.cevap);
    loadMemory();
  } catch (err) {
    typing.remove();
    addBubble({ role: "agent", name: "Bağlantı hatası", emoji: "⚠️", color: "#c56b6b", text: err.message });
  }
}

// ---------- Mod (sekme) secimi ----------
function selectMode(m) {
  mode = m;
  try { localStorage.setItem("sonMod", m); } catch {}
  document.querySelectorAll(".agent-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
  const dot = elModeLabel.querySelector(".dot");
  if (m === "auto") { elModeLabel.childNodes[1].nodeValue = "Otomatik mod"; dot.style.background = "#8a8f98"; }
  else if (m === "panel") { elModeLabel.childNodes[1].nodeValue = "Ekip Paneli"; dot.style.background = "#9b8bbd"; }
  else { elModeLabel.childNodes[1].nodeValue = isimOf(m); dot.style.background = colorOf(m); }
  loadThread();
}

elAgentList.addEventListener("click", (e) => {
  const btn = e.target.closest(".agent-btn");
  if (!btn || btn.dataset.mode === mode) return;
  selectMode(btn.dataset.mode);
});

// ---------- Yeni sohbet (sifirla) ----------
elReset.addEventListener("click", async () => {
  if (!confirm("Bu bölümdeki sohbet ve form silinsin mi? (Ortak hafıza korunur)")) return;
  await fetch("/api/thread/" + mode, { method: "DELETE" });
  loadThread();
});

// ---------- Sohbet (form sonrasi serbest) ----------
elForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = elInput.value.trim();
  if (!text) return;
  addBubble({ role: "user", text });
  elInput.value = "";
  elInput.style.height = "auto";
  setBusy(true);
  const typing = addTyping();
  try {
    const data = await (await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, mode }),
    })).json();
    typing.remove();
    if (data.hata) { addBubble({ role: "agent", name: "Bir saniye", emoji: "⏳", color: "#e2a36a", text: data.hata }); elInput.value = text; }
    else if (data.mode === "panel")
      data.yanitlar.forEach((y) => addBubble({ role: "agent", agentId: y.agentId, name: y.isim, emoji: y.emoji, color: y.renk || colorOf(y.agentId), text: y.metin, trace: y.trace, kaynaklar: y.kaynaklar, plan: y.plan }));
    else addBubble({ role: "agent", agentId: data.agentId, name: data.isim, emoji: data.emoji, color: data.renk || colorOf(data.agentId), text: data.metin, trace: data.trace, kaynaklar: data.kaynaklar, plan: data.plan });
    loadMemory();
  } catch (err) {
    typing.remove();
    addBubble({ role: "agent", name: "Bağlantı hatası", emoji: "⚠️", color: "#c56b6b", text: err.message });
  } finally {
    setBusy(false); elInput.focus();
  }
});

// ---------- Balon ----------
function addBubble({ role, name, emoji, color, text, trace, kaynaklar, plan }) {
  removeWelcome();
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;
  const avColor = role === "user" ? "#b59a82" : color || "#8a8f98";
  const avEmoji = role === "user" ? "🧑" : emoji || "🤖";

  let traceHtml = "";
  if (trace?.length) {
    const chips = trace.map((t) => {
      if (t.tur === "danisma") return `<div class="chip">💬 <b>${isimOf(t.soran)}</b>, <b>${isimOf(t.sorulan)}</b> meslektaşına danışıyor…</div>`;
      if (t.tur === "arama") return `<div class="chip">🔎 İnternette araştırıyor: "${escapeHtml(t.sorgu || "")}"</div>`;
      if (t.tur === "hafiza") return `<div class="chip">🧠 Ortak hafızaya not: ${escapeHtml(t.bilgi || "")}</div>`;
      if (t.tur === "plan") return `<div class="chip">🥗 Beslenme planı oluşturdu</div>`;
      return "";
    }).filter(Boolean).join("");
    if (chips) traceHtml = `<div class="trace">${chips}</div>`;
  }

  let srcHtml = "";
  if (kaynaklar?.length) {
    const uniq = [...new Map(kaynaklar.map((k) => [k.url, k])).values()].slice(0, 6);
    srcHtml = `<div class="sources"><div class="lbl">İnternet kaynakları</div>` +
      uniq.map((k) => `<a href="${k.url}" target="_blank" rel="noopener">${escapeHtml(k.baslik || k.url)}</a>`).join("") + `</div>`;
  }

  msg.innerHTML = `
    <div class="avatar" style="background:${avColor}">${avEmoji}</div>
    <div class="bubble">
      ${name ? `<div class="name" style="color:${color || "var(--ink)"}">${name}</div>` : ""}
      <div class="body">${escapeHtml(text)}</div>
      ${traceHtml}${srcHtml}
    </div>`;
  elMessages.appendChild(msg);
  if (plan && plan.ogunler && plan.ogunler.length) {
    msg.querySelector(".bubble").appendChild(buildPlanCard(plan));
  }
  elMessages.scrollTop = elMessages.scrollHeight;
  return msg;
}

// ---------- Beslenme planı kartı (tiklenebilir + indirilebilir) ----------
function buildPlanCard(plan) {
  const tikler = plan.tikler || {};
  const gruplar = {};
  plan.ogunler.forEach((o, i) => {
    const g = o.gun || "Plan";
    (gruplar[g] = gruplar[g] || []).push({ ...o, _i: i });
  });

  let gunlerHtml = "";
  for (const [gun, liste] of Object.entries(gruplar)) {
    const satirlar = liste.map((o) => `
      <label class="plan-item ${tikler[o._i] ? "done" : ""}">
        <input type="checkbox" data-key="${o._i}" ${tikler[o._i] ? "checked" : ""}/>
        <span class="pi-check"></span>
        <span class="pi-text"><b>${escapeHtml(o.ogun || "")}</b> ${escapeHtml(o.icerik || "")}${o.kalori ? ` <em>${escapeHtml(o.kalori)}</em>` : ""}</span>
      </label>`).join("");
    gunlerHtml += `<div class="plan-day"><div class="pd-title">${escapeHtml(gun)}</div>${satirlar}</div>`;
  }

  const wrap = document.createElement("div");
  wrap.className = "plan-card";
  wrap.innerHTML = `
    <div class="plan-head">
      <div class="plan-title">🥗 ${escapeHtml(plan.baslik || "Beslenme Planı")}${plan.gunlukKalori ? ` <small>${escapeHtml(plan.gunlukKalori)}</small>` : ""}</div>
      <div class="plan-actions">
        <button type="button" class="plan-btn" data-act="excel">⬇ Excel</button>
        <button type="button" class="plan-btn" data-act="pdf">⬇ PDF</button>
      </div>
    </div>
    <div class="plan-body">${gunlerHtml}</div>
    ${plan.notlar ? `<div class="plan-notes">📝 ${escapeHtml(plan.notlar)}</div>` : ""}
    <div class="plan-progress"><div class="pp-bar"><i></i></div><span></span></div>`;

  const updateProgress = () => {
    const boxes = [...wrap.querySelectorAll('input[type="checkbox"]')];
    const done = boxes.filter((b) => b.checked).length;
    const pct = boxes.length ? Math.round((done / boxes.length) * 100) : 0;
    wrap.querySelector(".pp-bar i").style.width = pct + "%";
    wrap.querySelector(".plan-progress span").textContent = `${done}/${boxes.length} tamamlandı`;
  };

  wrap.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", async () => {
      cb.closest(".plan-item").classList.toggle("done", cb.checked);
      updateProgress();
      try {
        await fetch("/api/plan/tik", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, planId: plan.id, key: cb.dataset.key, value: cb.checked }),
        });
      } catch {}
    });
  });
  wrap.querySelector('[data-act="excel"]').addEventListener("click", () => planToExcel(plan));
  wrap.querySelector('[data-act="pdf"]').addEventListener("click", () => planToPrint(plan));
  updateProgress();
  return wrap;
}

function planDosyaAdi(plan) {
  return (plan.baslik || "beslenme-plani").replace(/[\\/:*?"<>|]+/g, "").trim() || "beslenme-plani";
}

function planToExcel(plan) {
  if (typeof XLSX === "undefined") {
    alert("Excel bileşeni yüklenemedi (internet bağlantısı?). PDF olarak indirebilirsin.");
    return;
  }
  const rows = [["Gün", "Öğün", "İçerik", "Kalori", "Yapıldı"]];
  const tikler = plan.tikler || {};
  plan.ogunler.forEach((o, i) =>
    rows.push([o.gun || "", o.ogun || "", o.icerik || "", o.kalori || "", tikler[i] ? "✓" : ""])
  );
  if (plan.gunlukKalori) rows.push([], ["Günlük kalori", plan.gunlukKalori]);
  if (plan.notlar) rows.push([], ["Notlar", plan.notlar]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 52 }, { wch: 12 }, { wch: 9 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plan");
  XLSX.writeFile(wb, planDosyaAdi(plan) + ".xlsx");
}

function planToPrint(plan) {
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const gruplar = {};
  plan.ogunler.forEach((o) => { const g = o.gun || "Plan"; (gruplar[g] = gruplar[g] || []).push(o); });
  let body = "";
  for (const [gun, liste] of Object.entries(gruplar)) {
    body += `<h3>${esc(gun)}</h3><table><thead><tr><th>Öğün</th><th>İçerik</th><th>Kalori</th></tr></thead><tbody>`;
    body += liste.map((o) => `<tr><td>${esc(o.ogun)}</td><td>${esc(o.icerik)}</td><td>${esc(o.kalori)}</td></tr>`).join("");
    body += `</tbody></table>`;
  }
  const w = window.open("", "_blank");
  if (!w) { alert("Açılır pencere engellendi. Tarayıcıdan izin ver."); return; }
  w.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(plan.baslik)}</title>
  <style>body{font-family:Arial,Helvetica,sans-serif;color:#222;padding:26px;max-width:780px;margin:auto}
  h1{font-size:20px;margin:0 0 4px} .sub{color:#666;font-size:13px;margin-bottom:12px}
  h3{margin:18px 0 6px;color:#3a7a52} table{width:100%;border-collapse:collapse;margin-bottom:6px}
  th,td{border:1px solid #cfd6cf;padding:6px 9px;text-align:left;font-size:13px;vertical-align:top} th{background:#eef4ee}
  .notes{margin-top:14px;font-size:13px;background:#f6f3ea;padding:10px 12px;border-radius:6px}
  .foot{margin-top:22px;color:#999;font-size:11px} @media print{.noprint{display:none}}</style></head><body>
  <h1>🥗 ${esc(plan.baslik)}</h1>
  ${plan.gunlukKalori ? `<div class="sub">${esc(plan.gunlukKalori)}</div>` : ""}
  ${body}
  ${plan.notlar ? `<div class="notes"><b>Notlar:</b> ${esc(plan.notlar)}</div>` : ""}
  <div class="foot">Yaşam Ekibin · ${new Date().toLocaleDateString("tr-TR")}</div>
  <button class="noprint" onclick="window.print()" style="margin-top:16px;padding:9px 18px;border:0;border-radius:8px;background:#3a7a52;color:#fff;font-size:14px;cursor:pointer">Yazdır / PDF kaydet</button>
  </body></html>`);
  w.document.close();
}

function addTyping() {
  removeWelcome();
  const msg = document.createElement("div");
  msg.className = "msg agent";
  msg.innerHTML = `<div class="avatar" style="background:#cdbfae">⏳</div>
    <div class="bubble"><span class="typing">Ekip düşünüyor<span class="balls"><i></i><i></i><i></i></span></span></div>`;
  elMessages.appendChild(msg);
  elMessages.scrollTop = elMessages.scrollHeight;
  return msg;
}

function removeWelcome() { document.querySelector(".welcome")?.remove(); }
function setBusy(b) { elSend.disabled = b; elInput.disabled = b; }
function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }

elInput.addEventListener("input", () => { elInput.style.height = "auto"; elInput.style.height = Math.min(elInput.scrollHeight, 170) + "px"; });
elInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); elForm.requestSubmit(); } });

// ---------- Baslat ----------
(async () => {
  await loadAgents();
  await loadMemory();
  // Son acilan sekmeyi hatirla (yenileyince kaldigin yerde kal).
  let baslangic = "auto";
  try {
    const kayitli = localStorage.getItem("sonMod");
    if (kayitli && (kayitli === "auto" || kayitli === "panel" || find(kayitli))) baslangic = kayitli;
  } catch {}
  selectMode(baslangic);
})();
