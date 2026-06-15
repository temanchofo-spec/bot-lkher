module.exports = {
	config: {
		name: "تقيد",
		aliases: ["تقيد_مستخدمين"],
		version: "1.2",
		author: "SIFOANTER ",
		countDown: 5,
		role: 1,
		shortDescription: {
			
			ar: "تشغيل/إيقاف  صندوق الإدارة فقط من يمكنه استخدام الروبوت"
		},
		longDescription: {
			
			ar: "تشغيل/إيقاف  صندوق الإدارة فقط من يمكنه استخدام الروبوت"
		},
		category: "المجموعة",
		guide: {
			
			ar: "   {pn} [تشغيل | إيقاف]: تشغيل/إيقاف الوضع، يمكن لمسؤول المجموعة فقط استخدام الروبوت"
				+ "\n   {pn} إشعار [تشغيل | إيقاف]: قم بتشغيل/إيقاف تشغيل الإشعار عندما لا يكون المستخدم مسؤولاً عن روبوت الاستخدام الجماعي"
		}
	},

	langs: {

		ar: {
			turnedOn: " ✅ |تم تشغيل الوضع، حيث يمكن لمسؤول المجموعة فقط  استخدام البوت",
			turnedOff: " ❌ |تم إيقاف تشغيل الوضع، حيث يمكن لمسؤول المجموعة استخدام البوت",
			turnedOnNoti: " ✅ |تم تشغيل الإشعار عندما لا يكون المستخدم مسؤولاً عن البوت الاستخدام الشامل",
			turnedOffNoti: " ❌ |تم إيقاف تشغيل الإشعار عندما لا يكون المستخدم مسؤولاً عن البوت الاستخدام الجماعي",
			syntaxError: " ⚠️ |خطأ في بناء الجملة, فقط استخدم {pn} تشغيل أو {pn} إيقاف"
		}
	},

	onStart: async function ({ args, message, event, threadsData, getLang }) {
		let isSetNoti = false;
		let value;
		let keySetData = "data.onlyAdminBox";
		let indexGetVal = 0;

		if (args[0] == "إشعار") {
			isSetNoti = true;
			indexGetVal = 1;
			keySetData = "data.hideNotiMessageOnlyAdminBox";
		}

		if (args[indexGetVal] == "تشغيل")
			value = true;
		else if (args[indexGetVal] == "إيقاف")
			value = false;
		else
			return message.reply(getLang("syntaxError"));

		await threadsData.set(event.threadID, isSetNoti ? !value : value, keySetData);

		if (isSetNoti)
			return message.reply(value ? getLang("turnedOnNoti") : getLang("turnedOffNoti"));
		else
			return message.reply(value ? getLang("turnedOn") : getLang("turnedOff"));
	}
};