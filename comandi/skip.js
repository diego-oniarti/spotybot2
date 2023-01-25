const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const colori = require('../js/colori');
const { Colori } = require('../js/colori');
const Comando = require('../js/comando');

const skip 


module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
            .setName('skip')
            .setDescription('Skips a given amount of songs')
            .setDescriptionLocalizations({
                it: 'Salta una certa quantità di canzoni'
            })
            .addIntegerOption(option=>{option
                .setName('amount')
                .setNameLocalizations({
                    it: 'quantità'
                })
                .setDescription('amount of songs to skip')
                .setDescriptionLocalizations({
                    it: 'quantità di canzoni da saltare'
                })
                .setMinValue(1)
                .setRequired(false);
            }),
        execute: async (interaction) => {
            const quantita = interaction.options.getInteger('amount') || 1;

            await interaction.deferReply();
            const reply = comando(quantita);
            return await interaction.reply(reply);
        },

        aliases: ['skip', 's', 'next', 'n'],

        executeMsg: async (message,  args) => {
            const quantita = Math.max(0, args[0] || 0);
            if (isNaN(parseInt(quantita)))
                return await message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                        .setTitle('Error!')
                        .setDescription(`${args[0]} is not a number`)
                        .setColor(colori.error)
                    ]
                })

            const reply = comando(quantita);
            message.channel.send(reply);
        },

        example: '`-ping`',
        description: 'Replies with Pong!'
    })
};