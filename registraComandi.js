const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
require('dotenv').config();
const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.TOKEN;

const commands = [];
// Grab all the command files from the commands directory you created earlier
const commandFiles = fs.readdirSync('./comandi').filter(file => file.endsWith('.js'));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
	const command = require(`./comandi/${file}`).comando;
	commands.push(command.data.toJSON());
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(TOKEN);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
			//Routes.applicationGuildCommands(CLIENT_ID, '754446825699672145'),
			Routes.applicationCommands(CLIENT_ID),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();