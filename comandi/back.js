const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Colori } = require('../js/colori');
const Comando = require('../js/comando');
const { servers } = require('../shared');
const {fineCanzone} = require('./play'); 

const comando = async (quantita, gilda,channel,member)=>{
    const sameVCError = requisiti.sameVoiceChannel(member);
    if (sameVCError)
        return sameVCError;

    const server = servers.get(gilda.id);
    if (!server)
        return {
            embeds: [new EmbedBuilder()
                .setTitle('Error!')
                .setDescription("I'm not even playing")
                .setColor(Colori.error)
            ]
        }

    
    const vecchie = server.pastSongs.splice(Math.max(0,server.pastSongs.length-quantita),  quantita);
    server.queue.unshift(...vecchie, server.corrente);

    fineCanzone(server,channel)();

    // scarta il duplicato che viene dreato da fineCanzone
    server.pastSongs.pop();

    return {
        embeds: [ new EmbedBuilder()
            .setTitle(`Backed ${vecchie.length} songs`)
            .setColor(Colori.default)
        ]
    };
}

module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
            .setName('back')
            .setDescription('Jumps back a given amount of songs')
            .setDescriptionLocalizations({
                it: 'Retrocede una certa quantità di canzoni'
            })
            .addIntegerOption(option=>option
                .setName('amount')
                .setNameLocalizations({
                    it: 'quantità'
                })
                .setDescription('amount of songs to rewind')
                .setDescriptionLocalizations({
                    it: 'quantità di canzoni da retrocedere'
                })
                .setMinValue(1)
                .setRequired(false)
            ),
        execute: async (interaction) => {
            const quantita = interaction.options.getInteger('amount') || 1;

            await interaction.deferReply();
            const reply = await comando(quantita, interaction.guild, interaction.channel, interaction.member);
            return await interaction.editReply(reply);
        },

        aliases: ['back', 'b'],

        executeMsg: async (message,  args) => {
            const quantita = Math.max(1, args[0] || 1);
            if (isNaN(parseInt(quantita)))
                return await message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                        .setTitle('Error!')
                        .setDescription(`${args[0]} is not a number`)
                        .setColor(Colori.error)
                    ]
                });

            const reply = await comando(quantita, message.guild, message.channel, message.member);
            await message.channel.send(reply);
        },

        example: '`-back` `[amount]`',
        description: 'Jumps back a given amount of songs',
        parameters: '`[amount]`: the amount of songs to rewind'
    })
};