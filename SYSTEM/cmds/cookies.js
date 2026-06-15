const fs = require("fs-extra");
const path = require("path");

const ACCOUNT_FILE = path.resolve(__dirname, "..", "..", "account.txt");
const BACKUP_DIR = path.resolve(__dirname, "..", "..", "tmp", "cookie_backups");

const REQUIRED_KEYS = ["c_user", "xs"];

function tryParse(raw) {
  if (!raw) return null;
  let txt = raw.trim();
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) txt = fence[1].trim();
  const start = txt.indexOf("[");
  const end = txt.lastIndexOf("]");
  if (start === -1 || end === -1) return null;
  try {
    const arr = JSON.parse(txt.slice(start, end + 1));
    if (!Array.isArray(arr)) return null;
    return arr;
  } catch (e) {
    return null;
  }
}

function validateCookies(arr) {
  if (!Array.isArray(arr) || arr.length < 3) {
    return { ok: false, reason: "ماشي مصفوفة JSON ولا قليلة بزاف" };
  }
  const keys = new Set();
  for (const c of arr) {
    if (!c || typeof c !== "object") {
      return { ok: false, reason: "كاين عنصر ماشي object" };
    }
    const k = c.key || c.name;
    if (!k) return { ok: false, reason: "كاين كوكي بلا key/name" };
    keys.add(k);
  }
  for (const r of REQUIRED_KEYS) {
    if (!keys.has(r)) {
      return { ok: false, reason: `ناقص الكوكي ديال "${r}"` };
    }
  }
  const userCookie = arr.find(c => (c.key || c.name) === "c_user");
  return { ok: true, userID: userCookie?.value || "?" };
}

async function backupCurrent() {
  try {
    if (!fs.existsSync(ACCOUNT_FILE)) return null;
    await fs.ensureDir(BACKUP_DIR);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(BACKUP_DIR, `account_${ts}.txt`);
    await fs.copy(ACCOUNT_FILE, backupPath);
    const files = (await fs.readdir(BACKUP_DIR))
      .filter(f => f.startsWith("account_"))
      .sort();
    while (files.length > 5) {
      const old = files.shift();
      await fs.remove(path.join(BACKUP_DIR, old));
    }
    return backupPath;
  } catch (e) {
    console.error("[COOKIES] backup error:", e.message);
    return null;
  }
}

module.exports = {
  config: {
    name: "كوكيز",
    aliases: ["cookies", "cookie", "appstate", "fbstate"],
    version: "1.0",
    author: "Nero",
    role: 2,
    shortDescription: "تجديد كوكيز الفيسبوك",
    longDescription: "تجديد كوكيز الفيسبوك ديال البوت بلا إعادة نشر. خاص ادمن البوت فقط، وفـ DM فقط.",
    category: "owner",
    guide: "{p}كوكيز <ألصق JSON ديال الكوكيز>\nأو: رد على رسالة فيها JSON واكتب /كوكيز",
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const botID = api.getCurrentUserID();

    if (threadID !== senderID && threadID !== botID) {
      try { api.unsendMessage(messageID); } catch (e) {}
      return api.sendMessage(
        "🔒 هاد الأمر خاص فالخاص (DM) فقط — الكوكيز سرية!\nصيفطها ليا فالخاص ديالي.",
        threadID, () => {}, messageID
      );
    }

    let raw = args.join(" ").trim();
    if (!raw && event.messageReply?.body) {
      raw = event.messageReply.body.trim();
    }

    if (!raw) {
      return api.sendMessage(
        "📋 طريقة الاستعمال:\n\n1️⃣ من المتصفح: استعمل extension بحال \"c3c-fbstate\" ولا \"Get cookies.txt\" باش تجيب الكوكيز كـ JSON array.\n\n2️⃣ هنا فالخاص: ألصق الكوكيز كاملة بعد الأمر:\n/كوكيز [{\"key\":\"c_user\",...}, ...]\n\nولا رد على رسالة فيها الكوكيز واكتب /كوكيز\n\n⚠️ من بعد التجديد، البوت غادي يطفي ويولي يقلع تلقائياً (~10 ثواني).",
        threadID, () => {}, messageID
      );
    }

    const parsed = tryParse(raw);
    if (!parsed) {
      return api.sendMessage(
        "❌ ماقدرتش نقرا JSON. تأكد بلي ألصقتي مصفوفة كاملة [...] بدون أخطاء.",
        threadID, () => {}, messageID
      );
    }

    const v = validateCookies(parsed);
    if (!v.ok) {
      return api.sendMessage(
        `❌ الكوكيز ماشي صحاح: ${v.reason}\n\nخاص يكون فيهم على الأقل: ${REQUIRED_KEYS.join(", ")}`,
        threadID, () => {}, messageID
      );
    }

    if (v.userID && v.userID !== botID) {
      api.sendMessage(
        `⚠️ تنبيه: الكوكيز ديال user ID مختلف!\n\n• الحالي: ${botID}\n• الجديد: ${v.userID}\n\nغادي نكمل العملية على أي حال...`,
        threadID, () => {}, messageID
      );
    }

    const backupPath = await backupCurrent();

    try {
      await fs.writeFile(ACCOUNT_FILE, JSON.stringify(parsed, null, 2), "utf8");
    } catch (e) {
      console.error("[COOKIES] write error:", e.message);
      return api.sendMessage(`❌ فشل الحفظ: ${e.message}`, threadID, () => {}, messageID);
    }

    const backupMsg = backupPath ? `\n💾 backup: ${path.basename(backupPath)}` : "";
    api.sendMessage(
      `✅ الكوكيز تجدّدات بنجاح!\n\n• User ID: ${v.userID}\n• عدد الكوكيز: ${parsed.length}${backupMsg}\n\n🔄 البوت غادي يطفي ويعاود يقلع فـ 5 ثواني... استنى شوية وغادي يولي خدّام بالكوكيز الجداد.`,
      threadID, () => {
        console.log("[COOKIES] Updated by admin", senderID, "- restarting in 5s...");
        setTimeout(() => {
          console.log("[COOKIES] Exiting now for restart with new cookies.");
          process.exit(0);
        }, 5000);
      }, messageID
    );
  },
};
