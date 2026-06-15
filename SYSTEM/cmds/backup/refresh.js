module.exports = {
	config: {
		name: "إنعاش",
		version: "1.1",
		author: "NTKhang",
		countDown: 60,
		role: 0,
		shortDescription: {
			
			ar: "تحديث المعلومات"
		},
		longDescription: {
			
			ar: "تحديث معلومات الدردشة الجماعية أو المستخدم"
		},
		category: "المجموعة",
		guide: {
			
			ar: "   {pn} [thread | المجموعة]: تحديث معلومات الدردشة الجماعية الخاصة بك"
				+ "\n   {pn} المجموعة <threadID>: تحديث معلومات الدردشة الجماعية عن طريق الآيدي"
				+ "\n\n   {pn} المستخدم: تحديث معلومات المستخدم الخاص بك"
				+ "\n   {pn} مستخدم [<آيدي المستخدم> | @تاغ]: تحديث معلومات المستخدم بواسطة آيدي"
		}
	},

	langs: {
		
		ar: {
			refreshMyThreadSuccess: "✅ | تم تحديث معلومات الدردشة الجماعية الخاصة بك بنجاح!",
			refreshThreadTargetSuccess: "✅ | تم تحديث معلومات الدردشة الجماعية %1 بنجاح!",
			errorRefreshMyThread: "❌ | خطأ عند تحديث معلومات الدردشة الجماعية الخاصة بك",
			errorRefreshThreadTarget: "❌ | خطأ عند تحديث معلومات الدردشة الجماعية %1",
			refreshMyUserSuccess: "✅ | تم بتحديث معلومات المستخدم الخاص بك بنجاح!",
			refreshUserTargetSuccess: "✅ | تم بتحديث معلومات المستخدم %1 بنجاح!",
			errorRefreshMyUser: "❌ | خطأ عند تحديث معلومات المستخدم الخاص بك",
			errorRefreshUserTarget: "❌ | خطأ عند تحديث معلومات المستخدم %1"
		}
	},

	onStart: async function ({ args, threadsData, message, event, usersData, getLang }) {
		if (args[0] == "المجموعة" || args[0] == "thread") {
			const targetID = args[1] || event.threadID;
			try {
				await threadsData.refreshInfo(targetID);
				return message.reply(targetID == event.threadID ? getLang("refreshMyThreadSuccess") : getLang("refreshThreadTargetSuccess", targetID));
			}
			catch (error) {
				return message.reply(targetID == event.threadID ? getLang("errorRefreshMyThread") : getLang("errorRefreshThreadTarget", targetID));
			}
		}
		else if (args[0] == "المستخدم") {
			let targetID = event.senderID;
			if (args[1]) {
				if (Object.keys(event.mentions).length)
					targetID = Object.keys(event.mentions)[0];
				else
					targetID = args[1];
			}
			try {
				await usersData.refreshInfo(targetID);
				return message.reply(targetID == event.senderID ? getLang("refreshMyUserSuccess") : getLang("refreshUserTargetSuccess", targetID));
			}
			catch (error) {
				return message.reply(targetID == event.senderID ? getLang("errorRefreshMyUser") : getLang("errorRefreshUserTarget", targetID));
			}
		}
		else
			message.SyntaxError();
	}
};