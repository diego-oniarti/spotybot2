const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Colori } = require('../../../Desktop/spotybot2/js/colori');
const Comando = require('../../../Desktop/spotybot2/js/comando');
const { playing, sameVoiceChannel } = require('../../../Desktop/spotybot2/js/requisiti');
const { servers } = require('../../../Desktop/spotybot2/shared');

async function comando(member){
    const not_playing = playing(member.guild);
    if (not_playing) return {messaggio: not_playing, errore:true};
    const vc_error = sameVoiceChannel(member);
    if (vc_error) return {messaggio: vc_error, errore:true};
    
    const DM_channel = await member.createDM();
    const server = servers.get(member.guild.id);
    const song = server.corrente;
    
    await DM_channel?.send({
	embeds: [
	    new EmbedBuilder()
		.setColor(Colori.default)
		.setDescription(`__[${song.titolo}](${song.link})__`)
	    ]
    });
    
    return {
	messaggio: {
	    embeds: [
		new EmbedBuilder()
		    .setTitle("Message sent!")
		    .setColor(Colori.default)
	    ],
	    ephemeral: true
	},
	errore:false,
    };
}

module.exports = { 
    comando: new Comando({
	data: new SlashCommandBuilder()
	    .setName('dm')
	    .setDescription('Sends you a DM with a link to the current song')
	    .setDescriptionLocalizations({
		it: 'Ti invia un DM con un link alla canzone corrente'
	    }),
	execute: async (interaction) => {
	    interaction.deferReply({ephemeral: true});
	    const reply = await comando(interaction.member);
	    return await interaction.editReply(reply.messaggio);
	},
	
	aliases: ['dm','DM'],
	
	executeMsg: async (message) => {
	    const reply_message = await comando(message.member);
	    if (reply_message.errore) {
		message.channel.send(reply_message.messaggio)
	    }
	},
	
	example: '`-DM`',
	description: 'Sends you a direct message with a link to the current song'
    })
}
