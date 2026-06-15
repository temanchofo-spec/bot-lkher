const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

const ACCOUNT_FILE = path.resolve(process.cwd(), "account.txt");

const SMART_SAVE_MS = 60 * 1000;
const HEARTBEAT_MS  = 12 * 60 * 1000;
const HEALTH_MS     = 8  * 60 * 1000;
const STARTUP_DELAY_MS = 30 * 1000;
const ADMIN_ID = "61585106907998";
const QUEEN_ID = "61589384451124";
const MAX_FAILS = 3;

let lastHash = "";
let lastSaveTime = 0;
let savesCount = 0;
let lastHeartbeatOK = 0;
let lastHealthOK = 0;
let healthFails = 0;
let alertSent = false;
let timersStarted = false;

function hashAppState(arr) {
  try {
    const minimal = arr.map(c => ({ k: c.key || c.name, v: c.value }));
    return crypto.createHash("sha256").update(JSON.stringify(minimal)).digest("hex");
  } catch {
    return "";
  }
}

function fmtAgo(ts) {
  if (!ts) return "أبداً";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}ث`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}د`;
  const hr = Math.floor(min / 60);
  return `${hr}س ${min % 60}د`;
}

async function smartSave(api, opts = {}) {
  try {
    const appState = api.getAppState();
    if (!Array.isArray(appState) || appState.length === 0) return false;
    const h = hashAppState(appState);
    if (h === lastHash && !opts.force) return false;
    await fs.writeFile(ACCOUNT_FILE, JSON.stringify(appState, null, 2), "utf8");
    lastHash = h;
    lastSaveTime = Date.now();
    savesCount++;
    if (opts.verbose !== false) {
      console.log(`[SESSIONGUARD] 💾 Cookies updated → saved (${appState.length} keys, save #${savesCount})`);
    }
    return true;
  } catch (e) {
    console.error("[SESSIONGUARD] ❌ save error:", e?.message || e);
    return false;
  }
}

function heartbeat(api) {
  try {
    const uid = api.getCurrentUserID();
    if (!uid) throw new Error("getCurrentUserID returned empty");
    try { api.getThreadHistory(uid, 1, undefined, () => {}); } catch {}
    try { if (typeof api.markAsRead === "function") api.markAsRead(uid, () => {}); } catch {}
    lastHeartbeatOK = Date.now();
    console.log("[SESSIONGUARD] 💓 heartbeat OK");
  } catch (e) {
    console.error("[SESSIONGUARD] 💔 heartbeat failed:", e?.message || e);
  }
}

function healthCheck(api) {
  let uid;
  try {
    uid = api.getCurrentUserID();
    if (!uid) throw new Error("no userID");
  } catch (e) {
    return registerFail(api, e);
  }
  try {
    api.getUserInfo(uid, (err, info) => {
      if (err || !info || !info[uid]) return registerFail(api, err || new Error("empty userInfo"));
      if (healthFails > 0) {
        console.log(`[SESSIONGUARD] ❤️ recovered after ${healthFails} fails`);
      }
      healthFails = 0;
      lastHealthOK = Date.now();
      alertSent = false;
    });
  } catch (e) {
    registerFail(api, e);
  }
}

function registerFail(api, err) {
  healthFails++;
  const msg = err?.error || err?.errorDescription || err?.message || String(err || "unknown");
  console.error(`[SESSIONGUARD] ❤️‍🩹 health FAIL #${healthFails}/${MAX_FAILS}: ${msg}`);
  if (healthFails >= MAX_FAILS) alertAdminAndRestart(api, err);
}

