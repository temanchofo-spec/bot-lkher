const fs = require("fs");
const path = require("path");
const https = require("https");

const TMP_DIR = path.join(__dirname, "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { timeout: 90000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close(); fs.unlink(dest, () => {});
        return downloadImage(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close(); fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
    });
    req.on("error", (err) => { file.close(); fs.unlink(dest, () => {}); reject(err); });
    req.on("timeout", () => { req.destroy(new Error("timeout")); });
  });
}

module.exports = {
  config: {
    name: "تخيل",
    aliases: ["imagine", "img", "صورة"],
    version: "1.0",
    author: "Nero",
    countDown: 5,
    role: 0,
    shortDescription: { ar: "صنع صورة من وصف" },
    longDescription: { ar: "نيرو كيصور لك أي حاجة كتطلب منو" },
    category: "الذكاء الاصطناعي",
    guide: { ar: "{pn} <وصف الصورة>" },
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    if (args.length === 0) {
      return api.sendMessage("قول لي شنو نصور ليك 🎨\nمثلا: /تخيل قط أبيض كيلعب فالثلج", threadID, () => {}, messageID);
    }

    const prompt = args.join(" ").trim();
    if (prompt.length < 3) {
      return api.sendMessage("الوصف قصير بزاف، زيد شوية تفاصيل 🙏", threadID, () => {}, messageID);
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const filePath = path.join(TMP_DIR, `img_${Date.now()}_${Math.floor(Math.random() * 9999)}.png`);

    try {
      const seed = Math.floor(Math.random() * 1000000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true`;
      await downloadImage(url, filePath);

      const stat = fs.statSync(filePath);
      if (!stat.size || stat.size < 1024) {
        fs.unlink(filePath, () => {});
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("ماقدرتش نصور هاد الحاجة 😕 جرب وصف آخر", threadID, () => {}, messageID);
      }
      api.setMessageReaction("✅", messageID, () => {}, true);

      const cleanup = () => fs.promises.unlink(filePath).catch(() => {});
      const stream = fs.createReadStream(filePath);
      stream.on("error", (e) => {
        console.error("[TAKHAYYAL] stream error:", e?.message || e);
        cleanup();
      });

      api.sendMessage(
        { body: `🎨 ${prompt}`, attachment: stream },
        threadID,
        (err) => {
          if (err) console.error("[TAKHAYYAL] sendMessage error:", err?.message || err);
          cleanup();
        },
        messageID
      );

      setTimeout(cleanup, 60000);
    } catch (err) {
      fs.promises.unlink(filePath).catch(() => {});
      console.error("[TAKHAYYAL] Error:", err?.message || err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      const msg = String(err?.message || "").toLowerCase();
      if (msg.includes("safety") || msg.includes("blocked") || msg.includes("policy")) {
        return api.sendMessage("الوصف عندو شي حاجة ممنوعة، جرب وصف آخر 🚫", threadID, () => {}, messageID);
      }
      if (msg.includes("quota") || msg.includes("rate")) {
        return api.sendMessage("الخدمة مزحومة دابا، عاود من بعد شوية ⏳", threadID, () => {}, messageID);
      }
      return api.sendMessage("وقع مشكل فالتصوير، عاود المحاولة 🙏", threadID, () => {}, messageID);
    }
  },
};
