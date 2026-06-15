function sleep(time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}

module.exports = {
	config: {
		name: "تصفية_المستخدمين",
		version: "1.5",
		author: "NTKhang",
		countDown: 5,
		role: 1,
		shortDescription: {
			
			ar: "تصفية أعضاء المم"
		},
		longDescription: {
			
			ar: "تصفية أعضاء المجموعة حسب عدد الرسائل أو الحساب المقفل"
		},
		category: "المجموعة",
		guide: {
			
			ar: "   {pn} [<عدد الرسائل> | موت]"
		}
	},

	langs: {
		
		ar: {
			needAdmin: "⚠️ | الرجاء إضافة الروبوت كمسؤول للمجموعة لاستخدام هذا الأمر",
			confirm: "⚠️ | هل أنت متأكد أنك تريد حذف أعضاء المجموعة الذين لديهم أقل من %1 رسائل?\nقم بالتفاعل على هذه الرسالة للتأكيد",
			kickByBlock: "✅ | تمت الإزالة بنجاح %1 حساب الأعضاء الذين تمت إزالتهم",
			kickByMsg: "✅ | تمت الإزالة بنجاح %1 الأعضاء الذين لديهم أقل من %2 رسالة",
			kickError: "❌ | حدث خطأ وتعذر طرد %1 من الأعضاء:\n%2",
			noBlock: "✅ | لا يوجد أعضاء الذين تم تأمينهم",
			noMsg: "✅ | لا يوجد أعضاء لديهم أقل من %1 رسالة"
		}
	},

	onStart: async function ({ api, args, threadsData, message, event, commandName, getLang }) {
		const threadData = await threadsData.get(event.threadID);
		if (!threadData.adminIDs.includes(api.getCurrentUserID()))
			return message.reply(getLang("needAdmin"));

		if (!isNaN(args[0])) {
			message.reply(getLang("confirm", args[0]), (err, info) => {
				global.NeroBot.onReaction.set(info.messageID, {
					author: event.senderID,
					messageID: info.messageID,
					minimum: Number(args[0]),
					commandName
				});
			});
		}
		else if (args[0] == "die") {
			const threadData = await api.getThreadInfo(event.threadID);
			const membersBlocked = threadData.userInfo.filter(user => user.type !== "User");
			const errors = [];
			const success = [];
			for (const user of membersBlocked) {
				if (user.type !== "User" && !threadData.adminIDs.some(id => id == user.id)) {
					try {
						await api.removeUserFromGroup(user.id, event.threadID);
						success.push(user.id);
					}
					catch (e) {
						errors.push(user.name);
					}
					await sleep(700);
				}
			}

			let msg = "";
			if (success.length > 0)
				msg += `${getLang("kickByBlock", success.length)}\n`;
			if (errors.length > 0)
				msg += `${getLang("kickError", errors.length, errors.join("\n"))}\n`;
			if (msg == "")
				msg += getLang("noBlock");
			message.reply(msg);
		}
		else
			message.SyntaxError();
	},

	onReaction: async function ({ api, Reaction, event, threadsData, message, getLang }) {
		const { minimum = 1, author } = Reaction;
		if (event.userID != author)
			return;
		const threadData = await threadsData.get(event.threadID);
		const botID = api.getCurrentUserID();
		const membersCountLess = threadData.members.filter(member =>
			member.count < minimum
			&& member.inGroup == true
			// ignore bot and admin box
			&& member.userID != botID
			&& !threadData.adminIDs.some(id => id == member.userID)
		);
		const errors = [];
		const success = [];
		for (const member of membersCountLess) {
			try {
				await api.removeUserFromGroup(member.userID, event.threadID);
				success.push(member.userID);
			}
			catch (e) {
				errors.push(member.name);
			}
			await sleep(700);
		}

		let msg = "";
		if (success.length > 0)
			msg += `${getLang("kickByMsg", success.length, minimum)}\n`;
		if (errors.length > 0)
			msg += `${getLang("kickError", errors.length, errors.join("\n"))}\n`;
		if (msg == "")
			msg += getLang("noMsg", minimum);
		message.reply(msg);
	}
};