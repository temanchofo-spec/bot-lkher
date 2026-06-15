const chalk = require('chalk');

// palette from user request
const palette = {
	primary: '#A78BFA', // section titles purple
	success: '#22C55E', // neon green
	warn: '#EAB308', // bright yellow
	info: '#C0C0C0', // light gray
	accent: '#3B82F6', // deep blue
	orange: '#F59E0B',
	bg: '#1E1E2E'
};

// Tags to suppress from console per user request
const SUPPRESSED_TAGS = new Set(['REFRESH FBSTATE', 'SQLITE', 'DATABASE', 'NOTIFICATION', 'LOAD TIME', 'SUCCESS']);

function prefix(tag) {
	const t = String(tag || 'BOT').toUpperCase();
	if (t === 'BOT') {
		return chalk.bold.hex(palette.accent)(' [BOT]') + ' ' + chalk.hex(palette.success)('✅');
	}
	return chalk.bold.hex(palette.primary)('[' + t + ']');
}

function writeLine(colorFn, tag, message, symbol) {
	// don't print empty or undefined messages
	if (message === undefined || message === null) return;
	if (String(message).trim() === '') return;

	const t = String(tag || 'BOT').toUpperCase();
	if (SUPPRESSED_TAGS.has(t)) return; // skip printing for suppressed tags
	const pre = prefix(tag);
	const sym = symbol ? ` ${symbol}` : '';
	process.stderr.write(`${pre}${sym}  ${colorFn(message)}\n`);
}

module.exports = {
	err: (p, m) => writeLine((s) => chalk.hex('#ff6b6b')(s), p, m, '⛔'),
	error: (p, m) => writeLine((s) => chalk.hex('#ff6b6b')(s), p, m, '⛔'),
	warn: (p, m) => writeLine((s) => chalk.hex(palette.warn)(s), p, m, '⚠️'),
	info: (p, m) => writeLine((s) => chalk.hex(palette.info)(s), p, m, '✅'),
	succes: (p, m) => writeLine((s) => chalk.hex(palette.orange)(s), p, m, '✔'),
	master: (p, m) => writeLine((s) => chalk.hex(palette.primary)(s), p, m, '★')
};
