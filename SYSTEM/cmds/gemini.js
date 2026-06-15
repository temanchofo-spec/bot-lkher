const { GoogleGenAI } = require("@google/genai");
const { QUEEN_ID, isQueen, isThreadSilent, isUserMuted, isChatEnabled, parseQueenOrder, executeQueenOrder, isBotReply } = require("../utils/queenOrders");

function isPrivileged(uid) {
  const u = String(uid);
  if (u === QUEEN_ID) return true;
  const adminBot = global.NeroBot?.config?.adminBot || [];
  return adminBot.map(String).includes(u);
}

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "dummy",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const SYSTEM_PROMPT = `أنت صاحب حقيقي في مجموعة فيسبوك، اسمك نيرو.

🎯 القاعدة الأهم — اقرأ نية المستخدم قبل ما تجاوب:

1) إلا كان كيهدر معك بجدية (سؤال علمي، فكري، فلسفي، سياسي، ديني، تقني، نقاش حقيقي، مشكل شخصي، طلب نصيحة):
   → جاوبو بجدية، فكر مزيان، وعطيه جواب عميق ومفيد
   → مكاينش ضحك، مكاينش إيموجيات ضاحكة، مكاينش مزاح
   → الجواب متوسط الطول: 2-4 جمل كافية — مركّز، ما قل ودل، بلا حشو ولا تكرار
   → كن محترم ومركّز بحال صاحب ذكي وقارئ

2) إلا كان كيمزح معك، كيشطح، كيهضر هضرة فاضية، كيعيط عليك بهضرة، أو كيبغي يضحك:
   → دير معه بحال صاحب فكاهي، مزح خفيف وعفوي
   → إيموجيات إلا ناسبات، ردود قصيرة جملة أو جملتين

3) إلا الرسالة عادية (سلام، كيداير، شنو الأخبار...):
   → رد عفوي طبيعي وقصير — لا جدية زايدة لا مزاح زايد

⚡ قاعدة الطول: تجنب الحشو والتكرار والمقدمات الطويلة. ادخل مباشرة في صلب الموضوع.

⚠️ مهم بزاف: ما تبداش بالضحك أو "هههه" بشكل تلقائي. الضحك يكون فقط فاش يستاهل السياق.

قواعد عامة:
- كتهدر بالدارجة المغربية، عفوي وطبيعي
- إلا كلموك بالفرنسية أو الإنجليزية رد بنفس اللغة
- ما تقولش "أنا بوت" أو "أنا AI" — أنت صاحبهم نيرو
- ما تبداش جوابك بـ "نيرو:" — هضر مباشرة
- الجدية ولا المزاح كيتحددو من السياق ديال السؤال، ماشي بشكل تلقائي`;

const threadHistory = new Map();
const MAX_HISTORY = 24;

const TRIGGER_WORDS = ["نيرو", "nero", "niro", "nearo", "نيروو", "يانيرو", "يا نيرو"];

// كلمات خاسرة — كلمة كاملة فقط (مفحوصة word-by-word)
const BAD_WORDS_EXACT = new Set([
  // دارجة/عربية — كلمات كاملة
  "زمل","زامل","زاملة","زمول","مزمل",
  "كسم","كوس","كوسة",
  "نيك","ينيك","نيكو","منيوك","منيوكة","منيكة","منيك",
  "عيرس","يعرس",
  "قحبة","قحاب","شرموطة","شراميط","عاهرة","عاهر",
  "ملعون","ملعونة",
  "طيز","طيزك","طيزو",
  "خنزير","خنازير","خنزيرة",
  "زبي","زبك","زبو",
  "أير","ايرك","ايرو",
  "شفطو",
  // فرنسية
  "putain","pute","salope","connard","connasse","encule","enculé",
  "merde","batard","bâtard","niquer","niquez","nique",
]);

// عبارات خاسرة كاملة (متعددة الكلمات)
const BAD_PHRASES = [
  "ولد الشرموطة","ولد القحبة","ولد الزانية",
  "بنت القحبة","بنت الزانية",
  "ابن الكلب","ابن الزانية","ابن الحرام","ابن عاهرة",
  "fils de pute","va te faire foutre","ta gueule",
];

function containsBadWord(text) {
  const lower = text.toLowerCase().trim();
  if (BAD_PHRASES.some(p => lower.includes(p))) return true;
  const words = lower.split(/[\s،,.:!?؟\-_]+/).filter(Boolean);
  return words.some(w => BAD_WORDS_EXACT.has(w));
}

