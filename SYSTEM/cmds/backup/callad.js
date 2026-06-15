const { getStreamsFromAttachment, log } = global.utils;
const mediaTypes = ["photo", 'png', "animated_image", "video", "audio"];

module.exports = {
	config: {
		name: "نداء",
		version: "1.6",
		author: "NTKhang",
		countDown: 5,
		role: 0,
		shortDescription: {
			
			ar: "إرسال رسالة إلى مشرف البوت"
		},
		longDescription: {
			
			ar: "إرسال تقرير، ردود الفعل، علة,... إلى المشرف بوت"
		},
		category: "المالك",
		guide: {
			
			ar: "   {pn} <رسالة>"
		}
	},

	langs: {
		
		ar: {
			missingMessage: "الرجاء إدخال الرسالة التي تريد إرسالها إلى المشرف",
			sendByGroup: "\n- تم الإرسال من المجموعة: %1\n- آيدي المجموعة: %2",
			sendByUser: "\n- تم الإرسال من المستخدم",
			content: "\n\nالمحتوى:\n─────────────────\n%1\n─────────────────\nقم بالرد على هذه الرسالة لإرسال رسالة إلى المستخدم",
			success: "تم إرسال رسالتك إلى %1 المشرف بنجاح!\n%2",
			failed: "حدث خطأ أثناء إرسال رسالتك إلى مشرف %1\n%2\nتحقق من وحدة التحكم لمزيد من التفاصيل",
			reply: "📍 الرد من المشرف %1:\n─────────────────\n%2\n─────────────────\nقم بالرد على هذه الرسالة لمواصلة إرسال الرسالة إلى المشرف",
			replySuccess: "تم إرسال ردك إلى المشرف بنجاح!",
			feedback: "📝 ردود من المستخدم %1:\n- آيدي المستخدم: %2%3\n\nالمحتوى:\n─────────────────\n%4\n─────────────────\nقم بالرد على هذه الرسالة لإرسال رسالتك إلى المستخدم",
			replyUserSuccess: " ✅ |تم إرسال ردك إلى المستخدم بنجاح!",
			noAdmin: "بوت ليس لديه أي مشرف في الوقت الراهن"
		}
	},

	onStart: async function ({ args, message, event, usersData, threadsData, api, commandName, getLang }) {
		const { config } = global.NeroBot;
		if (!args[0])
			return message.reply(getLang("missingMessage"));
		const { senderID, threadID, isGroup } = event;
		if (config.adminBot.length == 0)
			return message.reply(getLang("noAdmin"));
		const senderName = await usersData.getName(senderID);
		const msg = "==📨️ نداء المشرف 📨️=="
			+ `\n- إسم المستخدم: ${senderName}`
			+ `\n- آيدي المستخدم: ${senderID}`
			+ (isGroup ? getLang("sendByGroup", (await threadsData.get(threadID)).threadName, threadID) : getLang("sendByUser"));

		const formMessage = {
			body: msg + getLang("content", args.join(" ")),
			mentions: [{
				id: senderID,
				tag: senderName
			}],
			attachment: await getStreamsFromAttachment(
				[...event.attachments, ...(event.messageReply?.attachments || [])]
					.filter(item => mediaTypes.includes(item.type))
			)
		};

		const successIDs = [];
		const failedIDs = [];
		const adminNames = await Promise.all(config.adminBot.map(async item => ({
			id: item,
			name: await usersData.getName(item)
		})));

		for (const uid of config.adminBot) {
			try {
				const messageSend = await api.sendMessage(formMessage, uid);
				successIDs.push(uid);
				global.NeroBot.onReply.set(messageSend.messageID, {
					commandName,
					messageID: messageSend.messageID,
					threadID,
					messageIDSender: event.messageID,
					type: "userCallAdmin"
				});
			}
			catch (err) {
				failedIDs.push({
					adminID: uid,
					error: err
				});
			}
		}

		let msg2 = "";
		if (successIDs.length > 0)
			msg2 += getLang("success", successIDs.length,
				adminNames.filter(item => successIDs.includes(item.id)).map(item => ` <@${item.id}> (${item.name})`).join("\n")
			);
		if (failedIDs.length > 0) {
			msg2 += getLang("failed", failedIDs.length,
				failedIDs.map(item => ` <@${item.adminID}> (${adminNames.find(item2 => item2.id == item.adminID)?.name || item.adminID})`).join("\n")
			);
			log.err("CALL ADMIN", failedIDs);
		}
		return message.reply({
			body: msg2,
			mentions: adminNames.map(item => ({
				id: item.id,
				tag: item.name
			}))
		});
	},

	onReply: async ({ args, event, api, message, Reply, usersData, commandName, getLang }) => {
		const { type, threadID, messageIDSender } = Reply;
		const senderName = await usersData.getName(event.senderID);
		const { isGroup } = event;

		switch (type) {
			case "userCallAdmin": {
				const formMessage = {
					body: getLang("reply", senderName, args.join(" ")),
					mentions: [{
						id: event.senderID,
						tag: senderName
					}],
					attachment: await getStreamsFromAttachment(
						event.attachments.filter(item => mediaTypes.includes(item.type))
					)
				};

				api.sendMessage(formMessage, threadID, (err, info) => {
					if (err)
						return message.err(err);
					message.reply(getLang("replyUserSuccess"));
					global.NeroBot.onReply.set(info.messageID, {
						commandName,
						messageID: info.messageID,
						messageIDSender: event.messageID,
						threadID: event.threadID,
						type: "adminReply"
					});
				}, messageIDSender);
				break;
			}
			case "adminReply": {
				let sendByGroup = "";
				if (isGroup) {
					const { threadName } = await api.getThreadInfo(event.threadID);
					sendByGroup = getLang("sendByGroup", threadName, event.threadID);
				}
				const formMessage = {
					body: getLang("feedback", senderName, event.senderID, sendByGroup, args.join(" ")),
					mentions: [{
						id: event.senderID,
						tag: senderName
					}],
					attachment: await getStreamsFromAttachment(
						event.attachments.filter(item => mediaTypes.includes(item.type))
					)
				};

				api.sendMessage(formMessage, threadID, (err, info) => {
					if (err)
						return message.err(err);
					message.reply(getLang("replySuccess"));
					global.NeroBot.onReply.set(info.messageID, {
						commandName,
						messageID: info.messageID,
						messageIDSender: event.messageID,
						threadID: event.threadID,
						type: "userCallAdmin"
					});
				}, messageIDSender);
				break;
			}
			default: {
				break;
			}
		}
	}
};