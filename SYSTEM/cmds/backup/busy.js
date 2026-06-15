if (!global.client.busyList)
	global.client.busyList = {};

module.exports = {
	config: {
		name: "مشغول",
		version: "1.5",
		author: "SIFOANTER ",
		countDown: 5,
		role: 0,
		shortDescription: {
			
			ar: "قم بتشغيل وضع عدم الإزعاج"
		},
		longDescription: {
			
			ar: "قم بتشغيل وضع عدم الإزعاج، وسيقوم الروبوت بإعلامك عندما يتم وضع علامة باسمك"
		},
		category: "المجموعة",
		guide: {
			
			ar: "   {pn} [فارغ | <السبب>]: قم بتشغيل وضع عدم الإزعاج"
				+ "\n   {pn} إيقاف: قم بإيقاف تشغيل وضع عدم الإزعاج"
		}
	},

	langs: {
		
		ar: {
			turnedOff: "✅ | تم إيقاف وضع عدم الإزعاج",
			turnedOn: "✅ | تم تشغيل وضع عدم الإزعاج",
			turnedOnWithReason: "✅ | تم تشغيل وضع عدم الإزعاج لسبب ما: %1",
			turnedOnWithoutReason: "✅ | تم تشغيل وضع عدم الإزعاج",
			alreadyOn: "المستخدم %1 مشغول حاليا",
			alreadyOnWithReason: "المستخدم %1 المستخدم حاليا مشغول للهذا السبب: %2"
		}
	},

	onStart: async function ({ args, message, event, getLang, usersData }) {
		const { senderID } = event;

		if (args[0] == "إيقاف") {
			const { data } = await usersData.get(senderID);
			delete data.busy;
			await usersData.set(senderID, data, "data");
			return message.reply(getLang("turnedOff"));
		}

		const reason = args.join(" ") || "";
		await usersData.set(senderID, reason, "data.busy");
		return message.reply(
			reason ?
				getLang("turnedOnWithReason", reason) :
				getLang("turnedOnWithoutReason")
		);
	},

	onChat: async ({ event, message, getLang }) => {
		const { mentions } = event;

		if (!mentions || Object.keys(mentions).length == 0)
			return;
		const arrayMentions = Object.keys(mentions);

		for (const userID of arrayMentions) {
			const reasonBusy = global.db.allUserData.find(item => item.userID == userID)?.data.busy || false;
			if (reasonBusy !== false) {
				return message.reply(
					reasonBusy ?
						getLang("alreadyOnWithReason", mentions[userID].replace("@", ""), reasonBusy) :
						getLang("alreadyOn", mentions[userID].replace("@", "")));
			}
		}
	}
};