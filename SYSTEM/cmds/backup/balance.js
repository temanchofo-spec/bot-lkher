module.exports = {
	config: {
		name: "رصيدي",
		aliases: ["bal"],
		version: "1.2",
		author: "NTKhang",
		countDown: 5,
		role: 0,
		description: {
		
			ar: "عرض رصيدك الحالي أو رصيد الأعضاء"
		},
		category: "إقتصاد",
	guide: {
			
			ar: "   {pn}: عرض الأموال"
				+ "\n   {pn} <@منشن>: قم برؤية رصيد الشخص اللذي قمت بعمل منشن له"
		}
	},

	langs: {
		
		ar: {
			money: "رصيدك هو 『 %1 』دولار 💵",
			moneyOf: "『رصيد %1 هو 『 %2 دولار 💵"
		}
	},

	onStart: async function ({ message, usersData, event, getLang }) {
		if (Object.keys(event.mentions).length > 0) {
			const uids = Object.keys(event.mentions);
			let msg = "";
			for (const uid of uids) {
				const userMoney = await usersData.get(uid, "money");
				msg += getLang("moneyOf", event.mentions[uid].replace("@", ""), userMoney) + '\n';
			}
			return message.reply(msg);
		}
		const userData = await usersData.get(event.senderID);
		message.reply(getLang("money", userData.money));
	}
};