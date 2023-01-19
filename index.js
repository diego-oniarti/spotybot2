// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { Server } = require('./js/server');
const { Client, Events, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Colori } = require('./js/colori');

require('dotenv').config();

// creazione del Bot
const TOKEN = process.env.TOKEN;
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
] });

client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

const servers = new Map();
module.exports.servers = {servers};
const comandi = require('./js/comandi');

// importo dei comandi
client.commands = comandi;

const errorMsg = {
	embeds:[
		new EmbedBuilder()
		.setTitle(":warning: Error")
		.setDescription("An error has occurred\nWe're sorry")
		.setColor(Colori.error)
	],
	ephemeral: true
};

// gestione degli Slash Commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	await command.execute(interaction)
    .catch(async error=>{
		console.error(error);

		// prova sia il metodo reply che editReply perché il comando chiamato porebbe già aver chiamato un deferReply prima di dare errore. In quel caso la reply normale darebbe errore
		await interaction.reply(errorMsg)
		.catch(async error=>{
			await interaction.editReply(errorMsg)
			.catch(error=>{
				console.error(error);
			});
		});
    });
});

// gestione dei comandi normali
client.on(Events.MessageCreate, async message => {
    if (!message.content.startsWith('-')) return;
	message.content=message.content.slice(1);
    const args = message.content.split(' ').filter(arg=>arg.trim()!='');
	const nomeComando = args.shift();

	const comando = client.commands.find(command=>{return command.aliases.includes(nomeComando)});
	await comando.executeMsg(message, args)
	.catch(async error=>{
		console.error(error);
		await message.reply(errorMsg)
		.catch(error=>{
			console.error(error);
		});
	});
});

client.login(TOKEN);