module.exports = {
  config: {
    name: "سبام",
    aliases: ["spam"],
    version: "1.0",
    author: "NERO",
    role: 0,
    shortDescription: "إرسال جملة بشكل متكرر",
    longDescription: "اكتب /سبام الجملة لإرسال الجملة كل ثانية، و /حبس سبام لإيقافها",
    category: "fun",
    guide: "{p}سبام <الجملة> | {p}حبس سبام",
  },

  spamIntervals: new Map(),

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const cmd = (args[0] || "").toLowerCase();

    // إيقاف السبام
    if (cmd === "حبس" || cmd === "stop" || cmd === "أوقف") {
      if (this.spamIntervals.has(threadID)) {
        clearInterval(this.spamIntervals.get(threadID));
        this.spamIntervals.delete(threadID);
        return api.sendMessage(
          "✅ تم إيقاف السبام",
          threadID,
          () => {},
          messageID
        );
      } else {
        return api.sendMessage(
          "❌ لا يوجد سبام قيد التشغيل",
          threadID,
          () => {},
          messageID
        );
      }
    }

    // بدء السبام
    const message = args.join(" ");
    if (!message) {
      return api.sendMessage(
        "❌ اكتب الجملة التي تريد إرسالها\nمثال: /سبام مرحبا بالجميع",
        threadID,
        () => {},
        messageID
      );
    }

    // إيقاف السبام السابق إن وجد
    if (this.spamIntervals.has(threadID)) {
      clearInterval(this.spamIntervals.get(threadID));
    }

    // بدء السبام الجديد
    const intervalId = setInterval(() => {
      api.sendMessage(message, threadID, () => {});
    }, 1000);

    this.spamIntervals.set(threadID, intervalId);

    api.sendMessage(
      `✅ بدأ السبام!\n📝 الجملة: ${message}\n⏹️ لإيقافه اكتب: /حبس سبام`,
      threadID,
      () => {},
      messageID
    );
  },
};
