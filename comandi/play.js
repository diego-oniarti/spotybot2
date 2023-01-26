const { SlashCommandBuilder, EmbedBuilder, discordSort, VoiceChannel } = require('discord.js');
const Discord = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const Comando = require('../js/comando');
const { Colori } = require('../js/colori');
const fs = require('node:fs');
const path = require('node:path');
const fetch = require('node-fetch');
require('dotenv').config();
const { servers } = require('../shared');
const { Server } = require('../js/server');

const play = require('play-dl');
const requisiti = require('../js/requisiti');

const youtubeKey = process.env.YOUTUBE_KEY;
const errors = {
    YouTubeVideoNotFound: 0,
    youTubeKeyExpired: 1,
    YouTubePlaylistNotFound: 2,
    YouTubeTitleNotFound: 3,
    SpotifyIdNotFound: 4
}

let spotifyToken;

const getSpotifyToken = async ()=>{
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
        },
        body: params,
    });
    const data = await res.json();

    spotifyToken = data.access_token;
    return data.access_token;
}

const fineCanzone = (server,channel)=>{
    return async ()=>{
        if (server.corrente)
            server.pastSongs.push(server.corrente);
        server.audioResource = null;

        const connection = Discord.getVoiceConnection(server.guild.id);
        const voiceChannelId = connection.joinConfig.channelId;
        const voiceChannel = await server.guild.channels.fetch(voiceChannelId);

        if (server.queue.length>0 && voiceChannel.members.size>1){
            suona(server,channel);
        } else {
            server.isPlaying=false;
            server.audioResource = undefined;
            if (connection)
                connection.destroy();
            server.timeout = setTimeout(()=>{
                servers.delete(server.guild.id);
            },60000)
        }
    }
}
const erroreCanzone = (server,channel)=>{
    return (error)=>{
        console.error(error);
        return fineCanzone(server,channel);
    }
}

const suona = async (server, channel) => {
    let connection = Discord.getVoiceConnection(server.guild.id);

    const canzone = server.queue.shift();
    server.corrente = canzone;

    //const stream = ytdl(canzone.link, {filter:'audioonly'});
    const stream = await play.stream(canzone.link);

    const player = Discord.createAudioPlayer();
    const resource = Discord.createAudioResource(stream.stream, {
        inputType: stream.type
    });

    server.audioResource = resource;

    player.play(resource);
    connection.subscribe(player);
    server.isPlaying=true;
    try{
        channel.send({
            embeds: [
                new EmbedBuilder()
                .setTitle('Now Playing')
                .setDescription(`__[${canzone.titolo}](${canzone.link})__`)
                .setColor(Colori.default)
            ]
        });
    } catch (error) {
        console.error(error);
    }

    player.on(Discord.AudioPlayerStatus.Idle,
        fineCanzone(server,channel)
    );
    player.on('error',
        erroreCanzone(server,channel)
    );
}

/*questi metodi devono ritornare una canzone o lista di oggetti Canzone*/
/* canzone: {link, titolo, file} */

