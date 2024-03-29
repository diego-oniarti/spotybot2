require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Comando = require('../js/comando');
const { Colori } = require('../js/colori');
const fs = require('node:fs');
const fetch = require('node-fetch');
const { servers } = require('../shared');
const { Server } = require('../js/server');
const cliProgress = require('cli-progress');
const querystring = require('node:querystring');
const requisiti = require('../js/requisiti');
const play = require('play-dl');

const DB_PATH = process.env.DB_PATH;
const youtube_key = process.env.YOUTUBE_KEY;
let spotifyToken;

const Errors = {
    TitleNotFound: 0,
    IdNotFound: 1,
    YoutubeKeyExpired: 2,
    SpotifyCantFind: 3,
}

// Get the style for a progress bar given its name.
function bar_style(nome) {
    if (nome) nome+=' ';
    else nome=''
    return {
        format: `${nome}|{bar}| {percentage}% | DURATION: {duration} | ETA: {eta}s | {value}/{total}`,
    }
}

// Get the user's spotify account from the DB. If the user has no spotify account linked, return the bot's token.
async function get_spotify_token(userID) {
    if (!userID) return spotifyToken;

    const DB = JSON.parse(fs.readFileSync(DB_PATH));
    if (DB.users[userID]?.access_token) {
        return DB.users[userID].access_token;
    }
    return spotifyToken;
}

// Gets the spotify token for the bot. 
async function get_bot_token() {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + (new Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'))
        },
        body: params,
    })
    .then(res=>res.json())
    .then(data=>{
        spotifyToken = data.access_token;
        console.log(`Got new token: ${spotifyToken}`)
    });
}
// Imediately get the bot's token
get_bot_token();

// Refreshes the bot token for a user. Or returns the bot's token
async function refresh_spotyfy_token(userID) {
    if (!userID) return get_bot_token();
    let DB = JSON.parse(fs.readFileSync(DB_PATH));
    if (DB.users[userID]?.refresh_token) {
        console.log("from database");
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', DB.users[userID].refresh_token);

        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + (new Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params,
        });
        const data = await res.json();
        DB = JSON.parse(fs.readFileSync(DB_PATH));
        DB.users[userID].access_token = data.access_token;
        if (data.refresh_token) DB.users[userID].refresh_token = data.refresh_token;
        fs.writeFileSync(DB_PATH, JSON.stringify(DB));
        return data.access_token;
    }else{
        console.log("from bot")
        return await get_bot_token();
    }
}


// Takes a song title and returns it's youtube id. Throws an error if it can't find it
async function titolo_to_id(song_title) {
/*    const pagina = await fetch(encodeURI(`https://www.youtube.com/results?search_query=${song_title}`));
    const html = await pagina.text();
    const match = html.match(/\"videoId\"\:\"(.{1,12})\"/);
    if (!match) {
	throw Errors.TitleNotFound;
    }
    return match[1];*/
    return (await play.search(song_title, {limit:1}))[0].id;
}

async function get_song_details(song_id) {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${song_id}&key=${youtube_key}`);

    if (!res.ok) throw Errors.IdNotFound;

    const snippet = await res.json();
    const item = snippet.items[0];
    
    if (!item){
        throw Errors.IdNotFound;
    }
    const song = {
        link: `https://www.youtube.com/watch?v=${item.id}`,
        titolo: item.snippet.title,
        file: false
    };
    return song;
}


class SongCollection{
    constructor(title="",link="",size=1,generator= async function* (){}){
	this.title = title;
	this.link = link;
	this.generator=generator;
	this.size = size;
    }
}

async function titolo_to_details(title) {
    return await get_song_details(await titolo_to_id(title));
}

async function trova_canzone_yt(video_id){
    const details = await get_song_details(video_id);
    return new SongCollection(details.titolo, details.link, 1, async function*(){yield details});
}

async function ricerca_titolo(title){
    const song_id = await titolo_to_id(title);
    const song_deatils = await get_song_details(song_id);
    return new SongCollection(song_deatils.titolo, song_deatils.link, 1, async function*(){yield song_deatils});
}

async function trova_lista_yt(list_id){
    let list_title, list_length;
    await fetch('https://www.googleapis.com/youtube/v3/playlists?'+querystring.stringify({
        part: 'snippet,contentDetails',
        id: list_id,
        key: youtube_key,
    }))
    .then(res=>res.json())
    .then(data=>{
	list_title = data.items[0].snippet.title;
	list_length = data.items[0].contentDetails.itemCount;
    })
    .catch(error=>{
        console.error(error);
    });

    return new SongCollection(list_title, `https://www.youtube.com/playlist?list=${list_id}`, list_length, async function*(){
	let token, has_next_page;
	do {
	    has_next_page = false;
	    const params = {
		part: 'snippet',
		maxResults: 50,
		playlistId: list_id,
		key: youtube_key,
	    }
	    if (token) params.pageToken = token;
	    const res = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?"+querystring.stringify(params));
	    if (!res.ok) throw Errors.YoutubeKeyExpired;

	    const snippet = await res.json();
	    if (snippet.nextPageToken) {
		token = snippet.nextPageToken;
		has_next_page = true;
	    }

	    const items = snippet.items;

	    for (const item of items) {
		yield {
		    link: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
		    titolo: item.snippet.title,
		    file: false,
		};
	    }

	}while(has_next_page);
    });
}

