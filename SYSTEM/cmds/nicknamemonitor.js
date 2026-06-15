module.exports = {
  config: {
    name: "nicknamemonitor",
    version: "1.0",
    author: "NERO",
    role: 0,
    category: "moderation",
  },

  onStart: async function () {
    // لا شيء هنا - هذا يعمل فقط كـ onAnyEvent
  },

  onAnyEvent: async function ({ api, event }) {
    const { threadID, author, type } = event;
    
    if (type !== "change_thread_nickname") {
      return;
    }

    const getNicknameLock = global.NeroBot?.getNicknameLock;
    if (!getNicknameLock) return;

    const lock = getNicknameLock(threadID);
    if (!lock) return;

    const { nick, members } = lock;
    const userID = String(author);

    if (!members.has(userID)) {
      return;
    }

    setTimeout(async () => {
      try {
        await api.changeNickname(nick, threadID, userID);
        console.log(`[NICKNAMEMONITOR] Restored nickname for ${userID} in ${threadID}`);
      } catch (err) {
        console.error(`[NICKNAMEMONITOR] Error restoring nickname:`, err.message);
      }
    }, 1000);
  },
};
