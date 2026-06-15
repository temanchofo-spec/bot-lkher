const { findUid } = global.utils;
const regExCheckURL = /^(http|https):\/\/[^ "]+$/;

module.exports = {
	config: {
		name: "آيدي",
		version: "1.3",
		author: "NTKhang",
		countDown: 5,
		role: 0,
		description: {
	
			ar: "قم برؤية المعرف الخاص بمستخدم على فيسبوك"
		},
		category: "معلومات",
		guide: {
			
			ar: "   {pn}: قم بعرض الآيدي الخاص بك"
				+ "\n   {pn} @منشن: قم بعرض آيدي الخاص بالناس"
				+ "\n   {pn} <رابط الملف الشخصي>: قم بعرض الآيدي الحاص بذالك الشخص"
				+ "\n   قم بالرد على رسالة شخص ما لعرض الآيدي الخاص به"
		}
	},

	langs: {
		
		ar: {
			syntaxError: " ⚠️ | قم بالرد على رسالة شخص ما او قم بعمل منشن له"
		}
	},

	onStart: async function ({ message, event, args, getLang }) {
		if (event.messageReply)
			return message.reply(event.messageReply.senderID);
		if (!args[0])
			return message.reply(event.senderID);
		if (args[0].match(regExCheckURL)) {
			let msg = '';
			for (const link of args) {
				try {
					const uid = await findUid(link);
					msg += `${link} => ${uid}\n`;
				}
				catch (e) {
					msg += `${link} (ERROR) => ${e.message}\n`;
				}
			}
			message.reply(msg);
			return;
		}

		let msg = "";
		const { mentions } = event;
		for (const id in mentions)
			msg += `${mentions[id].replace("@", "")}: ${id}\n`;
		message.reply(msg || getLang("syntaxError"));
	}
};