const ricercaTitolo = async (song)=>{
    let pagina = await fetch(encodeURI(`https://www.youtube.com/results?search_query=${song}`))
    try{
        var html = await pagina.text();
    }catch(error){
        console.error(error);
        throw errors.YouTubeTitleNotFound;
    }
    token = html.match(/\"videoId\"\:\"(.{1,12})\"/)[1];
    if (!token)
        throw errors.YouTubeTitleNotFound;
    return trovaCanzoneYT(token);
}


const parseSpotify = async(res)=>{
    if (res.status == 400 && res.error.status=='invalid id'){
        throw errors.SpotifyIdNotFound;
    }
    if (res.error) {
        console.log(res.error);
        throw res.error;
    }
    return await res.json();
}


const trackToTitle = (track)=>{
    const ricerca = [track.name];
    for (let artista of track.artists){
        ricerca.push(artista.name)
    }

    return ricerca.join(' ');
}

const spotifyTrack = async (id)=>{
    const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`,{
        headers: {
            'Authorization': `Bearer ${spotifyToken}`
        }
    });
    if (res.status == 401 && res.error.message=='The access token expired'){
        getSpotifyToken();
        return (spotifyTrack(id));
    }
    const data = await parseSpotify(res);

    return trackToTitle(data);
}

const spotifyAlbum = async (id)=>{
    const iteraLink = async (link)=>{
        const res = await fetch(link,{
            headers: {
                'Authorization': `Bearer ${spotifyToken}`
            }
        });
        if (res.status == 401 && res.error.message=='The access token expired'){
            getSpotifyToken();
            return (iteraLink(link));
        }
        const data = await parseSpotify(res);
    
        const titoli = [];
        for (let track of data.items){
            titoli.push(trackToTitle(track));
        }
        if (data.next){
            titoli.push(... (await (iteraLink(data.next) )));
        }

        return titoli;
    }

    return await iteraLink(`https://api.spotify.com/v1/albums/${id}/tracks?limit=50`);
}

const spotifyArtist = async (id) =>{
    const res = await fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=IT`,{
        headers: {
            'Authorization': `Bearer ${spotifyToken}`
        }
    });
    if (res.status == 401 && res.error.message=='The access token expired'){
        getSpotifyToken();
        return (spotifyArtist(id));
    }
    const data = await parseSpotify(res);

    const titoli = [];
    for (let track of data.tracks){
        titoli.push(trackToTitle(track));
    }

    return titoli;
}

const spotifyPlaylist = async (id) =>{
    const iteraLink = async (link)=>{
        const res = await fetch(link,{
            headers: {
                'Authorization': `Bearer ${spotifyToken}`
            }
        });
        if (res.status == 401 && res.error.message=='The access token expired'){
            getSpotifyToken();
            return (iteraLink(link));
        }
        const data = await parseSpotify(res);
    
        const titoli = [];
        for (let item of data.items){
            titoli.push(trackToTitle(item.track));
        }
        if (data.next){
            titoli.push(... (await (iteraLink(data.next) )));
        }

        return titoli;
    }

    return await iteraLink(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=50&market=IT`);
}


const trovaLinkSpotify = async(id, resource)=>{
    const titoli = [];
    if (!spotifyToken){
        await getSpotifyToken();
    }

    switch (resource){
        case 'track':
            titoli.push(await spotifyTrack(id));
            break;
        case 'album':
            titoli.push(... (await ( spotifyAlbum(id))));
            break;
        case 'artist':
            titoli.push(... (await ( spotifyArtist(id))));
            break;
        case 'playlist':
            titoli.push(... (await ( spotifyPlaylist(id))));
            break;
    }

    const canzoni = await Promise.all(
        titoli.map(titolo=>ricercaTitolo(titolo))
    );

    return canzoni;
}

const trovaListaYT = async (videoId, listId)=>{
    const ret = [];
    let pageToken;
    do {
        var hasNextPage = false;
        const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=5${pageToken?`&pageToken=${pageToken}`:''}&playlistId=${listId}&key=${youtubeKey}`);

        if (res.ok){
            const snippet = await res.json();

            if (snippet.nextPageToken){
                pageToken = snippet.nextPageToken;
                hasNextPage=true;
            }

            const items = snippet.items;
            if (!items){
                throw new Error(errors.YouTubePlaylistNotFound);
            }
            ret.push(...items.map(item=>{
                return {
                    link: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
                    titolo: item.snippet.title,
                    file: false
                }
            }));
        }else{
            throw new Error(errors.youTubeKeyExpired);
        }
    }while(hasNextPage);
    return ret;
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
        return {
            link: `https://www.youtube.com/watch?v=${item.id}`,
            titolo: item.snippet.title,
            file: false
        };
    }else{
        throw new Error(errors.youTubeKeyExpired);
    }
}

