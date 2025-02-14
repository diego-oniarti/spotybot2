const Discord = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const { Colori } = require('./colori');
const { servers } = require('../shared');
require("dotenv").config();
const { PassThrough, Transform } = require('stream');
const axios = require('axios');

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
        this.isPlaying=false;

        this.audioResource = undefined;

        this.corrente = undefined;
        this.pastSongs = [];
    }

    async suona(radio_id, member) {
        this.isPlaying = true;
        let connection = Discord.getVoiceConnection(this.guild.id);

        const player = Discord.createAudioPlayer({
            behaviors: {
                noSubscriber: Discord.NoSubscriberBehavior.Play,
            }
        });

        const resource = Discord.createAudioResource(`http://radio.garden/api/ara/content/listen/${radio_id}/channel.mp3`);
        player.play(resource);

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

        connection.subscribe(player);

        player.on(Discord.AudioPlayerStatus.Idle, ()=>{
            this.leave()
        });

        player.on('error',(err)=>{
            console.log("ERROR")
            console.log(err);
            this.errore_canzone();
        });
    }

    async fine_canzone() {
        return;
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

    leave() {
        this.audioPlayer?.stop();
        const connection = Discord.getVoiceConnection(this.guild.id);
        if (connection) connection.destroy();
        servers.delete(this.guild.id);
    }

    errore_canzone() {
        this.leave();
    }
}

module.exports = {
    Server: Server, 
    Modes: Modes,
};
