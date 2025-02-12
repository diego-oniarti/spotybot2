const Discord = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const { Colori } = require('./colori');
const { servers, db_ref, save_db } = require('../shared');
const path = require('node:path');
const { spawn } = require('child_process');
const fs = require("node:fs");
require("dotenv").config();

const SONGS_PATH = process.env.SONGS_PATH;

const Modes = {
    none: 1,
    loopSong: 2,
    loopQueue: 3,
    radio: 4,
    loopQueueFromNow: 5
}

/**
 * youtube_id -> promise to download path
 * @type {Map<string, Promise<string>>}
 */
const downloading = new Map();

/**
 * Performs the command 
 * ```
 * yt-dlp -x --audio-format opus https://www.youtube.com/watch?v=Yi5r5l8OSZs -o Yi5r5l8OSZs
 * ```
 * and returns the path to the song.
 *
 * @param {string} yt_id - The yourube ID of the song to download
 * @returns {Promise<string>} The path to the downloaded song
 */
function download_song(yt_id) {
    // se la canzone sta già venendo scaricata per un altro motivo, usa la stessa promise
    if (downloading.has(yt_id)) {
        console.log("Already downloading (1)");
        return downloading.get(yt_id);
    }

    console.log("Starting download");
    const ret = new Promise((resolve, err)=>{
        const child = spawn("yt-dlp", [
            "-x",
            "--audio-format", 
            "opus", 
            `https://www.youtube.com/watch?v=${yt_id}`,
            "-o", 
            path.join(__dirname,SONGS_PATH,yt_id),
            "-n",
        ]);

        let output = '';
        let error = '';
        let location = '';

        child.stdout.on('data', data=>{
            output += data.toString();
            const m = data.toString().match(/\[ExtractAudio\] Destination: (.+)/);
            if (m) {
                location = m[1];
                console.log("found location: "+location);
            }
        });
        child.stderr.on('data', data=>{
            error += data.toString();
        });
        child.on('close', code=>{
            downloading.delete(yt_id);
            if (code==0) {
                resolve(location);
            }else{
                err(error);
            }
        });
        child.on('error', e=>{
            downloading.delete(yt_id);
            console.log("Error in song download");
            console.log(error);
            console.log(e);
            err(e);
        });
    });

    downloading.set(yt_id, ret);
    return ret;
}

/**
 * Checks if the song folder exceeded 5GB. 
 * If it did, removes old songs until the folder is down to 2.5GB.
 * Feature not already tested
 */
async function check_cleanup() {
    const db = await db_ref;
    const total_size_query = db.exec("SELECT sum(size) FROM songs");
    const total_size = total_size_query[0].values[0][0];
    if (total_size < 5242880) return;
    console.log("10GB exceeded");

    const to_be_removed = [];
    let size = total_size;
    const ordered_query = db.prepare("SELECT * FROM songs ORDER BY last_used");
    while (ordered_query.step() && size > 2621440) {
        const row = ordered_query.getAsObject();
        size -= parseInt(row.size);
        to_be_removed.push({
            "location": row.location,
            "id": row.song_id,
        });
    }
    ordered_query.free()

    const remove_query = db.prepare("DELETE FROM songs WHERE song_id=?");
    for (let song of to_be_removed) {
        console.log(`Removing: ${song.id}`);
        fs.rmSync(song.location);
        remove_query.run([song.id]);
    }
    remove_query.free();
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

    // If you're the second to ask for a song, the other is gonna write on the db
    if (downloading.has(yt_id)) {
	console.log("Already downloading (1)");
	return await downloading.get(yt_id);
    }

    const location = await download_song(yt_id);
    const stat = fs.statSync(location);
    const size = Math.ceil(stat.size/1024);
    const upload_statement = db.prepare("INSERT INTO songs (song_id, location, size) VALUES (?, ?, ?)");
    upload_statement.run([yt_id, location, size]);
    upload_statement.free();
    save_db();

    check_cleanup();
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

        const volume = this.resource?.volume?.volume || 0.5;
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

        const networkStateChangeHandler = (_, newNetworkState) => {
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

        // experimental
        if (this.queue.length>0) {
            const next_song = this.queue[0];
            get_song(next_song.yt_id);
        }
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