//deve ritornare un lista di canzoni
const trovaCanzoni = async (song)=>{
    if (song.match(/^https:\/\/youtu\.be\/.{11}$|^https:\/\/(www\.)?youtube\.com\/watch\?v=.{11}$/)){
        const match = song.match(/^https:\/\/youtu\.be\/(?<videoId>.{11})$|^https:\/\/(www\.)?youtube\.com\/watch\?v=(?<videoId2>.{11})$/);
        const videoId = match.groups.videoId || match.groups.videoId2;
        return [await trovaCanzoneYT(videoId)];
    }
    // https://www.youtube.com/watch?v=QN1odfjtMoo&list=PLG7bQTXLuEouQFSnPUY6mFuJRf7ULbZbo
    // https://youtube.com/playlist?list=PLvwkDL8hMpWr2hyMgQwj9wHQINqwpTqWc
    if (song.match(/^https:\/\/(www\.)?youtube\.com\/watch\?v=.{11}&list=.*$|^https:\/\/(www\.)?youtube\.com\/playlist\?list=.{34}$/)){
        const match = song.match(/^https:\/\/(www\.)?youtube\.com\/watch\?v=(?<videoId>.{11})&list=(?<listId>.*)$|^https:\/\/(www\.)?youtube.com\/playlist\?list=(?<listId2>.{34})$/);
        const videoId = match.groups.videoId;
        const listId = match.groups.listId || match.groups.listId2;
        return await trovaListaYT(videoId, listId);
    }
    if (song.match(/^https:\/\/open\.spotify\.com\/(track|album|artist|playlist)\/.{22}/)){
        const match = song.match(/https:\/\/open\.spotify\.com\/(?<resource>track|album|artist|playlist)\/(?<id>.{22})/);
        const id =  match.groups.id;
        const resource = match.groups.resource;
        return await trovaLinkSpotify(id, resource);
    }
    return [await ricercaTitolo(song)];
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

const comando = async (song,position, member,channel)=>{
    const sameVCError = requisiti.sameVoiceChannel(member);
    if (sameVCError)
        return sameVCError;

    const guild = member.guild;
    const voiceChannel = member.voice.channel;
    let connection = Discord.getVoiceConnection(guild.id)

    // cerca la canzone (o le canzoni) e ritorna un messaggio d'errore se non si trova nulla
    try {
        var canzoni = await trovaCanzoni(song);
    }catch(error){
        let errorMsg;
        switch (error.message){
            case errors.YouTubeVideoNotFound:
                errorMsg = "The link you've provided doesn't seem to bring anywhere :o";
                break;
            case errors.youTubeKeyExpired:
                errorMsg = 'We ran out of youtube quotas ¯\_(:P)_/¯';
                break;
            case errors.YouTubePlaylistNotFound:
                errorMsg = "The link you've provided doesn't seem to bring anywhere :o"
                break;
            case errors.SpotifyIdNotFound:
                errorMsg = "The link you've provided doesn't seem to bring anywhere :o";
                break;
        }
        if (!errorMsg)
            throw error;
        return {
            embeds: [
                new EmbedBuilder()
                .setTitle('Error!')
                .setDescription(errorMsg)
                .setColor(Colori.error)
            ]
        }
    }


    // se il bot non è in un canale vocale, entra e saluta
    let salutando;
    if (!connection){
        connection = Discord.joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator
        });
        salutando = saluta(connection);
    }

    if (!servers.has(guild.id))
        servers.set(guild.id, new Server(guild));
    const server = servers.get(guild.id);
    if (server.timeout){
        clearTimeout(server.timeout);
        server.timeout=undefined;
    }

    const posizione = ((!position || position==-1) && position!=0)? server.queue.length : Math.min(Math.max(position,0), server.queue.length);
    server.queue = [...server.queue.slice(0,posizione), ...canzoni, ...server.queue.slice(posizione)];

    // se il server non sta suonando nulla, inizia a suonare, altrimenti accoda e basta
    if (!server.isPlaying){
        await salutando;
        await suona(server, channel);
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

module.exports = {
    comando: new Comando({
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
            const song = interaction.options.getString("song").trim();
            const position = interaction.options.getInteger("position")-1;

            await interaction.deferReply({ephemeral:false});

            const response = await comando(song, position, interaction.member,interaction.channel);
            response.ephemeral = true;
            return await interaction.editReply(response);
        },


        aliases: ['play', 'p'],
        executeMsg: async (message,args)=>{
            const canzone = args.join(' ');

            if (!canzone)
                return message.channel.send({embeds:[new EmbedBuilder().setTitle('Error!').setDescription("No song specified.\nUse the `help` command to know more").setColor(Colori.error)]});

    //        return message.channel.send({embeds:[new EmbedBuilder().setTitle('Error!').setDescription("No song specified.\nUse the `help` command to know more").setColor(Colori.error)]});

            const response = await comando(canzone, undefined, message.member,message.channel);
            return await message.channel.send(response);
        },

        example: '`-play` `song` `[postition]`',
        description: 'Plays a song or adds it to the queue.',
        parameters: '`song`: the title or the link of the song/playlist you want to be played (supports both YouTube and Spotify)\n`[position]: The position in the queue where to insert the song. If not specified, the song will be inserted at the end of the queue`'
    }),
    fineCanzone: fineCanzone,
    suona: suona
}