const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Colori } = require('../js/colori');
const Comando = require('../js/comando');
const requisiti = require('../js/requisiti');
const { servers } = require('../shared');
const Discord = require('@discordjs/voice');

const comando = async (member)=>{
    const playingError = requisiti.playing(member.guild);
    if (playingError)
        return playingError;

    const sameVCError = requisiti.sameVoiceChannel(member);
    if (sameVCError)
        return sameVCError;

    const guild = member.guild;
    const connection = Discord.getVoiceConnection(guild.id);

    if (connection)
        connection.destroy();
    
    servers.delete(guild.id);

    return {
        embeds: [ new EmbedBuilder()
            .setTitle(`Bye Bye`)
            .setDescription(':<')
            .setColor(Colori.default)
        ]
    };
}

module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
            .setName('leave')
            .setDescription('Stops the music and leaves the voice channel')
            .setDescriptionLocalizations({
                it: 'Ferma la musica e lascia il canale vocale'
            }),
            execute: async (interaction) => {
                const quantita = interaction.options.getInteger('amount') || 1;

                await interaction.deferReply();
                const reply = await comando(interaction.member);
                return await interaction.editReply(reply);
        },

        aliases: ['leave', 'quit', 'disconnect'],

        executeMsg: async (message,  args) => {
            const reply = await comando(message.member);
            await message.channel.send(reply);
        },

        example: '`leave`',
        description: 'Leaves the voice channel',
    })
};