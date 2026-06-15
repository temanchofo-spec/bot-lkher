const fs = require("fs");
const path = require("path");

const QUEEN_ID = "61589384451124";
const LALLA_REPLIES = [
  "امرك سيدتي حياة 👑✨",
  "امرك لالة حياة 🌹👑",
  "حاضر لالة حياة، أمرك مطاع 👑",
  "على عيني وراسي سيدتي حياة 🌹",
  "تأمر مولاتي حياة 👑✨",
];
const STORE_PATH = path.join(__dirname, "..", "cmds", "tmp", "queen_orders.json");

let state = { silentThreads: [], mutedUsers: {}, chatEnabled: true, blockedUsers: [], gamesEnabled: true };

function load() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) || {};
      state.silentThreads = Array.isArray(data.silentThreads)
        ? data.silentThreads.map(String)
        : [];
      const mu = (data.mutedUsers && typeof data.mutedUsers === "object" && !Array.isArray(data.mutedUsers))
        ? data.mutedUsers
        : {};
      state.mutedUsers = {};
      for (const [tid, list] of Object.entries(mu)) {
        if (Array.isArray(list)) state.mutedUsers[String(tid)] = list.map(String);
      }
      state.chatEnabled = data.chatEnabled !== false;
      state.gamesEnabled = data.gamesEnabled !== false;
      state.blockedUsers = Array.isArray(data.blockedUsers)
        ? data.blockedUsers.map(String)
        : [];
    }
  } catch (e) {
    console.error("[QUEEN] load error:", e?.message || e);
    state = { silentThreads: [], mutedUsers: {}, chatEnabled: true };
  }
}

function save() {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error("[QUEEN] save error:", e?.message || e);
  }
}

load();

function isQueen(userID) {
  return String(userID) === QUEEN_ID;
}

function isLalla(userID) {
  return isQueen(userID);
}

function getLallaReply() {
  return LALLA_REPLIES[Math.floor(Math.random() * LALLA_REPLIES.length)];
}

function isThreadSilent(threadID) {
  load();
  return state.silentThreads.includes(String(threadID));
}

function isUserMuted(threadID, userID) {
  load();
  const list = state.mutedUsers[String(threadID)] || [];
  return list.includes(String(userID));
}

function isChatEnabled() {
  load();
  return state.chatEnabled !== false;
}

function setChatEnabled(enabled) {
  state.chatEnabled = !!enabled;
  save();
}

function isGamesEnabled() {
  load();
  return state.gamesEnabled !== false;
}

function setGamesEnabled(enabled) {
  state.gamesEnabled = !!enabled;
  save();
}

function isAdminBot(userID) {
  const u = String(userID);
  if (u === QUEEN_ID) return true;
  const adminBot = global.NeroBot?.config?.adminBot || [];
  return adminBot.map(String).includes(u);
}

function isBlockedUser(userID) {
  const u = String(userID);
  if (isAdminBot(u)) return false;
  load();
  return state.blockedUsers.includes(u);
}

function blockUser(userID) {
  const u = String(userID);
  if (isAdminBot(u)) return false;
  if (!state.blockedUsers.includes(u)) state.blockedUsers.push(u);
  save();
  return true;
}

function unblockUser(userID) {
  const u = String(userID);
  state.blockedUsers = state.blockedUsers.filter(x => x !== u);
  save();
}

function setThreadSilent(threadID, silent) {
  const t = String(threadID);
  if (silent && !state.silentThreads.includes(t)) state.silentThreads.push(t);
  if (!silent) state.silentThreads = state.silentThreads.filter(x => x !== t);
  save();
}

function muteUser(threadID, userID) {
  if (isQueen(userID)) return false;
  const t = String(threadID), u = String(userID);
  state.mutedUsers[t] = state.mutedUsers[t] || [];
  if (!state.mutedUsers[t].includes(u)) state.mutedUsers[t].push(u);
  save();
  return true;
}

