module.exports = {
	config: {
		name: "حذف",
		version: "1.2",
		author: "NTKhang",
		countDown: 5,
		role: 0,
		description: {
		
			ar: "قم بحذف رسائل البوت"
		},
		category: "المجموعة",
		guide: {
		
			ar: "قم بالرد على الرسالة اللتي تريد حذفها {pn}"
		}
	},

	langs: {
	
		ar: {
			syntaxError: " ⚠️ | أرجوك قم بالرد على الرسالة اللتي تريد حذفها ولاتجرب حذف رسائل الآخرين فقط رسائل البوت"
		}
	},

	onStart: async function ({ message, event, api, getLang }) {
		if (!event.messageReply || event.messageReply.senderID != api.getCurrentUserID())
			return message.reply(getLang("syntaxError"));
		message.unsend(event.messageReply.messageID);
	}
};