const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { Colori } = require('../js/colori');
const Comando = require('../js/comando');
const requisiti = require('../js/requisiti')
const {servers} =  require('../shared')

const comando= (guild, pagina=0) =>{
	pagina = parseInt(pagina);
    const playingError = requisiti.playing(guild);
    if (playingError)
        return playingError;

    const server = servers.get(guild.id);
	if (server.queue.length == 0)
		return {
			embeds: [
				new EmbedBuilder()
				.setTitle('Queue is empty')
				.setColor(Colori.default)
			]
		}

	return {
		embeds: [
			new EmbedBuilder()
			.setTitle("Queue")
            .setDescription(server.queue.slice(pagina*20, (pagina+1)*20).map((song,index)=>{
                return `\`${index+1+pagina*20}\` __[${song.titolo}](${song.link})__`; 
            }).join('\n'))
            .addFields({
                name: 'Currently playing',
                value: `__[${server.corrente.titolo}](${server.corrente.link})__`,
                inline:  true
            },
            {
                name: 'Queue length',
                value: `${server.queue.length}`,
                inline: true
            })
			.setColor(Colori.default)
		],
		components: [
			new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
				.setDisabled(pagina<=0)
				.setCustomId(`queueIndietro-${pagina-1}`)
				.setEmoji('⬅️')
				.setStyle(ButtonStyle.Primary),
				
				new ButtonBuilder()
				.setDisabled((pagina+1)*20>=server.queue.length)
				.setCustomId(`queueAvanti-${pagina+1}`)
				.setEmoji('➡️')
				.setStyle(ButtonStyle.Primary)
			)
		],
		ephemeral: true
	}
}

bottone = async (i)=>{
	console.log(i);
	i.reply({
		content:"ciao",
		ephemeral: true
	});
};

module.exports = { 
	comando: new Comando({
		data: new SlashCommandBuilder()
			.setName('queue')
			.setDescription('Shows you the queue')
			.setDescriptionLocalizations({
				it: 'Mostra la coda'
			}),
		execute: async (interaction) => {
			const reply = comando(interaction.guild);
			const messaggio =  await interaction.reply(reply);
		},

		aliases: ['queue', 'q'],

		executeMsg: async (message) => {
			const reply = comando(message.guild);
			return await message.channel.send(reply);
		},

		example: '`-queue`',
		description: 'Shows you the queue'
	}),
	comandoQueue: comando
}