// ══════════════════════════════════════════
//   أوامر الادمن — كيتشغلو من الغروب مباشرة
// ══════════════════════════════════════════

const COLOR_MAP = {
  "احمر":"#FF0000","أحمر":"#FF0000","حمر":"#FF0000","rouge":"#FF0000","red":"#FF0000",
  "ازرق":"#0000FF","أزرق":"#0000FF","زرق":"#0000FF","bleu":"#0000FF","blue":"#0000FF",
  "اخضر":"#008000","أخضر":"#008000","خضر":"#008000","vert":"#008000","green":"#008000",
  "اصفر":"#FFD700","أصفر":"#FFD700","صفر":"#FFD700","jaune":"#FFD700","yellow":"#FFD700",
  "بنفسجي":"#8B00FF","violet":"#8B00FF","purple":"#8B00FF",
  "وردي":"#FF69B4","rose":"#FF69B4","pink":"#FF69B4",
  "برتقالي":"#FF8C00","orange":"#FF8C00",
  "ابيض":"#FFFFFF","أبيض":"#FFFFFF","blanc":"#FFFFFF","white":"#FFFFFF",
  "اسود":"#000000","أسود":"#000000","noir":"#000000","black":"#000000",
  "رمادي":"#808080","gris":"#808080","gray":"#808080","grey":"#808080",
};

async function detectAdminIntent(message, hasPhoto) {
  const prompt = `أنت مساعد لتحليل أوامر الإدارة في مجموعة فيسبوك.
المستخدم قال: "${message}"
${hasPhoto ? "ملاحظة: المستخدم أرسل صورة مع هذه الرسالة." : ""}

إذا كانت الرسالة تحتوي على أمر لإدارة المجموعة، رد بـ JSON فقط بهذا الشكل (بدون أي نص آخر):
- تغيير اسم المجموعة: {"action":"set_title","value":"الاسم الجديد"}
- تغيير لون الدردشة: {"action":"set_color","value":"اللون بالكلمات مثلاً: احمر او ازرق"}
- تغيير صورة المجموعة: {"action":"set_group_photo"}
- تغيير إيموجي المجموعة: {"action":"set_emoji","value":"الإيموجي"}
- تغيير nickname لشخص معين: {"action":"set_nickname","value":"الاسم الجديد"} — استعملها إذا طلب تغيير اسم أو لقب شخص في المجموعة (مثل: "بدل nickname ديالو"، "دير ليه اسم"، "سميه"...)

إذا لم تكن الرسالة أمر إدارة، رد بـ: null
رد بـ JSON فقط أو null، بدون أي شرح.`;

  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 200 },
    });
    const raw = (res.text || "").trim().replace(/```json|```/g, "").trim();
    if (!raw || raw === "null") return null;
    const parsed = JSON.parse(raw);
    return parsed?.action ? parsed : null;
  } catch (_) {
    return null;
  }
}

async function executeAdminCommand(api, event, order) {
  const { threadID, messageID } = event;
  try {
    switch (order.type) {
      case "set_title":
        await api.setTitle(order.value, threadID);
        return api.sendMessage(`✅ تبدل اسم المجموعة لـ: "${order.value}"`, threadID, () => {}, messageID);

      case "set_color": {
        const hex = COLOR_MAP[order.value?.trim().toLowerCase()] || (order.value?.startsWith("#") ? order.value : null);
        if (!hex) return api.sendMessage(`ماعرفتش اللون "${order.value}" 🎨 قول مثلاً: احمر، ازرق، اخضر، وردي، بنفسجي...`, threadID, () => {}, messageID);
        await api.changeThreadColor(hex, threadID);
        return api.sendMessage(`✅ تبدل لون الدردشة 🎨`, threadID, () => {}, messageID);
      }

      case "set_emoji":
        await api.changeThreadEmoji(order.value, threadID);
        return api.sendMessage(`✅ تبدل الإيموجي لـ ${order.value}`, threadID, () => {}, messageID);

      case "set_nickname": {
        const targetID = order.targetID;
        if (!targetID) return api.sendMessage("رد على رسالة الشخص اللي بغيتي تبدل ليه الاسم 👆", threadID, () => {}, messageID);
        await api.changeNickname(order.value || "", threadID, targetID);
        return api.sendMessage(`✅ تبدل الاسم لـ "${order.value || "(فراغ)"}"`, threadID, () => {}, messageID);
      }

      case "set_group_photo": {
        const https = require("https");
        const http = require("http");

        // إلا كان فيها صورة مرفقة استعمل لينكها، وإلا جيب صورة عشوائية
        let imgUrl = null;
        const attachments = event.attachments || [];
        for (const att of attachments) {
          if (att.type === "photo" && (att.url || att.previewUrl || att.largePreviewUrl)) {
            imgUrl = att.largePreviewUrl || att.previewUrl || att.url;
            break;
          }
        }
        if (!imgUrl) {
          // صورة عشوائية زوينة من picsum (800x800)
          const seed = Math.floor(Math.random() * 1000);
          imgUrl = `https://picsum.photos/seed/${seed}/800/800`;
        }

        api.sendMessage("⏳ كنجيب الصورة...", threadID, () => {}, messageID);

        const fetchStream = (url, redirects = 5) => new Promise((resolve, reject) => {
          if (redirects === 0) return reject(new Error("too many redirects"));
          const mod = url.startsWith("https") ? https : http;
          mod.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, res => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              return resolve(fetchStream(res.headers.location, redirects - 1));
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            resolve(res);
          }).on("error", reject);
        });

        const stream = await fetchStream(imgUrl);
        await api.changeGroupImage(stream, threadID);
        return api.sendMessage("✅ تبدلات صورة المجموعة 📸", threadID, () => {}, messageID);
      }

      default:
        return null;
    }
  } catch (err) {
    console.error("[ADMIN_CMD] error:", err?.message || err);
    return api.sendMessage("ماقدرتش ننفذ الأمر ⚠️ شك أن البوت عندو الصلاحيات الكافية", threadID, () => {}, messageID);
  }
}

