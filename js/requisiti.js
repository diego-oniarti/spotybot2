anyVoiceChannel = (member)=>{
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

sameVoiceChannel = (member)=>{
    const anyVCError = anyVoiceChannel(member)
    if (anyVCError){
        return anyVCError;
    }

    const connection = Discord.getVoiceConnection(member.guild.id);
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

module.exports = {
    anyVoiceChannel: anyVoiceChannel,
    sameVoiceChannel: sameVoiceChannel
}