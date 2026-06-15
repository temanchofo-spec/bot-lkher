const fs = require("fs-extra");
const { config } = global.NeroBot;
const { client } = global;

module.exports = {
	config: {
		name: "تقييد",
		aliases: ["maintainmode", "المالك الخارق", "المشرف_الخارق"],
		version: "1.2",
		author: "Deadlin Ackerman",
		countDown: 5,
		role: 2,
		shortDescription: {

			ar: "تفعيل✅/تعطيل❌"
		},
		longDescription: {
			
			ar: "تفعيل✅/تعطيل❌ "
		},
		category: "المالك",
		guide: {
			ar: "{pn} [تفعيل ✅| تعطيل❌]"
		}
	},

	langs: {
		
		ar: {
			turnedOn: "✅| تم تغعيل مي تقييد إستخدام البوت !",
			turnedOff: "✅| تم تعطيل تقييد إستخدام البوت !",
			syntaxError: "هناك خطأ في بناء الجملة, إستخدم {pn} تفعيل✅ {pn} تعطيل ❌"
		}
	},

	onStart: function ({ args, message, getLang  }) {
		if (args[0] == "تفعيل") {
			config.adminOnly.enable = true;
			message.reply(getLang("turnedOn"));
			fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
		}
		else if (args[0] == "تعطيل") {
			config.adminOnly.enable = false;
			message.reply(getLang("turnedOff"));
			fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
		}
		else
			return message.reply(getLang("syntaxError"));
	}
};