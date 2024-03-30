require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Comando = require('../js/comando');
const { Colori } = require('../js/colori');
const { servers } = require('../shared');
const requisiti = require('../js/requisiti');

async function comando(member, from_index, to_index) {
    const VCError = requisiti.playingSameVC(member);
    if (VCError) return VCError;

    const server = servers.get(member.guild.id);
    
    if (from_index<0 || to_index<0 || from_index>=server.queue.length || to_index>server.queue.length) {
	return {
	    embeds: [
		new EmbedBuilder()
		    .setTitle("Error")
		    .setColor(Colori.error)
		    .setDescription("Both parameters must be between 0 and the queue's length")
	    ]
	}
    }

    const song = server.queue.splice(from_index, 1)[0];
    if (to_index>from_index) to_index--;
    server.queue.splice(to_index,0,song);
    return {
	embeds: [
	    new EmbedBuilder()
		.setTitle("Song Moved")
		.setColor(Colori.default)
	]
    }
}

module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
	    .setName('move')
            .setDescription('Moved a song from a point in the queue to another')
            .setDescriptionLocalizations({
                it: "Sposta una canzone da una posizione all'altra della coda"
            })
            .addIntegerOption(option=>
                option
                    .setName("from")
                    .setNameLocalizations({
			it: "da"
                    })
                    .setDescription("Index of the song to move")
                    .setDescriptionLocalizations({
			it: "Indice della canzone da spostare"
                    })
		    .setMinValue(1)
                    .setRequired(true)
            )
            .addIntegerOption(option=>
                option
                    .setName("to")
                    .setNameLocalizations({
			it: "a"
                    })
                    .setDescription("Index where to move the song")
                    .setDescriptionLocalizations({
			it: "Destinazione dove muovere la canzone"
                    })
                    .setMinValue(1)
                    .setRequired(true)
            ),
        execute: (interaction) => {
            const from = interaction.options.getInteger("from")-1;
            const to   = interaction.options.getInteger("to")-1;

	    const reply = comando(interaction.member, from, to);
            interaction.reply(reply);
        },


        aliases: ['move'],
        executeMsg: (message,args)=>{
	    let from = Number(args[0]);
	    let to = Number(args[1]);
	    if (isNaN(from) || isNaN(to)) {
		message.channel.send({
		    embeds: [
			new EmbedBuilder()
			    .setTitle("Error")
			    .setColor(Colori.error)
			    .setDescription("This command requires two numeric arguments!")
		    ]
		});
		return;
	    }
	    const reply = comando(message.member, from, to);
	    message.channel.send(reply);
        },

        example: '`-move` `from` `to`',
        description: 'Moves a song from a point in the queue to another',
        parameters: '`from`: The index of the song to be moved\n`to`: The destination where the song must be moved to'
    }),
}
