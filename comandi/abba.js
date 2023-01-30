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
    server.queue.reverse();
    return {
        embeds: [
            new EmbedBuilder()
            .setTitle('Queue inverted')
            .setColor(Colori.default)
        ]
    };
}

module.exports = { 
	comando: new Comando({
		data: new SlashCommandBuilder()
			.setName('abba')
			.setDescription('Inverts the order of the songs in the queue')
			.setDescriptionLocalizations({
				it: "Inverte l'ordinedella canzoni in coda"
			}),
		execute: async (interaction) => {
			const reply = comando(interaction.member);
			return await interaction.reply(reply);
		},

		aliases: ['abba', 'reverse'],

		executeMsg: async (message) => {
			const reply = comando(message.member);
			return await message.channel.send(reply);
		},

		example: '`-abba`',
		description: 'Inverts the order of the songs in the queue'
	})
}