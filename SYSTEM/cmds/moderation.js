const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const request = require("request");

const BASE_IMAGE = path.join(__dirname, "tmp", "images - 2026-05-05T125917.014.jpg");
const TMP_OUT = path.join(__dirname, "tmp", "kick_out.jpg");

function getThumbSrc(api, uid) {
  return new Promise((resolve) => {
    try {
      api.getUserInfo(String(uid), (err, data) => {
        if (err || !data || !data[uid]) return resolve(null);
        resolve(data[uid].thumbSrc || null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

function downloadWithCookies(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    request(
      { url, encoding: null, followAllRedirects: true, jar: true, timeout: 8000 },
      (err, res, body) => {
        if (err || !body || res.statusCode !== 200) return resolve(null);
        resolve(body);
      }
    );
  });
}

function drawCircularAvatar(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

async function buildKickImage(api, adminID, targetID) {
  const base = await loadImage(BASE_IMAGE);
  const canvas = createCanvas(base.width, base.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(base, 0, 0, base.width, base.height);

  const [adminThumb, targetThumb] = await Promise.all([
    getThumbSrc(api, adminID),
    getThumbSrc(api, targetID),
  ]);

  console.log(`[KICK] thumbs → admin: ${adminThumb ? "OK" : "null"} | target: ${targetThumb ? "OK" : "null"}`);

  const [adminBuf, targetBuf] = await Promise.all([
    downloadWithCookies(adminThumb),
    downloadWithCookies(targetThumb),
  ]);

  console.log(`[KICK] bufs → admin: ${adminBuf ? adminBuf.length + "B" : "null"} | target: ${targetBuf ? targetBuf.length + "B" : "null"}`);

  if (targetBuf) {
    const img = await loadImage(targetBuf);
    drawCircularAvatar(ctx, img, 255, 58, 32);
  }
  if (adminBuf) {
    const img = await loadImage(adminBuf);
    drawCircularAvatar(ctx, img, 415, 58, 36);
  }

  fs.writeFileSync(TMP_OUT, canvas.toBuffer("image/jpeg", { quality: 0.92 }));
  return TMP_OUT;
}

module.exports = {
  config: {
    name: "kick",
    aliases: ["طرد"],
    version: "2.0",
    author: "NERO",
    role: 1,
    shortDescription: "طرد عضو من المجموعة",
    longDescription: "الادمن يرد على رسالة عضو ويكتب /kick باش يطرده مع صورة Tom & Jerry",
    category: "moderation",
    guide: "{p}kick (رد على رسالة العضو)",
  },

  onStart: async function ({ api, event, usersData, role }) {
    const { threadID, messageID, senderID } = event;

    if (!event.isGroup)
      return api.sendMessage("هاد الأمر غير للمجموعات 🚫", threadID, () => {}, messageID);

    if (role < 1)
      return api.sendMessage("راك مادير ادمن باش تدير هادا 🚫", threadID, () => {}, messageID);

    if (!event.messageReply)
      return api.sendMessage("رد على رسالة العضو اللي بغيت تطرده ↩️", threadID, () => {}, messageID);

    const targetID = event.messageReply.senderID;

    if (targetID === senderID)
      return api.sendMessage("ماتقدرش تطرد راسك 😅", threadID, () => {}, messageID);

    if (targetID === api.getCurrentUserID())
      return api.sendMessage("ماتقدرش تطردني انا 😏", threadID, () => {}, messageID);

    let targetName = "العضو";
    let adminName = "الادمن";
    try { targetName = await usersData.get(targetID, "name") || "العضو"; } catch (e) {}
    try { adminName = await usersData.get(senderID, "name") || "الادمن"; } catch (e) {}

    try {
      await api.removeUserFromGroup(targetID, threadID);
    } catch (err) {
      console.error("[KICK] removeUserFromGroup error:", err);
      return api.sendMessage("ماقدرتش نطرده — شك أن البوت ادمن في المجموعة ⚠️", threadID, () => {}, messageID);
    }

    try {
      const imgPath = await buildKickImage(api, senderID, targetID);
      const caption = `خرج تقاااود 🤣🖕\n👮 ${adminName} ← 🐱 ${targetName}`;
      await api.sendMessage(
        { body: caption, attachment: fs.createReadStream(imgPath) },
        threadID, () => {}, messageID
      );
    } catch (imgErr) {
      console.error("[KICK] image error:", imgErr);
      api.sendMessage(`خرج تقاااود 🤣🖕\n— ${targetName}`, threadID, () => {}, messageID);
    }
  },
};
