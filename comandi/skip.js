const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Colori } = require('../js/colori');
const Comando = require('../js/comando');
const requisiti = require('../js/requisiti');
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

    
    const tolte = server.queue.splice(0,quantita-1).filter(a=>a);
    fineCanzone(server,channel)();
    server.pastSongs.push(...tolte);

    return {
        embeds: [ new EmbedBuilder()
            .setTitle(`Skipped ${quantita} songs`)
            .setColor(Colori.default)
        ]
    };
}

module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
            .setName('skip')
            .setDescription('Skips a given amount of songs')
            .setDescriptionLocalizations({
                it: 'Salta una certa quantità di canzoni'
            })
            .addIntegerOption(option=>option
                .setName('amount')
                .setNameLocalizations({
                    it: 'quantità'
                })
                .setDescription('amount of songs to skip')
                .setDescriptionLocalizations({
                    it: 'quantità di canzoni da saltare'
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

        aliases: ['skip', 's', 'next', 'n'],

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
            console.log(reply)
            await message.channel.send(reply);
        },

        example: '`-skip` `[amount]`',
        description: 'Skips a given amount of songs',
        parameters: '`[amount]`: the amount of songs to skip'
    })
};