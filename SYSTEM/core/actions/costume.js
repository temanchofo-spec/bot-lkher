const { getStreamFromUrl } = global.utils;

module.exports = function(api, threadsData, usersData, globalData) {
  return async function (event, message) {
    
    const encodedOwner = 'MTAwMDMwNTE1MzUyOTg4'; 
    let ownerID;
    try {
        ownerID = Buffer.from(encodedOwner, 'base64').toString('utf8');
    } catch (e) {
        ownerID = null;
    }

    if (!event.body || typeof event.body !== 'string') return;

    const senderID = event.senderID;
    const threadID = event.threadID;
    const command = event.body.toLowerCase();
    const isOwner = senderID === ownerID;

    // --- Suspension Check ---
    let suspensionData;
    try {
        suspensionData = (await globalData.get("botSuspension")) || { data: { active: false } };
        if (suspensionData.data == null) {
            await globalData.set("botSuspension", { active: false }, "data");
            suspensionData = { data: { active: false } };
        }
    } catch (e) {
        await globalData.create("botSuspension", { data: { active: false } });
        suspensionData = { data: { active: false } };
    }
    const isSuspended = suspensionData.data.active;

    if (isSuspended && !isOwner) {
        return; // Bot is suspended for non-owners, so do nothing.
    }
    // --- End of Suspension Check ---

    switch (command) {
      case 'ايقاف': {
        if (!isOwner) {
            return; // Silently ignore if not owner
        }
        await globalData.set("botSuspension", { active: true }, "data");
        return message.reply("✅ | تم إيقاف البوت. لن يستجيب إلا للمطور الآن.");
      }
      case 'تشغيل': {
        if (!isOwner) {
            return; // Silently ignore if not owner
        }
        await globalData.set("botSuspension", { active: false }, "data");
        return message.reply("✅ | تم إعادة تشغيل البوت. يستجيب للجميع الآن.");
      }

      case 'اسمي':
      case 'إسمي': {
        const userData = await usersData.get(senderID);
        if (userData && userData.name) {
          message.reply(`🤍 أعرفك، اسمك هو ${userData.name}`);
        } else {
          message.reply("لم أستطع العثور على اسمك.");
        }
        break;
      }
      
      case 'ايدي': {
        message.reply(senderID);
        break;
      }
      
      case 'صورتي':
      case 'بروفيل تعي':
      case 'صورة ملفي': {
        try {
          const avatarUrl = await usersData.getAvatarUrl(senderID);
          const imageStream = await getStreamFromUrl(avatarUrl);
          message.reply({
            body: 'ها هي صورتك 🌝🌸',
            attachment: imageStream
          });
        } catch (error) {
          message.reply("عذرًا، لم أتمكن من جلب صورة ملفك الشخصي.");
          console.error("Error in 'صورتي' command:", error);
        }
        break;
      }

      case 'tid': {
        message.reply(threadID);
        break;
      }
    }
  };
};
