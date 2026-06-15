const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const ytsr = require("yt-search");

const TMP_DIR = path.join(__dirname, "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const MAX_DURATION_SEC = 600;
// pending: msgID → { videos, threadID, senderID }
const pending = new Map();

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function searchYoutube(query) {
  return new Promise((resolve, reject) => {
    ytsr(query, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

function downloadAudio(url, outputTemplate) {
  return new Promise((resolve, reject) => {
    const args = [
      "-x", "--audio-format", "mp3", "--audio-quality", "128K",
      "-o", outputTemplate, "--no-playlist", "--no-warnings", "--quiet", url,
    ];
    const proc = spawn("yt-dlp", args);
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `yt-dlp exited ${code}`));
    });
    proc.on("error", (err) => reject(new Error("yt-dlp: " + err.message)));
    const timer = setTimeout(() => {
      try { proc.kill(); } catch (_) {}
      reject(new Error("timeout: تجاوز وقت التحميل"));
    }, 90000);
    proc.on("close", () => clearTimeout(timer));
  });
}

async function sendSong(api, video, threadID, replyToID) {
  const fileBase = `song_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  const outputTemplate = path.join(TMP_DIR, fileBase + ".%(ext)s");
  const finalPath = path.join(TMP_DIR, fileBase + ".mp3");

  const cleanup = () => {
    try {
      for (const f of fs.readdirSync(TMP_DIR)) {
        if (f.startsWith(fileBase))
          fs.promises.unlink(path.join(TMP_DIR, f)).catch(() => {});
      }
    } catch (_) {}
  };

  api.setMessageReaction("⏳", replyToID, () => {}, true);

  try {
    await downloadAudio(video.url, outputTemplate);
  } catch (err) {
    cleanup();
    api.setMessageReaction("❌", replyToID, () => {}, true);
    return api.sendMessage(
      `❌ ماقدرتش نحمل: "${video.title}"\nعاود المحاولة 🎵`,
      threadID, () => {}, replyToID
    );
  }

  if (!fs.existsSync(finalPath) || fs.statSync(finalPath).size < 1024) {
    cleanup();
    api.setMessageReaction("❌", replyToID, () => {}, true);
    return api.sendMessage("❌ فشل إنشاء ملف الصوت، عاود المحاولة 🙏", threadID, () => {}, replyToID);
  }

  const caption =
    `🎵 ${video.title}\n` +
    `👤 ${video.author?.name || "غير معروف"}\n` +
    `⏱️ ${formatDuration(video.seconds)}  |  👁️ ${formatViews(video.views)} مشاهدة`;

  api.setMessageReaction("✅", replyToID, () => {}, true);

  const stream = fs.createReadStream(finalPath);
  stream.on("error", (e) => { console.error("[SONG] stream:", e.message); cleanup(); });

  api.sendMessage(
    { body: caption, attachment: stream },
    threadID,
    (err) => {
      if (err) console.error("[SONG] send:", err?.message || err);
      cleanup();
    },
    replyToID
  );

  setTimeout(cleanup, 120000);
}

module.exports = {
  config: {
    name: "song",
    aliases: ["اغنية", "أغنية", "music", "موسيقى"],
    version: "2.0",
    author: "NERO",
    role: 0,
    shortDescription: "تحميل وإرسال أغنية من يوتيوب",
    longDescription: "ابحث عن أغنية وأرسلها صوتياً — يعرض 6 نتائج تختار منها",
    category: "media",
    guide: "{p}song <اسم الأغنية>",
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    if (!args.length) {
      return api.sendMessage(
        "🎵 اكتب اسم الأغنية:\nمثال: /song shape of you\nأو: /اغنية رأي",
        threadID, () => {}, messageID
      );
    }

    const query = args.join(" ").trim();
    api.setMessageReaction("🔍", messageID, () => {}, true);

    let videos = [];
    try {
      const result = await searchYoutube(query);
      videos = (result.videos || [])
        .filter(v => v.seconds > 0 && v.seconds <= MAX_DURATION_SEC)
        .slice(0, 6);
    } catch (err) {
      console.error("[SONG] search:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ وقع خطأ في البحث، عاود المحاولة 🙏", threadID, () => {}, messageID);
    }

    if (!videos.length) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        `❌ ما لقيت أغنية مناسبة لـ "${query}"\nجرب اسم آخر 🔎`,
        threadID, () => {}, messageID
      );
    }

    // بناء قائمة النتائج
    const lines = videos.map((v, i) =>
      `${i + 1}️⃣ ${v.title}\n    👤 ${v.author?.name || "؟"}  ⏱️ ${formatDuration(v.seconds)}`
    );
    const listMsg =
      `🎵 نتائج البحث عن: "${query}"\n` +
      `─────────────────\n` +
      lines.join("\n─────────────────\n") +
      `\n─────────────────\n` +
      `📩 ارد على هذه الرسالة برقم الأغنية (1-${videos.length})`;

    api.setMessageReaction("✅", messageID, () => {}, true);

    api.sendMessage(listMsg, threadID, (err, info) => {
      if (err || !info?.messageID) return;
      const botMsgID = info.messageID;
      pending.set(botMsgID, { videos, threadID, senderID });

      global.NeroBot.onReply.set(botMsgID, {
        commandName: "song",
        author: senderID,
        messageID: botMsgID,
        threadID,
      });

      // تنظيف بعد 5 دقائق إذا ما اختارش
      setTimeout(() => {
        pending.delete(botMsgID);
        global.NeroBot.onReply.delete(botMsgID);
      }, 5 * 60 * 1000);
    }, messageID);
  },

  onReply: async function ({ api, event, Reply }) {
    const { threadID, senderID, body, messageID } = event;
    const { messageID: botMsgID } = Reply;

    const data = pending.get(botMsgID);
    if (!data) return;

    const choice = parseInt((body || "").trim());
    if (isNaN(choice) || choice < 1 || choice > data.videos.length) {
      return api.sendMessage(
        `❌ اختار رقم بين 1 و ${data.videos.length}`,
        threadID, () => {}, messageID
      );
    }

    // نحذف الـ pending فوراً لمنع الطلبات المكررة
    pending.delete(botMsgID);
    global.NeroBot.onReply.delete(botMsgID);

    const video = data.videos[choice - 1];
    await sendSong(api, video, threadID, messageID);
  },
};
