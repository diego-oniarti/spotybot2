const { SlashCommandBuilder, EmbedBuilder, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { Colori } = require('../js/colori');
const Comando = require('../js/comando');
require('dotenv').config();

const comando=(user)=>{
	return {
		embeds: [
			new EmbedBuilder()
			.setTitle("Connect your spotify account!")
			.setDescription("Connecting your spotify account to spotybot allows it to play your private playlists through the bot. This command is not fully functional due to spotify hating me. If you use it you'll lose your ability to use the bot. Send the owner your spotify email or a request to be manually enabled if you need to fix the issue")
			.setColor(Colori.default)
		],
		components: [
			new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
				.setLabel("Go to website")
				.setURL(`https://horse-smooth-mutt.ngrok-free.app/connect?user=${user.id}`)
				.setStyle(ButtonStyle.Link),
			)
		],
		ephemeral: true
	}
}

module.exports = { 
	comando: new Comando({
		data: new SlashCommandBuilder()
		.setName('connectspotify')
		.setDescription('Connect your spotify account to spotybot')
		.setDescriptionLocalizations({
			it: 'Connetti il tuo account di spotify a spotybot'
		}),
		execute: async (interaction) => {
			const reply = comando(interaction.user);
			return await interaction.reply(reply);
		},

		aliases: ['connectSpotify'],

		executeMsg: async (message) => {
			const reply = comando(message.author);
			message.channel.send(reply);
		},

		example: '`-connectSpotify`',
		description: 'Connect your spotify account to spotybot to play your private playlists or blends'
	})
}
