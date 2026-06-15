module.exports = {
	config: {
		name: "الكل",
		version: "1.2",
		author: "SIFOANTER ",
		countDown: 5,
		role: 1,
		description: {
			
			ar: "قم بعمل منسن لجميع أعضاء المجموعة"
		},
		category: "المجموعة",
		guide: {
			
			ar: "   {pn} [المحتوى | فارغ]"
		}
	},

	onStart: async function ({ message, event, args }) {
		const { participantIDs } = event;
		const lengthAllUser = participantIDs.length;
		const mentions = [];
		let body = args.join(" ") || "@الكل";
		let bodyLength = body.length;
		let i = 0;
		for (const uid of participantIDs) {
			let fromIndex = 0;
			if (bodyLength < lengthAllUser) {
				body += body[bodyLength - 1];
				bodyLength++;
			}
			if (body.slice(0, i).lastIndexOf(body[i]) != -1)
				fromIndex = i;
			mentions.push({
				tag: body[i],
				id: uid, fromIndex
			});
			i++;
		}
		message.reply({ body, mentions });
	}
};