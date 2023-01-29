const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Colori } = require('../js/colori');
const Comando = require('../js/comando');
const requisiti = require('../js/requisiti');
const { servers } = require('../shared');

const comando=(member)=>{
	const SVerror = requisiti.sameVoiceChannel(member)
    if (SVerror)
        return SVerror;
    const playingError = requisiti.playing(member.guild);
    if (playingError)
        return playingError;

    const server = servers.get(member.guild.id);
    server.queue.sort((a,b)=>{return 0.5-Math.random()});
    return {
        embeds: [
            new EmbedBuilder()
            .setTitle('Queue shuffled')
            .setColor(Colori.default)
        ]
    };
}

module.exports = { 
	comando: new Comando({
		data: new SlashCommandBuilder()
			.setName('shuffle')
			.setDescription('Shuffles the queue')
			.setDescriptionLocalizations({
				it: 'Mischia la coda'
			}),
		execute: async (interaction) => {
			const reply = comando(interaction.member);
			return await interaction.reply(reply);
		},

		aliases: ['shuffle'],

		executeMsg: async (message) => {
			const reply = comando(message.member);
			return await message.channel.send(reply);
		},

		example: '`-ping`',
		description: 'Replies with Pong!'
	})
}