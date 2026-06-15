const allOnEvent = global.NeroBot.onEvent;

module.exports = {
	config: {
		name: "onEvent",
		version: "1.1",
		author: "NERO",
		description: "Loop to all ",
		category: "events"
	},

	onStart: async ({ api, args, message, event, threadsData, usersData, dashBoardData, threadModel, userModel, dashBoardModel, role, commandName }) => {
		for (const item of allOnEvent) {
			if (typeof item === "string")
				continue; // Skip if item is string, because it is the command name and is executed at ../../bot/core/handlerhandlerEvents.js
			item.onStart({ api, args, message, event, threadsData, usersData, threadModel, dashBoardData, userModel, dashBoardModel, role, commandName });
		}
	}
};