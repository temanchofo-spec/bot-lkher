module.exports = {
  config: {
    name: "rejoin",
    version: "1.0",
    author: "NERO",
    category: "events",
  },

  onStart: async ({ api, event, usersData }) => {
    if (event.logMessageType !== "log:unsubscribe") return;

    const { threadID, logMessageData, author } = event;
    const leftID = logMessageData?.leftParticipantFbId;

    if (!leftID) return;
    if (leftID === api.getCurrentUserID()) return;

    const leftVoluntarily = leftID === author;
    if (!leftVoluntarily) return;

    return async function () {
      let userName = "خويا";
      try {
        userName = await usersData.getName(leftID) || "خويا";
      } catch (e) {}

      try {
        await new Promise(r => setTimeout(r, 1500));
        await api.addUserToGroup(leftID, threadID);
        await api.sendMessage(
          `${userName} رجع بحالك زلالتك وئام مابغاتكش تخرج👌 👸 `,
          threadID
        );
      } catch (err) {
        console.error("[REJOIN] Failed to re-add user:", err?.message || err);
      }
    };
  },
};
