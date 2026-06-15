const { isGamesEnabled, QUEEN_ID } = require("../utils/queenOrders");

function isPrivilegedSender(uid) {
  const u = String(uid);
  if (u === QUEEN_ID) return true;
  return (global.NeroBot?.config?.adminBot || []).map(String).includes(u);
}

const activeGames = new Map();

const MAX_TRIES = 7;
const REWARD = 100;

const ENCOURAGEMENTS = [
  "جرب مرة أخرى 💪",
  "مزال عندك فرص 😏",
  "فكر مزيان 🤔",
  "قريب ولا بعيد؟ 😄",
  "دير محاولة أخرى!",
];

function randEncourage() {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}

function triesBar(used, max) {
  const filled = "🟥".repeat(used);
  const empty = "⬜".repeat(max - used);
  return filled + empty;
}

function registerReply(botMsgID, threadID, senderID) {
  global.NeroBot.onReply.set(botMsgID, {
    commandName: "خمن",
    author: senderID,
    messageID: botMsgID,
    threadID,
  });
}

module.exports = {
  config: {
    name: "خمن",
    aliases: ["guess", "khamen"],
    version: "1.0",
    author: "Nero",
    role: 0,
    shortDescription: "لعبة تخمين الرقم",
    longDescription: "البوت يختار رقم بين 1 و100، خمّنه في 7 محاولات وربح نجوم ⭐",
    category: "game",
    guide: "{p}خمن — يبدأ اللعبة\n{p}خمن وقف — يوقف اللعبة الحالية",
    countDown: 3,
  },

  onStart: async function ({ api, event, args, usersData }) {
    const { threadID, messageID, senderID } = event;

    if (!isPrivilegedSender(senderID) && !isGamesEnabled()) return;

    const sub = (args[0] || "").trim();

    if (sub === "وقف") {
      if (activeGames.has(threadID)) {
        const g = activeGames.get(threadID);
        activeGames.delete(threadID);
        global.NeroBot.onReply.delete(g.botMsgID);
        return api.sendMessage(
          `🛑 وقّفنا اللعبة — الرقم كان هو **${g.number}** 😄`,
          threadID, () => {}, messageID
        );
      }
      return api.sendMessage("ما كاينة حتى لعبة خدامة دبا 😅", threadID, () => {}, messageID);
    }

    if (sub === "reset") {
      if (!isPrivilegedSender(senderID)) return;
      if (activeGames.has(threadID)) {
        const g = activeGames.get(threadID);
        activeGames.delete(threadID);
        global.NeroBot.onReply.delete(g.botMsgID);
        return api.sendMessage("🔄 اللعبة تريّضات — أي واحد يقدر يبدأ من جديد!", threadID, () => {}, messageID);
      }
      return api.sendMessage("ما كاينة حتى لعبة دايرة باش تريّض 😅", threadID, () => {}, messageID);
    }

    if (activeGames.has(threadID)) {
      return api.sendMessage(
        "⏳ كاينة لعبة دايرة — رد على رسالتي ديال اللعبة وخمّن!",
        threadID, () => {}, messageID
      );
    }

    const number = Math.floor(Math.random() * 100) + 1;
    const startMsg = `🎯 دير بالك — خترت رقم بين 1 و 100\n\n` +
      `عندك ${MAX_TRIES} محاولات باش تخمّنه!\n` +
      `${triesBar(0, MAX_TRIES)}\n\n` +
      `⭐ إلا خمّنتي صحيح — تربح ${REWARD} نجمة!\n\n` +
      `رد على هاد الرسالة برقمك 👇`;

    api.sendMessage(startMsg, threadID, (err, info) => {
      if (err || !info?.messageID) return;
      const botMsgID = info.messageID;
      activeGames.set(threadID, { number, tries: 0, botMsgID, starterID: senderID });
      registerReply(botMsgID, threadID, senderID);
    }, messageID);
  },

  onReply: async function ({ api, event, usersData }) {
    const { threadID, senderID, body, messageID } = event;

    const game = activeGames.get(threadID);
    if (!game) return;

    const guess = parseInt((body || "").trim(), 10);

    if (isNaN(guess) || guess < 1 || guess > 100) {
      return api.sendMessage(
        "⚠️ عطيني رقم صحيح بين 1 و 100 😅",
        threadID, (err, info) => {
          if (!err && info?.messageID) registerReply(info.messageID, threadID, senderID);
        }, messageID
      );
    }

    game.tries++;
    const triesLeft = MAX_TRIES - game.tries;
    global.NeroBot.onReply.delete(game.botMsgID);

    if (guess === game.number) {
      activeGames.delete(threadID);

      let winnerName = "صاحبنا";
      try { winnerName = await usersData.get(senderID, "name") || "صاحبنا"; } catch (e) {}
      try { await usersData.addMoney(senderID, REWARD); } catch (e) {}
      let total = 0;
      try { total = await usersData.get(senderID, "money") || REWARD; } catch (e) {}

      api.setMessageReaction("🎉", messageID, () => {}, true);
      return api.sendMessage(
        `🎉 مبروك ${winnerName}!\n\n` +
        `✅ الرقم الصحيح: **${game.number}**\n` +
        `🎯 خمّنتي في ${game.tries} محاول${game.tries === 1 ? "ة" : "ات"}\n` +
        `⭐ ربحتي ${REWARD} نجمة!\n` +
        `💫 مجموع نجومك: ${total}`,
        threadID, () => {}, messageID
      );
    }

    if (game.tries >= MAX_TRIES) {
      activeGames.delete(threadID);
      api.setMessageReaction("😵", messageID, () => {}, true);
      return api.sendMessage(
        `😵 خلصات المحاولات!\n\n` +
        `الرقم كان هو **${game.number}** — تقاود 😄\n` +
        `${triesBar(MAX_TRIES, MAX_TRIES)}\n\n` +
        `جرب مرة أخرى مع /خمن`,
        threadID, () => {}, messageID
      );
    }

    const hint = guess < game.number
      ? `⬆️ الرقم **أكبر** من ${guess}`
      : `⬇️ الرقم **أصغر** من ${guess}`;

    const response = `${hint}\n\n` +
      `${triesBar(game.tries, MAX_TRIES)} (${triesLeft} باقي${triesLeft === 1 ? "ة" : ""})\n\n` +
      `${randEncourage()} رد علي برقمك 👇`;

    api.sendMessage(response, threadID, (err, info) => {
      if (!err && info?.messageID) {
        game.botMsgID = info.messageID;
        registerReply(info.messageID, threadID, senderID);
      }
    }, messageID);
  },
};
