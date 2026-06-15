const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const path = require("path");
const exec = (cmd, options) => new Promise((resolve, reject) => {
	require("child_process").exec(cmd, options, (err, stdout) => {
		if (err) return reject(err);
		resolve(stdout);
	});
});
const chalk = require("chalk");
const { NeroBot } = global;
const { configCommands } = NeroBot;
const regExpCheckPackage = /require(\s+|)\((\s+|)[`'"]([^`'"]+)[`'"](\s+|)\)/g;
const packageAlready = [];

module.exports = async function (api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, createLine) {
	// ----- SET ALIASES -----
	const aliasesData = await globalData.get('setalias', 'data', []);
	if (aliasesData) {
		for (const data of aliasesData) {
			const { aliases, commandName } = data;
			for (const alias of aliases)
				if (NeroBot.aliases.has(alias))
					throw new Error(`Alias "${alias}" already exists in command "${commandName}"`);
				else
					NeroBot.aliases.set(alias, commandName);
		}
	}

	const folders = ["cmds", "events"];
	let text, setMap;

	for (const folderModules of folders) {
		const header = folderModules === "cmds" ? 'LOAD COMMANDS' : 'LOAD EVENTS';
		const logger = global.utils.log || console;
		logger.master(header, '');

		if (folderModules === "cmds") {
			text = "command";
			setMap = "commands";
		} else {
			text = "event";
			setMap = "eventCommands";
		}

		const fullPathModules = path.normalize(process.cwd() + `/SYSTEM/${folderModules}`);
		const Files = readdirSync(fullPathModules)
			.filter(file =>
				file.endsWith(".js") &&
				!file.endsWith("eg.js") &&
				(process.env.NODE_ENV === "development" ? true : !file.match(/(dev)\.js$/g)) &&
				!configCommands[folderModules === "cmds" ? "commandUnload" : "commandEventUnload"]?.includes(file)
			);

		const commandError = [];
		let commandLoadSuccess = 0;

		for (const file of Files) {
			const pathCommand = path.normalize(fullPathModules + "/" + file);
			try {
				const contentFile = readFileSync(pathCommand, "utf8");
				global.temp.contentScripts[folderModules][file] = contentFile;

				const command = require(pathCommand);
				command.location = pathCommand;
				const configCommand = command.config;
				const commandName = configCommand.name;

				if (!configCommand) throw new Error(`config of ${text} undefined`);
				if (!configCommand.category) throw new Error(`category of ${text} undefined`);
				if (!commandName) throw new Error(`name of ${text} undefined`);
				if (!command.onStart) throw new Error(`onStart of ${text} undefined`);
				if (typeof command.onStart !== "function") throw new Error(`onStart of ${text} must be a function`);
				if (NeroBot[setMap].has(commandName)) throw new Error(`${text} "${commandName}" already exists`);

				const { onFirstChat, onChat, onLoad, onEvent, onAnyEvent } = command;
				const { envGlobal, envConfig, aliases } = configCommand;

				// ----- ALIASES -----
				if (aliases) {
					if (!Array.isArray(aliases)) throw new Error("config.aliases must be array");
					for (const alias of aliases) {
						if (NeroBot.aliases.has(alias))
							throw new Error(`alias "${alias}" already exists`);
						NeroBot.aliases.set(alias, commandName);
					}
				}

				// ----- ONLOAD -----
				if (onLoad) await onLoad({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });

				// ----- REGISTER EVENTS -----
				if (onChat) NeroBot.onChat.push(commandName);
				if (onFirstChat) NeroBot.onFirstChat.push({ commandName, threadIDsChattedFirstTime: [] });
				if (onEvent) NeroBot.onEvent.push(commandName);
				if (onAnyEvent) NeroBot.onAnyEvent.push(commandName);

				// ----- SAVE TO GLOBAL -----
				NeroBot[setMap].set(commandName.toLowerCase(), command);
				commandLoadSuccess++;
				global.NeroBot[folderModules === "cmds" ? "commandFilesPath" : "eventCommandsFilesPath"].push({
					filePath: pathCommand,
					commandName: [commandName, ...(aliases || [])]
				});
			} catch (error) {
				commandError.push({ name: file, error });
			}
		}

		// ----- SHOW SUMMARY -----
		if (commandLoadSuccess > 0) logger.succes('LOAD', `Successfully loaded ${commandLoadSuccess} ${text}(s)`);
		if (commandError.length > 0) {
			logger.err('LOAD', `Failed to load ${commandError.length} ${text}(s)`);
			for (const item of commandError) logger.err('LOAD', `✖ ${item.name}: ${item.error.message}`);
		}
		logger.master('');
	}
};
