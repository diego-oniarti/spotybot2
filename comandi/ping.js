const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Colori } = require('../js/colori');
const Comando = require('../js/comando');

const comando=()=>{
	return {
		embeds: [
			/*{
				title: "Pong!",
				color: Colors.DarkPurple
			},*/
			new EmbedBuilder()
			.setTitle("Pong!")
			.setColor(Colori.default)
		],
		ephemeral: true
	}
}

module.exports = new Comando({
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!')
        .setDescriptionLocalizations({
            it: 'Risponde con Pong!'
        }),
	execute: async (interaction) => {
		const reply = comando();
		return await interaction.reply(reply);
	},

	aliases: ['ping'],

	executeMsg: async (message) => {
		const reply = comando();
		message.channel.send(reply);
	},

	example: '`-ping`',
	description: 'Replies with Pong!'
});