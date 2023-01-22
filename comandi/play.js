const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Discord = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const Comando = require('../js/comando');
const { Colori } = require('../js/colori');
const fs = require('node:fs');
const path = require('node:path');
const fetch = require('node-fetch');
const colori = require('../js/colori');
require('dotenv').config();
const {servers} = require('../index');
const { Server } = require('../js/server');

const youtubeKey = process.env.YOUTUBE_KEY;
const errors = {
    YouTubeVideoNotFound: 0,
    youTubeKeyExpired: 1
}

/*questi metodi devono ritornare una lista di oggetti Canzone*/
/* conzone: {link, titolo, file} */



const fineCanzone = (server)=>{
    return ()=>{
        if (server.queue.length>0)
            suona(server);
        else{
            server.isPlaying=false;
            const connection = Discord.getVoiceConnection(server.guild.id);
            connection.destroy();
        }
    }
}
const erroreCanzone = (server)=>{
    return ()=>{
        server.isPlaying = false;
        connection.destroy();
    }
    
}


const suona = (server) => {
    let connection = Discord.getVoiceConnection(server.guild.id);

    const canzone = server.queue.shift();
    const stream = ytdl(canzone.link, {filter:'audioonly'});
    const player = Discord.createAudioPlayer();
    const resource = Discord.createAudioResource(stream);

    player.play(resource);
    connection.subscribe(player);
    server.isPlaying=true;

    player.on(Discord.AudioPlayerStatus.Idle,
        fineCanzone(server)
    );
    player.on(Discord.AudioPlayerError,
        erroreCanzone(server)
    );
}


const ricercaTitolo = async (song)=>{

}

const trovaLinkSpotify = async(id, resource)=>{

}

const trovaListaYT = async (videoId, listId)=>{

}

const trovaCanzoneYT = async (videoId)=>{
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeKey}`);

    if (res.ok){
        const snippet = await res.json();
        const item = snippet.items[0];
        if (!item){
            throw new Error(errors.YouTubeVideoNotFound);
        }
        console.log(item.snippet.title)
        return [
            {
                link: `https://www.youtube.com/watch?v=${item.id}`,
                titolo: item.snippet.title,
                file: false
            }
        ];
    }else{
        throw new Error(errors.youTubeKeyExpired);
    }
}

const trovaCanzoni = async (song)=>{
    if (song.match(/^https:\/\/youtu\.be\/.{11}$|^https:\/\/www\.youtube\.com\/watch\?v=.{11}$/)){
        const match = song.match(/^https:\/\/youtu\.be\/(?<videoId>.{11})$|^https:\/\/www\.youtube\.com\/watch\?v=(?<videoId2>.{11})$/);
        const videoId = match.groups.videoId || match.groups.videoId2;
        return await trovaCanzoneYT(videoId);
    }
    // https://www.youtube.com/watch?v=QN1odfjtMoo&list=PLG7bQTXLuEouQFSnPUY6mFuJRf7ULbZbo
    if (song.match(/^https:\/\/www\.youtube\.com\/watch\?v=.{11}&list=.*$/)){
        const match = song.match(/^https:\/\/www\.youtube\.com\/watch\?v=(?<videoId>.{11})&list=(?<listId>.*)$/);
        const videoId = match.groups.videoId || match.groups.videoId2;
        const listId = match.groups.videoId || match.groups.videoId2;
        return await trovaListaYT(videoId, listId);
    }
    if (song.match(/^https:\/\/open\.spotify\.com\/(track|album|artist|playlist)\/.{22}/)){
        const match = song.match(/https:\/\/open\.spotify\.com\/(?<resource>track|album|artist|playlist)\/(?<id>.{22})/).groups.id;
        const id =  match.id;
        const resource = match.resource;
        return await trovaLinkSpotify(id, resource);
    }
    return await ricercaTitolo(song);
}

const saluta = async (connection)=>{
    const saluti = fs.readdirSync(path.join(__dirname,'..','saluti')).map(file=>path.join(__dirname,'..','saluti',file));

    const saluto = Discord.createAudioResource(saluti[Math.floor(Math.random()*saluti.length)]);
    const player = Discord.createAudioPlayer();
    player.play(saluto);
    connection.subscribe(player);
    
    let finisci;
    let finito = new Promise((res)=>{
        finisci = res;
    });

    player.on(Discord.AudioPlayerStatus.Idle, ()=>{
        finisci();
    })

    await finito;
}

