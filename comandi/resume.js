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
    server.audioPlayer?.unpause();    

    return {
        embeds:[
            new EmbedBuilder()
            .setTitle("Music unpaused")
            .setColor(Colori.default)
        ],
        ephemeral: true
    }
}

module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
            .setName('resume')
            .setDescription('Unpauses the music')
            .setDescriptionLocalizations({
                it: "Fa riprendere la musica se messo in pausa"
            }),
        execute: async(interaction) => {
            await interaction.deferReply({ephemeral:true});
            const reply = await esegui(interaction.member);
            return await interaction.editReply(reply);
        },

        aliases: ['resume', 'continue', 'unpause'],

        executeMsg: async (messaggio, args) => {
            const reply = await esegui(messaggio.member);
            return await messaggio.channel.send(reply);
        },

        example: '`-resume`',
        description:  'Unpauses the music',
    })
}