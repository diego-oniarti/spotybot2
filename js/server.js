const Discord = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { OpusEncoder } = require('@discordjs/opus');
const { stream } = require('play-dl');
const { EmbedBuilder } = require('discord.js');
const { Colori } = require('./colori');

const Modes = {
    none: 1,
    loopSong: 2,
    loopQueue: 3,
    radio: 4,
    loopQueueFromNow: 5
}

class Server {
    constructor(guild){
        this.guild = guild;
        this.queue = [];
        this.mode = Modes.none;
        this.radioTrack1=undefined;
        this.radioTrack2=undefined;
        this.isPlaying=false;

        this.audioResource = undefined;

        this.corrente = undefined;
        this.pastSongs = [];
    }
    async suona(member) {
	this.is_playing = true;
	let connection = Discord.getVoiceConnection(this.guild.id);
	const canzone = this.queue.shift();
	this.corrente = canzone;
	const yt_stream = await stream(canzone.link, {
	    discordPlayerCompatibility: true,
	});
	const resource = Discord.createAudioResource(yt_stream.stream, {
	    inlineVolume: true,
	    inputType: yt_stream.type
	});
	const player = Discord.createAudioPlayer({
	    behaviors: {
		noSubscriber: Discord.NoSubscriberBehavior.Play,
	    }
	});
	this.audioPlayer = player;
	this.audioResource = resource;
	
	if (!connection) {
	    const channel = member.voice.channel;
	    connection = Discord.joinVoiceChannel({
		channelId: channel.id,
		guildId: member.guild.id,
		adapterCreator: member.guild.voiceAdapterCreator
	    });
	}

	player.play(resource);
	connection.subscribe(player);

	const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
            const newUdp = Reflect.get(newNetworkState, 'udp');
            clearInterval(newUdp?.keepAliveInterval);
	}
	
	player.on('stateChange', (oldState, newState)=>{
            Reflect.get(oldState, 'networking')?.off('stateChange', networkStateChangeHandler);
            Reflect.get(newState, 'networking')?.on('stateChange', networkStateChangeHandler);
	});
	
	player.on(Discord.AudioPlayerStatus.Idle, ()=>{
            this.fine_canzone();
	});
	player.on('error',(err)=>{
            console.log("ERROR")
            console.log(err);
            this.errore_canzone();
	});

	this.text_channel.send({
	    embeds: [
		new EmbedBuilder()
		    .setTitle("Now Playing")
		    .setColor(Colori.default)
		    .setDescription(`__[${canzone.titolo}](${canzone.link})__`)
	    ]
	});
    }
    async fine_canzone() {
	switch (this.mode) {
	case Modes.none:
	case Modes.loopQueue:
	    this.pastSongs.push(this.corrente);
	    break;
	case Modes.loopQueueFromNow:
	    this.queue.push(this.corrente);
	    break;
	case Modes.loopSong:
	    this.queue.unshift(this.corrente);
	    break;
	}

	this.audioPlayer?.removeAllListeners();
	this.audioPlayer?.stop(true);
	this.audioResource=null;

	// se il bot è in un canale e ci sono ancora canzoni incoda suonale
	const connection = Discord.getVoiceConnection(this.guild.id);
        if (connection) {
            const voiceChannelId = connection.joinConfig.channelId;
            const voiceChannel = await this.guild.channels.fetch(voiceChannelId);

            if (this.queue.length>0 && voiceChannel.members.size>1) {
		this.suona();
		return;
            }
        }

        // lascia il canale
	connection?.disconnect();
        this.isPlaying=false;
        this.audioResource = undefined;
        this.pastSongs.push(...this.queue);
        this.mode = Modes.none;zz
    }
    errore_canzone() {
	this.fine_canzone();
    }
}

module.exports = {
    Server: Server, 
    Modes: Modes
};