async function trova_link_spotify(resource_id, resource_type, userID){
    // sceglie una funzione e la chiama con dei parametri. I <3 readable code
    refresh_spotyfy_token(userID);
    return await {
	'track': spotify_track,
	'album': spotify_album,
	'artist': spotify_artist,
	'playlist': spotify_playlist,
    }[resource_type](resource_id, userID);
}

async function spotify_artist(artist_id, userID) {
    let artist_name="";
    await fetch(`https://api.spotify.com/v1/artists/${artist_id}`, {
	headers: {'Authorization': `Bearer ${await get_spotify_token(userID)}`}
    }).then(res=>res.json())
	.then(data=>{artist_name = data.name});
    return new SongCollection(
	artist_name,
	`https://open.spotify.com/artist/${artist_id}`,
	10,
	async function* () {
	    const data = await fetch(`https://api.spotify.com/v1/artists/${artist_id}/top-tracks`,{headers: {'Authorization': `Bearer ${await get_spotify_token(userID)}`}}).then(res=>res.json());
	    for (const track of data.tracks) {
		yield titolo_to_details(spotify_track_to_title(track));
	    }
	}
    );
}

async function spotify_playlist(playlist_id, userID){
    return await fetch(`https://api.spotify.com/v1/playlists/${playlist_id}`, {
	headers: {'Authorization': `Bearer ${await get_spotify_token(userID)}`}
    })
	.then(res=>res.json())
	.then(data=>{
	    if (data.error?.status == 404) throw Errors.SpotifyCantFind;
	    return new SongCollection(
		data.name,
		`https://open.spotify.com/playlists/${playlist_id}`,
		data.tracks.total,
		async function* () {
		    for (const item of data.tracks.items) {
			yield titolo_to_details(spotify_track_to_title(item.track));
		    }
		    let next = data.tracks.next;
		    while (next) {
			const data = await fetch(next,{headers: {'Authorization': `Bearer ${await get_spotify_token(userID)}`}}).then(res=>res.json());
			for (const item of data.items) {
			    yield titolo_to_details(spotify_track_to_title(item.track));
			}
			next = data.next;
		    }
		}
	    );
	})
	.catch(e=>{
	    console.error(e);
	    throw Errors.SpotifyCantFind;
	});
}

async function spotify_album(album_id, userID) {
    return await fetch(`https://api.spotify.com/v1/albums/${album_id}`, {
	headers: {'Authorization': `Bearer ${await get_spotify_token(userID)}`}
    })
	.then(res=>res.json())
	.then(data=>{
	    return new SongCollection(
		data.name,
		`https://open.spotify.com/album/${album_id}`,
		data.tracks.total,
		async function* () {
		    for (const item of data.tracks.items) {
			yield titolo_to_details(spotify_track_to_title(item));
		    }
		    let next = data.tracks.next;
		    while (next) {
			const data = await fetch(next,{headers: {'Authorization': `Bearer ${await get_spotify_token(userID)}`}}).then(res=>res.json());
			for (const item of data.items) {
			    yield titolo_to_details(spotify_track_to_title(item));
			}
			next = data.next;
		    }
		}
	    );
	})
	.catch(e=>{
	    console.error(e);
	    throw Errors.SpotifyCantFind;
	});
}

async function spotify_track(track_id, userID) {
    const res = await fetch(`https://api.spotify.com/v1/tracks/${track_id}`,{
        headers: {
            'Authorization': `Bearer ${await get_spotify_token(userID)}`
        }
    });
    const data = await res.json();
    if (res.status == 401 && data.error.message=='The access token expired'){
        await refresh_spotyfy_token(userID);
        return (spotify_track(track_id,userID));
    }
    if (data.error) {
	console.log(data);
	throw Errors.SpotifyCantFind;
    }
    const song = await titolo_to_details(spotify_track_to_title(data));
    return new SongCollection(song.title, song.link, 1, async function*(){yield song});
}

function spotify_track_to_title(track){
    return [track.name, ...track.artists.map(artist=>artist.name)].join(' ');
}

