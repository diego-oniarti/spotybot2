const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Colori } = require('../js/colori');
const Comando = require('../js/comando');
const requisiti = require('../js/requisiti');
const { servers } = require('../shared');

const esegui= async (volume, member)=>{
    const sameVCError = requisiti.sameVoiceChannel(member);
    if (sameVCError) return sameVCError;
    const playingError = requisiti.playing(member.guild);
    if (playingError) return playingError;

    const server = servers.get(member.guild.id);
    server.audioResource.volume.setVolume(volume/100);

    return {
        embeds:[
            new EmbedBuilder()
            .setTitle(`Volume set to ${volume}%`)
            .setColor(Colori.default)
        ],
        ephemeral: true
    }
}

module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
            .setName('volume')
            .setDescription('Sets the volume of the bot')
            .setDescriptionLocalizations({
                it: "Imposta il volume del bot"
            })
            .addIntegerOption(option=>
                option
                .setName("volume")
                .setNameLocalizations({
                    it: "volume"
                })
                .setDescription("Volume in percentage")
                .setDescriptionLocalizations({
                    it: "Volume in percentuale"
                })
                .setMinValue(0)
                .setMaxValue(100)
                .setRequired(true)
        ),
        execute: async(interaction) => {
            const volume = interaction.options.getInteger("volume");
            await interaction.deferReply({ephemeral:false});
            const reply = await esegui(volume, interaction.member);
            return await interaction.editReply(reply);
        },

        aliases: ['volume', 'vol'],

        executeMsg: async (messaggio, args) => {
            const volume = parseInt(args[0]);
            
            if (isNaN(volume) || volume<0 || volume>10000)
                return await messaggio.channel.send({
                    embeds: [
                        new EmbedBuilder()
                        .setTitle(":warning: Error")
                        .setDescription("Wrong parameters.\nUse the `help` command to get more instructions.")
                        .setColor(Colori.error)
                    ]
                })

            const reply = await esegui(volume, messaggio.member);
            return await messaggio.channel.send(reply);
        },

        example: '`-volume` `value`',
        description:  'Sets the volume of the bot',
        parameters: '`value`: an integer value between 0 and 100 representing the desired volume'
    })
}
