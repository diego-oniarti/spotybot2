const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Discord = require('@discordjs/voice');
const Comando = require('../js/comando');
const { Colori } = require('../js/colori');
const fs = require('node:fs');
const path = require('node:path');
const fetch = require('node-fetch');
require('dotenv').config();
const { servers } = require('../shared');
const { Server } = require('../js/server');
const cliProgress = require('cli-progress');
const querystring = require('node:querystring');
const play = require('play-dl');
const requisiti = require('../js/requisiti');
const EventEmitter = require('node:events');

const barStile = (nome)=>{
    if (nome)
        nome+=' ';
    else
        nome=''
    return {
        format: `${nome}|{bar}| {percentage}% | DURATION: {duration} | ETA: {eta}s | {value}/{total}`,
    }
}

const youtubeKey = process.env.YOUTUBE_KEY;
const errors = {
    YouTubeVideoNotFound: 0,
    YouTubeKeyExpired: 1,
    YouTubePlaylistNotFound: 2,
    YouTubeTitleNotFound: 3,
    SpotifyIdNotFound: 4,
    InvalidSpotifyId: 5,
    YouTubeSearchNotFound: 6
}

let spotifyToken;

// refresha il token di spotify (scade dopo un'ora) che serve per ogni chiamata alle API di spotify
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
    console.log(`new access token: ${data.access_token}`);
    return data.access_token;
}

// ritorna una funzione che detta il comportamento del bot quando finisce una canzone
const fineCanzone = (server,channel)=>{
    return async ()=>{
        // aggiunge la canzone appena finita alle pastSongs
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
            server.pastSongs.push(...server.queue);

            if (connection)
                connection.destroy();
            server.timeout = setTimeout(()=>{
                servers.delete(server.guild.id);
            },60000)
        }
    }
}

// se succede un errore, stampa il messaggio d'errore e passa alla prossima canzone
const erroreCanzone = (server,channel)=>{
    return (error)=>{
        console.error(error);
        return fineCanzone(server,channel);
    }
}