async function find_songs(song_query, userID) {
    // https://www.youtube.com/watch?v=QN1odfjtMoo&list=PLG7bQTXLuEouQFSnPUY6mFuJRf7ULbZbo
    // https://youtube.com/playlist?list=PLvwkDL8hMpWr2hyMgQwj9wHQINqwpTqWc
    if (song_query.match(/^https:\/\/youtu\.be\/.{11}$|^https:\/\/(www\.)?youtube\.com\/watch\?v=.{11}$/)){
        const match = song_query.match(/^https:\/\/youtu\.be\/(?<videoId>.{11})$|^https:\/\/(www\.)?youtube\.com\/watch\?v=(?<videoId2>.{11})$/);
        const videoId = match.groups.videoId || match.groups.videoId2;
	return await trova_canzone_yt(videoId);
    }

    if (song_query.match(/^https:\/\/(www\.)?youtube\.com\/watch\?v=.{11}&list=.*$|^https:\/\/(www\.)?youtube\.com\/playlist\?list=.{34}$/)){
        const match = song_query.match(/^https:\/\/(www\.)?youtube\.com\/watch\?v=(?<videoId>.{11})&list=(?<listId>.*)$|^https:\/\/(www\.)?youtube.com\/playlist\?list=(?<listId2>.{34})$/);
        const listId = match.groups.listId || match.groups.listId2;
        return await trova_lista_yt(listId);
    }
    if (song_query.match(/^https:\/\/open\.spotify\.com.*\/(track|album|artist|playlist)\/.{22}/)){
        const match = song_query.match(/https:\/\/open\.spotify\.com.*\/(?<resource>track|album|artist|playlist)\/(?<id>.{22})/);
        const id =  match.groups.id;
        const resource = match.groups.resource;
        return await trova_link_spotify(id, resource, userID);
    }
    return await ricerca_titolo(song_query);
}

async function* comando(song_query, position, member, channel) {
    const sameVCError = requisiti.sameVoiceChannel(member);
    if (sameVCError){
        yield sameVCError;
	return;
    }
	
    const guild = member.guild;

    if (!servers.has(guild.id))
        servers.set(guild.id, new Server(guild));
    const server = servers.get(guild.id);
    const posizione = ((!position || position==-1) && position!=0)? server.queue.length : Math.min(Math.max(position,0), server.queue.length);

    let index = 0;
    const queued = [];
    const collection = await find_songs(song_query, member.user.id).catch(e=>{return {error:e}});
    if (collection.error){
	yield {
	    embeds: [
		new EmbedBuilder()
		    .setTitle('ERROR')
		    .setColor(Colori.error)
		    .setDescription({
			0: "TitleNotFound",
			1: "Couldn't find the youtube id of the song",
			2: "Out youtube key expired",
			3: "Couldn't find your song on spotify"
		    }[collection.error])
	    ]
	}
	return;
    }
    
    for await (const song of collection.generator()) {
	if (!servers.get(member.guild.id)) break;
	server.queue.splice(posizione+index,0,song);
	queued.push(song);
	index++;
	if (index%10==0) yield {
	    embeds: [
		new EmbedBuilder()
		    .setTitle("Looking for songs")
		    .setColor(Colori.system)
		    .setDescription(`${index}/${collection.size}`)
	    ]
	}
	if (!server.isPlaying) {
	    server.text_channel = channel;
	    server.suona(member);
	}
    }

    if (queued.length==1) {
	yield {
	    embeds: [
                new EmbedBuilder()
                .setTitle(`Queued at position ${posizione+1}`)
                .setDescription(`__[${queued[0].titolo}](${queued[0].link})__`)
                .setColor(Colori.default)
            ]
        };
	return;
    }
    yield {
        embeds: [
            new EmbedBuilder()
                .setTitle(`Queued ${queued.length} songs from position ${posizione+1}`)
                .setDescription(`__[${collection.title}](${collection.link})__`)
                .setColor(Colori.default)
        ]
    };
    return;
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

	    for await (const res of comando(song,position,interaction.member, interaction.channel)) {
		interaction.editReply(res);
	    }
        },


        aliases: ['play', 'p'],
        executeMsg: async (message,args)=>{
            const canzone = args.join(' ');

            if (!canzone)
                return message.channel.send({embeds:[new EmbedBuilder().setTitle('Error!').setDescription("No song specified.\nUse the `help` command to know more").setColor(Colori.error)]});

            const messaggio = await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                    .setTitle('Looking for songs')
                    .setColor(Colori.default)
                ]
            });

	    for await (const res of comando(canzone, undefined, message.member, message.channel)) {
		messaggio.edit(res);
	    }	    
        },

        example: '`-play` `song` `[postition]`',
        description: 'Plays a song or adds it to the queue.',
            parameters: '`song`: the title or the link of the song/playlist you want to be played (supports both YouTube and Spotify)\n`[position]`: The position in the queue where to insert the song. If not specified, the song will be inserted at the end of the queue. This parameter is unreachable with the - command, use the / one instead'
    }),
}
