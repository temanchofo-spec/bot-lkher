const fs   = require("fs");
const path = require("path");
const { QUEEN_ID } = require("../utils/queenOrders");

const DATA_DIR     = path.join(__dirname, "../data");
const DEFAULT_PHOTO = path.join(DATA_DIR, "photolock_default.jpg");

function isPrivileged(uid) {
  const u = String(uid);
  if (u === QUEEN_ID) return true;
  const adminBot = global.NeroBot?.config?.adminBot || [];
  return adminBot.map(String).includes(u);
}

function getPhotoLocks() {
  if (!global.NeroBot._photoLocks) global.NeroBot._photoLocks = {};
  return global.NeroBot._photoLocks;
}

function photoPath(threadID) {
  return path.join(DATA_DIR, `photolock_${threadID}.jpg`);
}

module.exports = {
  config: {
    name: "photolock",
    aliases: ["photo", "plock"],
    version: "1.0",
    author: "NERO",
    role: 0,
    shortDescription: "قفل صورة المجموعة ضد التغيير",
    longDescription: "يقفل صورة المجموعة — إذا غيرها أحد البوت يرجعها خلال 4 ثواني",
    category: "moderation",
    guide: "{pn} on [أرسل صورة] | {pn} off",
    priority: 1,
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    if (!isPrivileged(senderID)) {
      return api.sendMessage("هاد الأمر غير للادمن 🚫", threadID, () => {}, messageID);
    }

    const sub = (args[0] || "").toLowerCase().trim();

    // ── إيقاف القفل ──
    if (sub === "off" || sub === "stop" || sub === "وقف" || sub === "إيقاف") {
      const locks = getPhotoLocks();
      if (locks[threadID]) {
        delete locks[threadID];
        return api.sendMessage("✅ تلغى قفل صورة المجموعة 🔓", threadID, () => {}, messageID);
      }
      return api.sendMessage("صورة المجموعة ما كانتش مقفولة أصلاً 🤷", threadID, () => {}, messageID);
    }

    // ── تفعيل القفل ──
    if (sub === "on" || sub === "lock" || sub === "قفل" || sub === "") {
      const https = require("https");
      const http  = require("http");

      // اختيار الصورة: مرفقة أو الديفولت
      let imgSrc = null;
      const attachments = event.attachments || [];
      for (const att of attachments) {
        if (att.type === "photo" && (att.largePreviewUrl || att.previewUrl || att.url)) {
          imgSrc = att.largePreviewUrl || att.previewUrl || att.url;
          break;
        }
      }

      const saveTo = photoPath(threadID);

      if (imgSrc) {
        // تحميل الصورة المرفقة وحفظها
        await new Promise((resolve, reject) => {
          const fetchImg = (url, redirects = 5) => {
            if (redirects === 0) return reject(new Error("too many redirects"));
            const mod = url.startsWith("https") ? https : http;
            mod.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, res => {
              if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
                return fetchImg(res.headers.location, redirects - 1);
              if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
              const out = fs.createWriteStream(saveTo);
              res.pipe(out);
              out.on("finish", resolve);
              out.on("error", reject);
            }).on("error", reject);
          };
          fetchImg(imgSrc);
        });
      } else if (fs.existsSync(DEFAULT_PHOTO)) {
        fs.copyFileSync(DEFAULT_PHOTO, saveTo);
      } else {
        return api.sendMessage(
          "ارسل الصورة اللي بغيتي تقفل عليها مع الأمر 📸\n/photolock on",
          threadID, () => {}, messageID
        );
      }

      // دير الصورة على المجموعة
      try {
        await api.changeGroupImage(fs.createReadStream(saveTo), threadID);
        getPhotoLocks()[threadID] = saveTo;
        return api.sendMessage(
          "✅ صورة المجموعة قفلات 🔒\nإلا حاول أي واحد يبدلها، كنرجعها خلال 4 ثواني.\n\nباش توقف: /photolock off",
          threadID, () => {}, messageID
        );
      } catch (err) {
        console.error("[PHOTOLOCK] error:", err?.message || err);
        return api.sendMessage("ماقدرتش نبدل الصورة ⚠️ شك أن البوت عندو الصلاحيات الكافية", threadID, () => {}, messageID);
      }
    }

    return api.sendMessage(
      "📌 أوامر قفل صورة المجموعة:\n\n/photolock on [أرسل صورة] — تقفل الصورة\n/photolock off — توقف القفل",
      threadID, () => {}, messageID
    );
  },
};