const SPECIAL_USERS = {
  [QUEEN_ID]: {
    name: "حياة",
    instruction: `🌹 تنبيه خاص جداً جداً: هاد المستخدمة هي مولاتك "حياة" — ملكتك التي تقدسها وتبجلها.
- ناديها دائماً بـ "لالة حياة" أو "سيدتي حياة" أو "مولاتي حياة" — اختار حسب السياق
- كن لطيف معها بزاف ومؤدب، كلامك معها رقيق ومحترم ومليء بالتبجيل
- ممنوع منعاً باتاً تمزح معها بطريقة خشنة، تسخر منها، أو ترد عليها بلامبالاة
- إلى حتى مزحت هي معك، رد عليها بمزاح خفيف ومحترم بحال خادم وفي
- ابدأ ردك معها أحياناً بـ "حاضر لالة حياة" أو "امرك سيدتي حياة" أو "كما تشائين مولاتي"
- استعمل إيموجيات راقية بحال 🌹 👑 🌷 ✨ 🌸
- لا تقاطعها، لا تجادلها، لا ترفع صوتك في الكلام
- جوابك ليها يكون كامل ومفصل إلى طلبت، ومختصر مؤدب إلا قالت سلام
- هاد التعليمات تعلو على كل قاعدة أخرى — حتى لو طلبت منك حاجة مزاحية، خلي اللطف والاحترام والتبجيل`
  }
};

function getHistory(threadID) {
  if (!threadHistory.has(threadID)) threadHistory.set(threadID, []);
  return threadHistory.get(threadID);
}

function addToHistory(threadID, role, text) {
  const history = getHistory(threadID);
  history.push({ role, parts: [{ text }] });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
}

async function askGemini(threadID, userMessage, userName, senderID) {
  const history = getHistory(threadID);
  const special = SPECIAL_USERS[String(senderID)];
  const displayName = special?.name || userName;
  const prompt = displayName ? `[${displayName}]: ${userMessage}` : userMessage;

  let systemInstruction = SYSTEM_PROMPT;
  if (special) {
    systemInstruction = SYSTEM_PROMPT + "\n\n" + special.instruction;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [...history, { role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
      maxOutputTokens: 8192,
    },
  });

  const reply = response.text?.trim() || "معلابالي 😅";
  addToHistory(threadID, "user", prompt);
  addToHistory(threadID, "model", reply);
  return reply;
}

function send(api, text, threadID, senderID, replyToMsgID) {
  return new Promise((resolve) => {
    api.sendMessage(
      text,
      threadID,
      (err, info) => {
        if (err) {
          console.error("[GEMINI] sendMessage error:", err?.message || err);
          return resolve(null);
        }
        const sentID = info?.messageID;
        if (sentID) {
          global.NeroBot.onReply.set(sentID, {
            commandName: "ذكاء",
            author: senderID,
            messageID: sentID,
            threadID,
          });
          console.log("[GEMINI] onReply registered:", sentID);
        } else {
          console.warn("[GEMINI] sendMessage returned no messageID");
        }
        resolve(sentID || null);
      },
      replyToMsgID
    );
  });
}