// inizia a suonare
const suona = async (server, channel, member) => {
    let connection = Discord.getVoiceConnection(server.guild.id);
    // se il bot non è in un canale vocale, entra e saluta
    let salutando;
    if (member){
        const voiceChannel = member.voice.channel;

        if (!connection){
            connection = Discord.joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: member.guild.id,
                adapterCreator: member.guild.voiceAdapterCreator
            });
            salutando = saluta(connection);
        }
    }

    const canzone = server.queue.shift();
    server.corrente = canzone;

    //const stream = ytdl(canzone.link, {filter:'audioonly'});
    try{
        var stream = await play.stream(canzone.link);
    }catch(error){
        console.error(`play-dl non trova '${canzone.titolo}' ${canzone.link}`);
        await (fineCanzone(server,channel)());
    }

    const player = Discord.createAudioPlayer();
    const resource = Discord.createAudioResource(stream.stream, {
        inputType: stream.type
    });

    server.audioResource = resource;

    await salutando; // tutta la parte precedente viene svolta durante il saluto
    player.play(resource);
    connection.subscribe(player);
    server.isPlaying=true;
    try{
        await channel.send({
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

const ricercaTitolo = async (song, server,position,emitter, suonare=true)=>{
    try{
        var pagina = await fetch(encodeURI(`https://www.youtube.com/results?search_query=${song}`));
    }catch(error){
        console.error(error);
        throw error;
    }

    try{
        var html = await pagina.text();
    }catch(error){
        console.error(error);
        throw errors.YouTubeTitleNotFound;
    }
    
    const match = html.match(/\"videoId\"\:\"(.{1,12})\"/);
    if (match)
        token = match[1];
    else{
        console.error(`Not found ${song}`);
        throw errors.YouTubeTitleNotFound;
    }
    if (!token)
        throw errors.YouTubeTitleNotFound;

    const canzone = trovaCanzoneYT(token, server,position,emitter, suonare);
    return canzone;
}

const parseSpotify = async(data)=>{
    if (data.error && data.error.status == 400 && data.error.message=='invalid id'){
        throw errors.InvalidSpotifyId;
    }
    if (data.error && data.error.status == 404){
        throw errors.SpotifyIdNotFound;
    }
    if (data.error) {
        console.error(data.error);
        throw data.error;
    }
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
    const data = await res.json();

    if (res.status == 401 && data.error.message=='The access token expired'){
        await getSpotifyToken();
        return (spotifyTrack(id));
    }
    await parseSpotify(data);

    return trackToTitle(data);
}

const spotifyAlbum = async (id)=>{
    const bar = new cliProgress.SingleBar(barStile('album-tracks'), cliProgress.Presets.shades_classic);
    let primo = true;

    const iteraLink = async (link)=>{
        const res = await fetch(link,{
            headers: {
                'Authorization': `Bearer ${spotifyToken}`
            }
        });
        const data = await res.json();

        if (res.status == 401 && data.error.message=='The access token expired'){
            await getSpotifyToken();
            return (iteraLink(link));
        }
        await parseSpotify(data);
    
        const titoli = [];
        if (primo){
            bar.start(data.total);
            primo = false;
        }
        for (let track of data.items){
            bar.increment();
            titoli.push(trackToTitle(track));
        }
        if (data.next){
            titoli.push(... (await (iteraLink(data.next) )));
        }

        return titoli;
    }

    const titoli = await iteraLink(`https://api.spotify.com/v1/albums/${id}/tracks?limit=50`);
    bar.stop();
    return titoli;
}

const spotifyArtist = async (id) =>{
    const res = await fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=IT`,{
        headers: {
            'Authorization': `Bearer ${spotifyToken}`
        }
    });
    const data = await res.json();
    
    if (res.status == 401 && data.error.message=='The access token expired'){
        await getSpotifyToken();
        return (spotifyArtist(id));
    }
    await parseSpotify(data);

    const titoli = [];
    for (let track of data.tracks){
        titoli.push(trackToTitle(track));
    }

    return titoli;
}

const spotifyPlaylist = async (id) =>{
    const bar = new cliProgress.SingleBar(barStile('playlist-tracks'), cliProgress.Presets.shades_classic);
    let primo = true;

    const iteraLink = async (link)=>{
        const res = await fetch(link,{
            headers: {
                'Authorization': `Bearer ${spotifyToken}`
            }
        });
        const data = await res.json();

        if (res.status == 401 && data.error.message=='The access token expired'){
            await getSpotifyToken();
            return (iteraLink(link));
        }
        await parseSpotify(data);

        if (primo){
            bar.start(data.total);
            primo = false;
        }
    
        const titoli = [];
        for (let item of data.items){
            bar.increment();
            titoli.push(trackToTitle(item.track));
        }
        if (data.next){
            titoli.push(... (await (iteraLink(data.next) )));
        }

        return titoli;
    }

    const titoli = await iteraLink(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=50&market=IT`);
    bar.stop(); 
    return titoli;
}

const updateDiscordBar = (emitter,bar)=>{
    const updater = setInterval(()=>{
        emitter.emit('msg', {
            embeds: [
            new EmbedBuilder()
                .setTitle('Looking for songs')
                .setDescription(`|${'\u2588'.repeat(Math.floor(bar.getProgress()*40))}${'\u2591'.repeat(Math.ceil((1-bar.getProgress())*40))}|`)
                //.setDescription(`[${'='.repeat(Math.floor(bar.getProgress()*40))}${'-'.repeat(Math.ceil((1-bar.getProgress())*40))}]`)
                .setColor(Colori.default)
            ]
        });
    },1750);
    bar.on('stop', ()=>{
        clearInterval(updater);
    });
}

cercaNomeCollection = async (id,emitter, resource)=>{
    const res = await fetch(`https://api.spotify.com/v1/${{playlist:'playlists', album:'albums', artist:'artists'}[resource]}/${id}?market=IT`,{
        headers: {
            'Authorization': `Bearer ${spotifyToken}`
        }
    });
    const data = await res.json();

    if (res.status == 401 && data.error.message=='The access token expired'){
        await getSpotifyToken();
        return (cercaNomeCollection(id,emitter,resource));
    }
    await parseSpotify(data);

    await emitter.emit('collectionTitle', data.name);
}

const trovaLinkSpotify = async(id, resource, server,position,emitter)=>{
    const titoli = [];
    if (!spotifyToken){
        await getSpotifyToken();
    }

    switch (resource){
        case 'track':
            titoli.push(await spotifyTrack(id));
            break;
        case 'album':
            await cercaNomeCollection(id,emitter,resource);
            titoli.push(... (await ( spotifyAlbum(id))));
            break;
        case 'artist':
            await cercaNomeCollection(id,emitter,resource);
            titoli.push(... (await ( spotifyArtist(id))));
            break;
        case 'playlist':
            await cercaNomeCollection(id,emitter,resource);
            titoli.push(... (await ( spotifyPlaylist(id))));
            break;
    }

    const titoliBatch = [];
    for (i=0; i<titoli.length; i+=50){
        titoliBatch.push(titoli.slice(i, i+50));
    }

    const canzoni = [];

    const bar = new cliProgress.SingleBar(barStile('resolving titles'), cliProgress.Presets.shades_classic);
    bar.start(titoli.length, 0);
    updateDiscordBar(emitter,bar);

    for (let batch of titoliBatch){
        const trovate = (await Promise.all(
            batch.map(titolo=>{
                return ( async () => {
                    try{
                        var canzone = await ricercaTitolo(titolo, server,position,emitter, false);
                    }catch(e){
                        console.error(e);
                        if (e==errors.YouTubeKeyExpired)
                            throw e
                    }
                    bar.increment();
                    return canzone;
                } )()
            }))
        ).filter(a=>a);
        canzoni.push(...trovate);
        server.queue.splice(position+canzoni.length,0,...trovate);
        if (titoliBatch.indexOf(batch)==0)
            await emitter.emit('firstFound');
    }
    bar.stop();

    return canzoni;
}

const trovaListaYT = async (videoId, listId, server,position,emitter)=>{
    const ret = [];
    let pageToken;
    const bar = new cliProgress.SingleBar(barStile('ricerca canzoni'), cliProgress.Presets.shades_classic);
    updateDiscordBar(emitter,bar);

    fetch('https://www.googleapis.com/youtube/v3/playlists?'+querystring.stringify({
        part: 'snippet',
        id: listId
    }))
    .then(res=>res.json())
    .then(data=>{
        emitter.emit('collectionTitle', data.items[0].snippet.title);
    })
    .catch(error=>{
        console.error(error);
    })


    let primo = true;
    let firstFound=false;
    do {
        var hasNextPage = false;
        const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50${pageToken?`&pageToken=${pageToken}`:''}&playlistId=${listId}&key=${youtubeKey}`);

        if (res.ok){
            const snippet = await res.json();
            if (primo){
                bar.start(snippet.pageInfo.totalResults,0);
                primo=false;
            }

            if (snippet.nextPageToken){
                pageToken = snippet.nextPageToken;
                hasNextPage=true;
            }

            const items = snippet.items;
            if (!items){
                throw new Error(errors.YouTubePlaylistNotFound);
            }

            const canzoni = items.map((item)=>{
                const canzone = {
                    link: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
                    titolo: item.snippet.title,
                    file: false
                };
                bar.increment();
                return canzone;
            });

            server.queue.splice(position+ret.length,0,...canzoni);
            ret.push(...canzoni);
            if (!firstFound){
                firstFound=true;
                await emitter.emit('firstFound');
            }
        }else{
            throw errors.YouTubeKeyExpired;
        }
    }while(hasNextPage);
    bar.stop();
    return ret;
}

const trovaCanzoneYT = async (videoId, server, position, emitter, suonare=true)=>{
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeKey}`);

    if (res.ok){
        const snippet = await res.json();
        const item = snippet.items[0];
        if (!item){
            throw new Error(errors.YouTubeVideoNotFound);
        }
        const song = {
            link: `https://www.youtube.com/watch?v=${item.id}`,
            titolo: item.snippet.title,
            file: false
        };
        if (suonare) {
            server.queue.splice(position,0,song);
            await emitter.emit('firstFound');
        }
        return song;
    }else{
        throw errors.YouTubeKeyExpired;
    }
}

//deve ritornare un lista di canzoni
const accodaCanzoni = async (song, server, position, emitter)=>{
    if (song.match(/^https:\/\/youtu\.be\/.{11}$|^https:\/\/(www\.)?youtube\.com\/watch\?v=.{11}$/)){
        const match = song.match(/^https:\/\/youtu\.be\/(?<videoId>.{11})$|^https:\/\/(www\.)?youtube\.com\/watch\?v=(?<videoId2>.{11})$/);
        const videoId = match.groups.videoId || match.groups.videoId2;
        return [await trovaCanzoneYT(videoId, server,position,emitter)];
    }
    // https://www.youtube.com/watch?v=QN1odfjtMoo&list=PLG7bQTXLuEouQFSnPUY6mFuJRf7ULbZbo
    // https://youtube.com/playlist?list=PLvwkDL8hMpWr2hyMgQwj9wHQINqwpTqWc
    if (song.match(/^https:\/\/(www\.)?youtube\.com\/watch\?v=.{11}&list=.*$|^https:\/\/(www\.)?youtube\.com\/playlist\?list=.{34}$/)){
        const match = song.match(/^https:\/\/(www\.)?youtube\.com\/watch\?v=(?<videoId>.{11})&list=(?<listId>.*)$|^https:\/\/(www\.)?youtube.com\/playlist\?list=(?<listId2>.{34})$/);
        const videoId = match.groups.videoId;
        const listId = match.groups.listId || match.groups.listId2;
        return await trovaListaYT(videoId, listId, server,position,emitter);
    }
    if (song.match(/^https:\/\/open\.spotify\.com\/(track|album|artist|playlist)\/.{22}/)){
        const match = song.match(/https:\/\/open\.spotify\.com\/(?<resource>track|album|artist|playlist)\/(?<id>.{22})/);
        const id =  match.groups.id;
        const resource = match.groups.resource;
        return await trovaLinkSpotify(id, resource, server,position,emitter);
    }
    return [await ricercaTitolo(song, server,position,emitter)];
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

const comando = async (song,position, member,channel, emitter)=>{
    const sameVCError = requisiti.sameVoiceChannel(member);
    if (sameVCError)
        return sameVCError;

    const guild = member.guild;

    if (!servers.has(guild.id))
        servers.set(guild.id, new Server(guild));
    const server = servers.get(guild.id);
    if (server.timeout){
        clearTimeout(server.timeout);
        server.timeout=undefined;
    }

    emitter.on('firstFound',()=>{
        if (!server.isPlaying)
            suona(server, channel, member);
    });

    let titolo;
    emitter.on('collectionTitle', (collectionTitle)=>{
        titolo = collectionTitle;
    })

    const posizione = ((!position || position==-1) && position!=0)? server.queue.length : Math.min(Math.max(position,0), server.queue.length);
    // cerca la canzone (o le canzoni) e ritorna un messaggio d'errore se non si trova nulla
    try {
        var canzoni = await accodaCanzoni(song, server,posizione, emitter);
    }catch(error){
        let errorMsg;
        switch (error){
            case errors.YouTubeVideoNotFound:
                errorMsg = "The link you've provided doesn't seem to bring anywhere :o";
                break;
            case errors.YouTubeKeyExpired:
                errorMsg = 'We ran out of youtube quotas ¯\_(:P)_/¯';
                break;
            case errors.YouTubePlaylistNotFound:
                errorMsg = "The link you've provided doesn't seem to bring anywhere :o"
                break;
            case errors.SpotifyIdNotFound:
                errorMsg = "The link you've provided doesn't seem to bring anywhere :o";
                break;
            case errors.InvalidSpotifyId:
                errorMsg = "The link you've provided seems to be malformed";
                break;
            case errors.YouTubeSearchNotFound:
                errorMsg = "We couldn't find your song";
                break;
            default:
                throw error;
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
                .setDescription(`__[${titolo||song}](${song})__`)
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

            const emitter = new EventEmitter();
            emitter.on('msg', (msg)=>{
                interaction.editReply(msg);
            })
            const response = await comando(song, position, interaction.member,interaction.channel, emitter);
            return await interaction.editReply(response);
        },


        aliases: ['play', 'p'],
        executeMsg: async (message,args)=>{
            const canzone = args.join(' ');

            if (!canzone)
                return message.channel.send({embeds:[new EmbedBuilder().setTitle('Error!').setDescription("No song specified.\nUse the `help` command to know more").setColor(Colori.error)]});

    //        return message.channel.send({embeds:[new EmbedBuilder().setTitle('Error!').setDescription("No song specified.\nUse the `help` command to know more").setColor(Colori.error)]});

            const messaggio = await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                    .setTitle('Looking for songs')
                    .setColor(Colori.default)
                ]
            });
            const emitter = new EventEmitter();
            emitter.on('msg',(msg)=>{
                messaggio.edit(msg);
            });
            const response = await comando(canzone, undefined, message.member,message.channel, emitter);
            
            return await messaggio.edit(response);
        },

        example: '`-play` `song` `[postition]`',
        description: 'Plays a song or adds it to the queue.',
        parameters: '`song`: the title or the link of the song/playlist you want to be played (supports both YouTube and Spotify)\n`[position]`: The position in the queue where to insert the song. If not specified, the song will be inserted at the end of the queue'
    }),
    fineCanzone: fineCanzone,
    suona: suona
}