function unmuteUser(threadID, userID) {
  const t = String(threadID), u = String(userID);
  if (state.mutedUsers[t]) {
    state.mutedUsers[t] = state.mutedUsers[t].filter(x => x !== u);
  }
  save();
}

const SILENCE_PATTERNS = /(سكت|اسكت|سكتو|ما ت?هدرش|ما ت?ردش على حد|ما تجاوبش حد|بلا هدرة|بلا كلام)/i;
const UNSILENCE_PATTERNS = /(تكلم|هدر|رجع ت?هدر|عاود الكلام|رد عليهم|تكلمو|كلم الناس)/i;
const MUTE_USER_PATTERNS = /(ما ت?ردش|متردش|سكتو|ما تجاوبوش|بلاو|بلا منو|تجاهلو|ما تكلموش)/i;
const UNMUTE_USER_PATTERNS = /(رد عليه|حلو|سامحو|عفو عليه|كلمو|جاوبو)/i;

// Word boundaries that work with Arabic (JS \b is ASCII-only)
const WB = "(?<![\\u0600-\\u06FFa-zA-Z])";
const WE = "(?![\\u0600-\\u06FFa-zA-Z])";

// Bot must be addressed for ambiguous commands to count as orders
const BOT_ADDRESS = /(نيرو|nero|niro|البوت)/i;

// Strong, unambiguous kick triggers
const KICK_STRONG = new RegExp(
  WB + "(?:اطرد(?:و|ي|يه|ها|هم)?|طرد(?:و|ي|يه|ها|هم)|kick)" + WE
    + "|طرد هاد|طرد ها?ذ|طرد فلان|بان من ال?مجموعة|بان من ال?قروب|بان من ال?كروب",
  "i"
);
// Weak kick verbs — only count when paired with kick context OR bot address
const KICK_WEAK = new RegExp(WB + "(?:خرجو?|حيدو?|بعدو?|دفعو?|روحو?|سيرو?)" + WE, "i");
const KICK_CONTEXT = /(من ال?مجموعة|من ال?قروب|من ال?كروب|من ال?جروب|من هنا|برا|بعيد)/i;

const ADD_STRONG = new RegExp(
  WB + "(?:رجعو?|عاود زيدو?|عاود دخلو?)" + WE
    + "|ضيف هاد|ضيفو هاد|ادخلو هاد",
  "i"
);
const ADD_CONTEXT = /(للمجموعة|للقروب|للكروب|للجروب|للجماعة)/i;
const ADD_WEAK = new RegExp(WB + "(?:زيدو?|دخلو?|ضيفو?|ادخلو?|رجعو?|عاودو?)" + WE, "i");

function isKickIntent(body) {
  if (KICK_STRONG.test(body)) return true;
  if (KICK_WEAK.test(body) && (KICK_CONTEXT.test(body) || BOT_ADDRESS.test(body))) return true;
  return false;
}

function isAddIntent(body) {
  if (ADD_STRONG.test(body)) return true;
  if (ADD_WEAK.test(body) && (ADD_CONTEXT.test(body) || BOT_ADDRESS.test(body))) return true;
  return false;
}