function alertAdminAndRestart(api, err) {
  if (alertSent) return;
  alertSent = true;
  const reason = (err?.error || err?.message || String(err || "unknown")).slice(0, 250);
  const text =
    "🚨 NERO — تنبيه طوارئ!\n\n" +
    "الجلسة ديالي ماتت ولا الكوكيز تقطعو.\n\n" +
    "🔧 الإصلاح:\n" +
    "1) جيبي كوكيز جداد من المتصفح (extension بحال c3c-fbstate)\n" +
    "2) صيفطيهم ليا فالخاص بـ:\n" +
    "/كوكيز [...]\n\n" +
    `📋 السبب: ${reason}\n\n` +
    "⏱️ غادي نقلع من جديد فـ 10 ثواني...";
  try { api.sendMessage(text, ADMIN_ID, () => {}); } catch {}
  try {
    if (QUEEN_ID && QUEEN_ID !== ADMIN_ID) api.sendMessage(text, QUEEN_ID, () => {});
  } catch {}
  console.error("[SESSIONGUARD] 🚨 SESSION DEAD — alerted admin/queen, restarting in 10s");
  setTimeout(() => {
    try { process.exit(1); } catch {}
  }, 10000);
}

module.exports = {
  config: {
    name: "cookiekeeper",
    aliases: ["sessionguard", "حارس", "session"],
    version: "2.0",
    author: "Nero",
    role: 2,
    shortDescription: "حارس الجلسة — حفظ ذكي + نبضة + كاشف موت + تنبيه",
    longDescription: "نظام حماية ثلاثي للكوكيز: حفظ تلقائي عند أي تغيير + نبضة حياة كل 12د + فحص صحي كل 8د مع تنبيه الأدمن إذا ماتت الجلسة.",
    category: "owner",
    guide: "{p}cookiekeeper [status|save] — حالة الحارس أو حفظ يدوي فوري",
    countDown: 0,
  },

  onLoad: async function ({ api }) {
    if (timersStarted) {
      console.log("[SESSIONGUARD] already initialized, skipping");
      return;
    }
    timersStarted = true;

    await smartSave(api, { force: true, verbose: false });
    lastHeartbeatOK = Date.now();
    lastHealthOK = Date.now();

    setInterval(() => smartSave(api), SMART_SAVE_MS);

    setTimeout(() => {
      heartbeat(api);
      setInterval(() => heartbeat(api), HEARTBEAT_MS);
    }, STARTUP_DELAY_MS);

    setTimeout(() => {
      healthCheck(api);
      setInterval(() => healthCheck(api), HEALTH_MS);
    }, STARTUP_DELAY_MS + 5000);

    console.log(
      `[SESSIONGUARD] 🛡️ Active — smartSave:${SMART_SAVE_MS/1000}s · heartbeat:${HEARTBEAT_MS/60000}m · health:${HEALTH_MS/60000}m`
    );
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const sub = (args[0] || "").toLowerCase();

    if (sub === "status" || sub === "حالة") {
      const lines = [
        "🛡️ حالة حارس الجلسة",
        "━━━━━━━━━━━━━━━━",
        `💾 آخر حفظ: قبل ${fmtAgo(lastSaveTime)}`,
        `📊 عدد الحفظات: ${savesCount}`,
        `💓 آخر نبضة: قبل ${fmtAgo(lastHeartbeatOK)}`,
        `❤️ آخر فحص صحي: قبل ${fmtAgo(lastHealthOK)}`,
        `❤️‍🩹 فشل متتالي: ${healthFails}/${MAX_FAILS}`,
        `🚨 تنبيه طوارئ: ${alertSent ? "تبعث" : "لا"}`,
      ];
      return api.sendMessage(lines.join("\n"), threadID, () => {}, messageID);
    }

    try {
      const ok = await smartSave(api, { force: true, verbose: true });
      const appState = api.getAppState();
      return api.sendMessage(
        ok
          ? `✅ تم الحفظ يدوياً (${appState.length} كوكي)\n💡 جرب: /cookiekeeper status`
          : "ℹ️ ما كاينش ما نحفظ (الكوكيز ما تبدلوش).",
        threadID, () => {}, messageID
      );
    } catch (err) {
      return api.sendMessage(`❌ خطأ: ${err?.message || err}`, threadID, () => {}, messageID);
    }
  },
};
