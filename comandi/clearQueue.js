require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Comando = require('../js/comando');
const { Colori } = require('../js/colori');
const { servers } = require('../shared');
const requisiti = require('../js/requisiti');

function comando(member) {
    const VCError = requisiti.playingSameVC(member);
    if (VCError) return VCError;

    const server = servers.get(member.guild.id);

    server.queue = [];

    return {
        embeds: [
            new EmbedBuilder()
            .setColor(Colori.default)
            .setTitle("Queue Cleared")
        ]
    }
}

module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
        .setName('clearqueue')
        .setDescription('Removes all the queued songs')
        .setDescriptionLocalizations({
            it: "Rimuove tutte le canzoni dalla coda"
        }),
        execute: (interaction) => {
            const reply = comando(interaction.member);
            interaction.reply(reply);
        },


        aliases: ['clearqueue', 'clearq', 'cq', 'clear'],
        executeMsg: async (message)=>{
            const reply = comando(message.member);
            message.channel.send(reply);
        },

        example: '`-clearqueue`',
        description: 'Removes all the songs from the queue',
    }),
}
