const Discord = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const { Colori } = require('./colori');
const { servers, db_ref, save_db } = require('../shared');
const path = require('node:path');
const { spawn } = require('child_process');
require("dotenv").config();

const SONGS_PATH = process.env.SONGS_PATH;

const Modes = {
    none: 1,
    loopSong: 2,
    loopQueue: 3,
    radio: 4,
    loopQueueFromNow: 5
}

/*
[youtube] Extracting URL: https://www.youtube.com/watch?v=Yi5r5l8OSZs
[youtube] Yi5r5l8OSZs: Downloading webpage
[youtube] Yi5r5l8OSZs: Downloading ios player API JSON
[youtube] Yi5r5l8OSZs: Downloading web creator player API JSON
[youtube] Yi5r5l8OSZs: Downloading m3u8 information
[info] Yi5r5l8OSZs: Downloading 1 format(s): 251
[download] Destination: test/Yi5r5l8OSZs
[download] 100% of    2.72MiB in 00:00:00 at 3.27MiB/s
[ExtractAudio] Destination: test/Yi5r5l8OSZs.opus
Deleting original file test/Yi5r5l8OSZs (pass -k to keep)
*/

// yt-dlp -x --audio-format opus https://www.youtube.com/watch?v=Yi5r5l8OSZs -o Yi5r5l8OSZs
function download_song(yt_id) {
    return new Promise((resolve, err)=>{
        const child = spawn("yt-dlp", [
            "-x",
            "--audio-format", 
            "opus", 
            `https://www.youtube.com/watch?v=${yt_id}`,
            "-o", 
            path.join(__dirname,SONGS_PATH,yt_id)
        ]);

        let output = '';
        let error = '';
        let location = '';

        child.stdout.on('data', data=>{
            output += data.toString();
            const m = output.toString().match(/\[ExtractAudio\] Destination: (.+)/);
            if (m) {
                location = m[1];
                console.log("found location: "+location);
            }
        });
        child.stderr.on('data', data=>{
            error += data.toString();
        });
        child.on('close', code=>{
            if (code==0) {
                resolve(location);
            }else{
                error(error);
            }
        });
        child.on('error', e=>{
            console.log("Error in song download");
            console.log(error);
            console.log(e);
            error(e);
        });
    });
}

/**
 * Gets the location of a song file. If the song is not saved already it is downloaded first and added to the database.
 * 
 * @param {string} yt_id - The 11 characters long youtube id of the video
 * @returns {Promise<string>} The absolute path to the song's location
 */
async function get_song(yt_id) {
    const db = await db_ref;
    const song_query = db.prepare("SELECT * FROM songs WHERE song_id=?");
    song_query.bind([yt_id]);
    if (song_query.step()) {
        const canzone = song_query.getAsObject();
        const song_path = canzone.location;
        const update_query = db.prepare("UPDATE songs SET last_used=current_timestamp WHERE song_id=?");
        update_query.run([yt_id]);

        update_query.free();
        song_query.free();
        save_db();
        return song_path;
    }

    const location = await download_song(yt_id);
    const upload_statement = db.prepare("INSERT INTO songs (song_id, location) VALUES (?, ?)");
    upload_statement.run([yt_id, location]);
    upload_statement.free();
    save_db();
    return location;
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

	const song_path = await get_song(canzone.yt_id);
	const resource = Discord.createAudioResource(song_path, {
	    inlineVolume: true,
	});
	const player = Discord.createAudioPlayer({
	    behaviors: {
		noSubscriber: Discord.NoSubscriberBehavior.Play,
	    }
	});
	const volume = this.resource?.volume?.volume || 0.1;

	resource.volume?.setVolume(volume);
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
	console.log("leaving channel");
	connection?.disconnect();
	connection?.destroy();
	this.isPlaying=false;
	this.audioResource = undefined;
	this.pastSongs.push(...this.queue);
	this.mode = Modes.none;

	servers.delete(this.guild.id);
    }
    errore_canzone() {
	this.fine_canzone();
    }
}

module.exports = {
    Server: Server, 
    Modes: Modes
};
