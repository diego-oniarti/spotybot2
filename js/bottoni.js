const path = require('node:path');
const fs = require('node:fs');

const bottoni = [];

const buttonsPath = path.join(__dirname, '..', 'bottoni');
const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));
for (const file of buttonFiles) {
	const filePath = path.join(buttonsPath, file);
	const bottone = require(filePath);
	if ('id' in bottone && 'handler' in bottone) {
		bottoni.push(bottone);
	} else {
		console.log(`[WARNING] The button at ${filePath} is missing a required "id" or "handler" property.`);
	}
}

module.exports = bottoni;