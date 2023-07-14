const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Colori } = require('../js/colori');
const Comando = require('../js/comando');
const requisiti = require('../js/requisiti');
const { servers } = require('../shared');

const esegui= async (membro)=>{
    const errore1 = requisiti.sameVoiceChannel(membro)
    if (errore1) return errore1;

    const errore2 = requisiti.playing(membro.guild)
    if (errore2) return errore2;
    
    const server = servers.get(membro.guild.id);
    server.audioPlayer?.pause();    

    return {
        embeds:[
            new EmbedBuilder()
            .setTitle("Music paused")
            .setColor(Colori.default)
        ],
        ephemeral: true
    }
}

module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
            .setName('pause')
            .setDescription('Pauses the music')
            .setDescriptionLocalizations({
                it: "Mette in pausa la musica"
            }),
        execute: async(interaction) => {
            await interaction.deferReply({ephemeral:true});
            const reply = await esegui(interaction.member);
            return await interaction.editReply(reply);
        },

        aliases: ['pause', 'stop'],

        executeMsg: async (messaggio, args) => {
            const reply = await esegui(messaggio.member);
            return await messaggio.channel.send(reply);
        },

        example: '`-pause`',
        description:  'Pauses the music',
    })
}