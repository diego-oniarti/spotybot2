const Discord = require('@discordjs/voice');
const ytdl = require('ytdl-core');

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
	this.isPlaying = true;
	let connection = Discord.getVoiceConnection(this.guild.id);
	const canzone = this.queue.shift();
	this.corrente = canzone;
	const stram = ytdl(canzone.link, {
	    filter:'audioonly',
	    quality:'highestaudio',
	    requestOptions: {
		headers: {
		    cookie: ""
		}
	    }
	});
	const resource = Discord.createAudioRespirce(stram, {
	    inlineVolume: true,
	});
	const player = Discord.createAudioPlayer({
	    behaviors: {
		noSubscriber: Discord.NoSubscriberBehaviour.Play,
	    }
	});

	this.audioResource = resource;
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
	
	player.on(Discord.AudioPlayerStatus.Idle, (a)=>{
            this.fine_canzone();
	});
	player.on('error',(err)=>{
            console.log("ERROR")
            console.log(err);
            this.errore_canzone();
	});
    }
    fine_canzone() {

    }
    errore_canzone() {

    }
}

module.exports = {
    Server: Server, 
    Modes: Modes
};
