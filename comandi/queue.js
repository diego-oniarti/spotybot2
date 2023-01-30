const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Colori } = require('../js/colori');
const Comando = require('../js/comando');
const requisiti = require('../js/requisiti')
const {servers} =  require('../shared')

const comando= (guild) =>{
    const playingError = requisiti.playing(guild);
    if (playingError)
        return playingError;

    const server = servers.get(guild.id);
	return {
		embeds: [
			new EmbedBuilder()
			.setTitle("Queue")
            .setDescription(server.queue.slice(0,20).map((song,index)=>{
                return `\`${index}\` __[${song.titolo}](${song.link})__`; 
            }).join())
            .addFields({
                name: 'Currently playing',
                value: `__[${server.corrrente.titolo}](${server.corrente.link})__`,
                inline:  true
            },
            {
                name: 'Queue length',
                value: `${server.queue.length}`,
                inline: true
            })
			.setColor(Colori.default)
		],
		ephemeral: true
	}
}

module.exports = { 
	comando: new Comando({
		data: new SlashCommandBuilder()
			.setName('queue')
			.setDescription('Shows you the queue')
			.setDescriptionLocalizations({
				it: 'Mostra la coda'
			}),
		execute: async () => {
			const reply = comando();
			return await interaction.reply(reply);
		},

		aliases: ['queue', 'q'],

		executeMsg: async (message) => {
			const reply = comando();
			message.channel.send(reply);
		},

		example: '`-queue`',
		description: 'Shows you the queue'
	})
}