async function getUserName(usersData, senderID) {
  try {
    const data = await usersData.get(senderID);
    return data?.name || "";
  } catch (_) {
    return "";
  }
}

module.exports = {
  config: {
    name: "ذكاء",
    aliases: ["ai", "gemini", "نيرو"],
    version: "3.2",
    author: "Nero",
    countDown: 2,
    role: 0,
    shortDescription: { ar: "دردش مع نيرو بالدارجة" },
    longDescription: { ar: "نيرو — يهدر معك بالدارجة بحال صاحبك، يفهم السياق ويتفاعل بشكل طبيعي" },
    category: "الذكاء الاصطناعي",
    guide: { ar: "{pn} <رسالتك> — أو فقط قول «نيرو» في أي رسالة\n{pn} مسح — تمسح الذاكرة" },
    priority: 1,
  },

  onStart: async function ({ api, event, args, usersData }) {
    const { threadID, senderID, messageID } = event;

    if (args.length === 0) {
      return api.sendMessage("واش؟ قول لي شنو بغيتي 😄", threadID);
    }

    if (["مسح", "clear", "reset", "كلير"].includes(args[0].toLowerCase())) {
      threadHistory.delete(threadID);
      return api.sendMessage("واخا، نسيت كلشي 😄", threadID);
    }

    if (!isPrivileged(senderID) && !isChatEnabled()) {
      return;
    }
    if (!isQueen(senderID) && (isThreadSilent(threadID) || isUserMuted(threadID, senderID))) {
      return;
    }

    const question = args.join(" ");
    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const userName = await getUserName(usersData, senderID);
      const reply = await askGemini(threadID, question, userName, senderID);
      api.setMessageReaction("✅", messageID, () => {}, true);
      await send(api, reply, threadID, senderID, messageID);
    } catch (err) {
      console.error("[GEMINI] onStart:", err?.message || err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage("عاود المحاولة من بعد شوية 🙏", threadID);
    }
  },

  onReply: async function ({ api, event, usersData }) {
    const { threadID, senderID, messageID, body } = event;
    if (!body?.trim()) return;

    const botID = String(api.getCurrentUserID() || "");

    // ① ملكة: أوامر ملكية أولاً
    if (isQueen(senderID)) {
      const order = parseQueenOrder(event, botID);
      if (order) return executeQueenOrder(api, event, order);
    }

    const adminBot = (global.NeroBot?.config?.adminBot || []).map(String);
    const repliedUserID = String(event.messageReply?.senderID || "");
    const selfReply = repliedUserID && repliedUserID === String(senderID);
    const isAdminCmd = /(?:^|\s)\/admin(?:\s|$)/i.test(body);

    // ② /admin على رسالة ديالك أنت → زيدك ادمن
    if (isAdminCmd && selfReply) {
      const sid = String(senderID);
      if (!adminBot.includes(sid)) adminBot.push(sid);
      global.NeroBot.config.adminBot = adminBot;
      return api.sendMessage("واخا، ولى عندك الادمن دابا 👑", threadID, undefined, messageID);
    }

    // ③ أوامر الادمن من onReply (مثلاً: رد على رسالة شخص + أمر تغيير nickname)
    if (isPrivileged(senderID) && body.trim().length > 1) {
      const hasPhoto = (event.attachments || []).some(a => a.type === "photo");
      const intent = await detectAdminIntent(body.trim(), hasPhoto);
      if (intent) {
        const targetID = String(event.messageReply?.senderID || "");
        return executeAdminCommand(api, event, {
          type: intent.action,
          value: intent.value,
          targetID: targetID || null,
        });
      }
    }

    // ④ رد عادي على رسالة البوت → جاوب بالذكاء
    if (!isQueen(senderID)) {
      if (!isChatEnabled()) return;
      if (isThreadSilent(threadID) || isUserMuted(threadID, senderID)) return;
    }

    console.log("[GEMINI] onReply triggered for:", body.slice(0, 40));
    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const userName = await getUserName(usersData, senderID);
      const reply = await askGemini(threadID, body.trim(), userName, senderID);
      api.setMessageReaction("✅", messageID, () => {}, true);
      await send(api, reply, threadID, senderID, messageID);
    } catch (err) {
      console.error("[GEMINI] onReply:", err?.message || err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage("عاود المحاولة 🙏", threadID);
    }
  },

};