const comando = async (song,position, member)=>{
    // controlla che l'utente sia in un canale vocale visibile 
    if (!member.voice.channel)
        return {
            embeds: [
                new EmbedBuilder()
                .setTitle('Error!')
                .setDescription("Where are you?\nI can't see you :eyes:")
                .setColor(Colori.error)
            ]
        }

    const guild = member.guild;
    const voiceChannel = member.voice.channel;

    let connection = Discord.getVoiceConnection(guild.id)
    // se il bot è già in un altro canale vocale rispondi con errore
    if (connection && (connection.joinConfig.channelId != voiceChannel.id))
        return {
            embeds: [
                new EmbedBuilder()
                .setTitle('Error!')
                .setDescription("I'm already in another voice channel")
                .setColor(colori.error)
            ]
        }


    // cerca la canzone (o le canzoni) e ritorna un messaggio d'errore se non si trova nulla
    let canzoni;
    try {
        canzoni = await trovaCanzoni(song);
    }catch(error){
        switch (error.message){
            case errors.YouTubeVideoNotFound:
                return {
                    embeds: [
                        new EmbedBuilder()
                        .setTitle('Error!')
                        .setDescription("The link you've provided doesn't seem to bring anywhere :o")
                        .setColor(colori.error)
                    ]
                }
                break;
            case errors.youTubeKeyExpired:
                return {
                    embeds: [
                        new EmbedBuilder()
                        .setTitle('Error!')
                        .setDescription('We ran out of youtube quotas ¯\_(:P)_/¯')
                        .setColor(colori.error)
                    ]
                }
                break;
        }
    }


    // se il bot non è in un canale vocale, entra e saluta
    if (!connection){
        connection = Discord.joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator
        });
        await saluta(connection);
    }

    if (!servers.has(guild.id))
        servers.set(guild.id, new Server(guild));
    const server = servers.get(guild.id);
    
    const posizione = (!position || position==-1)? server.queue.length : Math.min(Math.max(position,0), server.queue.length);
    server.queue = [...server.queue.slice(0,posizione), ...canzoni, ...server.queue.slice(posizione)];

    // se il server non sta suonando nulla, inizia a suonare, altrimenti accoda e basta
    if (!server.isPlaying){
        suona(server);
    }

    if (canzoni.length == 1)
        return {
            embeds: [
                new EmbedBuilder()
                .setTitle(`Queued at position ${posizione+1}`)
                .setDescription(`__[${canzoni[0].titolo}](${canzoni[0].link})__`)
                .setColor(Colori.default)
            ]
        };
    else
        return {
            embeds: [
                new EmbedBuilder()
                .setTitle(`Queued ${canzoni.length} songs from position ${posizione+1}`)
                .setColor(Colori.default)
            ]
        };
}

module.exports = new Comando({
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Plays a song or adds it to the queue')
        .setDescriptionLocalizations({
            it: "Riproduce una canzone o la aggiunge alla coda"
        })
        .addStringOption(option=>
            option
            .setName("song")
            .setNameLocalizations({
                it: "canzone"
            })
            .setDescription("YouTube link / Spotify link / YouTube query")
            .setDescriptionLocalizations({
                it: "link di YouTube / link di Spotify / ricerca su YouTube"
            })
            .setRequired(true)
        )
        .addIntegerOption(option=>
            option
            .setName("position")
            .setNameLocalizations({
                it: "posizione"
            })
            .setDescription("Position in the queue where to add the song")
            .setDescriptionLocalizations({
                it: "Posizione in coda dove inserire la canzone"
            })
            .setMinValue(1)
            .setRequired(false)
        ),
	execute: async (interaction) => {
        const song = interaction.options.getString("song");
        const position = interaction.options.getInteger("position")-1;

        const response = await comando(song, position, interaction.member);
        response.ephemeral = true;
        await interaction.deferReply({ephemeral:false});
        return await interaction.editReply(response);
	},


    aliases: ['play', 'p'],
    executeMsg: async (message,args)=>{
        const canzone = args[0];
        const posizione = args[1];

        if (!canzone)
            return message.channel.send({embeds:[new EmbedBuilder().setTitle('Error!').setDescription("No song specified.\nUse the `help` command to know more").setColor(colori.error)]});
        if (isNaN(parseInt(posizione)))
            return message.channel.send({embeds:[new EmbedBuilder().setTitle('Error!').setDescription("No song specified.\nUse the `help` command to know more").setColor(colori.error)]});

        const response = await comando(canzone, posizione-1, message.member)
        return await message.send(response);
    },

    example: '`-play` `song`\n-play `song` `[postition]`',
    description: 'Plays a song or adds it to the queue.',
    parameters: '`song`: the title or the link of the song/playlist you want to be played (supports both YouTube and Spotify)\n`[position]: The position in the queue where to insert the song. If not specified, the song will be inserted at the end of the queue`'
});