const { EmbedBuilder } = require('@discordjs/builders');
const Discord = require('@discordjs/voice');
const { Colori } = require('./colori');

function anyVoiceChannel(member) {
    if (!member.voice.channel)
        return {
            embeds: [
                new EmbedBuilder()
                .setTitle('Error!')
                .setDescription("Where are you?\nI can't see you :eyes:")
                .setColor(Colori.error)
            ]
        }
}

function sameVoiceChannel(member) {
    const anyVCError = anyVoiceChannel(member);
    if (anyVCError){
        return anyVCError;
    }

    const connection = Discord.getVoiceConnection(member.guild.id);
    const voiceChannel = member.voice.channel;
    if (connection && (connection.joinConfig.channelId != voiceChannel.id))
        return {
            embeds: [
                new EmbedBuilder()
                .setTitle('Error!')
                .setDescription("I'm already in another voice channel")
                .setColor(Colori.error)
            ]
        }
}

function playing(guild) {
    const connection = Discord.getVoiceConnection(guild.id);
    if (!connection)
        return {
            embeds: [
                new EmbedBuilder()
                .setTitle('Error!')
                .setDescription("I'm not in a voice channel")
                .setColor(Colori.error)
            ]
        }
}

module.exports = {
    anyVoiceChannel: anyVoiceChannel,
    sameVoiceChannel: sameVoiceChannel,
    playing: playing
}
