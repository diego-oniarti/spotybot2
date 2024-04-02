require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Comando = require('../js/comando');
const { Colori } = require('../js/colori');
const { servers } = require('../shared');
const requisiti = require('../js/requisiti');

function comando(member) {
    const VCError = requisiti.playingSameVC(member);
    if (VCError) return {
        msg: VCError,
        error: true
    };

    const server = servers.get(member.guild.id);
    let volume = 1;
    const interval = setInterval(()=>{
        if (volume>10) {
            server.audioResource.volume.setVolume(1);
            clearInterval(interval);
            return;
        }
        server.audioResource.volume.setVolume(volume);
    }, 250);
    
    return {
        error: false,
        msg: {
            embeds: [
                new EmbedBuilder()
                .setColor(Colori.default)
                .setTitle("Earrape started")
            ]
        }
    }
}

module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
        .setName('earrape')
        .setDescription('Slowly ramps up the audio to an uncomfortable amount')
        .setDescriptionLocalizations({
            it: "Alza lentamente il volume fino a un livello molto alto"
        }),
        execute: (interaction) => {
            const reply = comando(interaction.member);
            interaction.reply(reply.msg);
        },

        aliases: ['earrape'],
        executeMsg: async (message)=>{
            const reply = comando(message.member);
            if (reply.error) {
                message.channel.send(reply.msg);
            }
        },

        example: '`-earrape`',
        description: 'Slowly ramps up the audio to an uncomfortable amount',
    }),
}