function parseQueenOrder(event, botID) {
  if (!isQueen(event.senderID)) return null;
  const body = (event.body || "").toLowerCase().trim();
  if (!body) return null;
  const threadID = event.threadID;
  const botIDStr = botID ? String(botID) : null;

  let replyTo = event.messageReply?.senderID ? String(event.messageReply.senderID) : null;
  if (replyTo === QUEEN_ID) replyTo = null;
  if (botIDStr && replyTo === botIDStr) replyTo = null;

  const mentionIDs = event.mentions
    ? Object.keys(event.mentions).filter(id => {
        const s = String(id);
        return s !== QUEEN_ID && s !== botIDStr;
      })
    : [];
  const targetUser = replyTo || mentionIDs[0] || null;

  // Kick takes priority over mute when both target + clear kick intent present
  if (targetUser && isKickIntent(body)) {
    return {
      type: "kick_user",
      target: targetUser,
      replyText: "حاضر مولاتي 👑 غادي نطردو دابا 🚪",
      failText: "⚠️ سامحيني مولاتي، البوت خاصو يكون ادمن باش يطرد 🌹",
    };
  }

  // Re-add user to group (only meaningful as a reply)
  if (targetUser && isAddIntent(body) && !MUTE_USER_PATTERNS.test(body)) {
    return {
      type: "add_user",
      target: targetUser,
      replyText: "حاضر مولاتي 👑 رجعتو للمجموعة 🌹",
      failText: "⚠️ سامحيني مولاتي، ما قدرتش نزيدو 🌹",
    };
  }

  if (targetUser && MUTE_USER_PATTERNS.test(body)) {
    return {
      type: "mute_user",
      target: targetUser,
      replyText: "حاضر مولاتي 👑 ما غادي نرد عليه عاد 🌹",
    };
  }

  if (targetUser && UNMUTE_USER_PATTERNS.test(body)) {
    if (isUserMuted(threadID, targetUser)) {
      return {
        type: "unmute_user",
        target: targetUser,
        replyText: "كما تشائين ملكتي ✨ رجعت نرد عليه 🌷",
      };
    }
    return null;
  }

  if (!targetUser && SILENCE_PATTERNS.test(body)) {
    return {
      type: "silence_thread",
      replyText: "حاضر مولاتي 👑 غادي نسكت ونسمعك أنت بوحدك 🌹",
    };
  }

  if (!targetUser && UNSILENCE_PATTERNS.test(body)) {
    if (isThreadSilent(threadID)) {
      return {
        type: "unsilence_thread",
        replyText: "كما تشائين سيدتي ✨ رجعت نهدر مع الجميع 🌷",
      };
    }
    return null;
  }

  return null;
}

function isBotReply(event, botID) {
  const replySender = event?.messageReply?.senderID ? String(event.messageReply.senderID) : null;
  const bot = botID ? String(botID) : null;
  return !!replySender && !!bot && replySender === bot;
}

async function executeQueenOrder(api, event, order) {
  const { threadID, messageID } = event;
  try {
    switch (order.type) {
      case "silence_thread":
        setThreadSilent(threadID, true);
        break;
      case "unsilence_thread":
        setThreadSilent(threadID, false);
        break;
      case "mute_user":
        if (!muteUser(threadID, order.target)) return false;
        break;
      case "unmute_user":
        unmuteUser(threadID, order.target);
        break;
      case "kick_user":
        try {
          await api.removeUserFromGroup(order.target, threadID);
          // also clean any mute entry
          unmuteUser(threadID, order.target);
        } catch (err) {
          console.error("[QUEEN] kick failed:", err?.message || err);
          api.setMessageReaction("⚠️", messageID, () => {}, true);
          return api.sendMessage(order.failText, threadID, undefined, messageID);
        }
        break;
      case "add_user":
        try {
          await api.addUserToGroup(order.target, threadID);
        } catch (err) {
          console.error("[QUEEN] add failed:", err?.message || err);
          api.setMessageReaction("⚠️", messageID, () => {}, true);
          return api.sendMessage(order.failText, threadID, undefined, messageID);
        }
        break;
      default:
        return false;
    }
    api.setMessageReaction("👑", messageID, () => {}, true);
    return api.sendMessage(order.replyText, threadID, undefined, messageID);
  } catch (e) {
    console.error("[QUEEN] execute error:", e?.message || e);
    return false;
  }
}

module.exports = {
  QUEEN_ID,
  isQueen,
  isLalla,
  getLallaReply,
  isThreadSilent,
  isUserMuted,
  isChatEnabled,
  setChatEnabled,
  isGamesEnabled,
  setGamesEnabled,
  setThreadSilent,
  isBlockedUser,
  blockUser,
  unblockUser,
  parseQueenOrder,
  isBotReply,
  executeQueenOrder,
};
