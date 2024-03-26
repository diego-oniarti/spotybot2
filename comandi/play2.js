require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Comando = require('../js/comando');
const { Colori } = require('../js/colori');
const fs = require('node:fs');
const fetch = require('node-fetch');
const { servers } = require('../shared');
const { Server, Modes } = require('../js/server');
const cliProgress = require('cli-progress');
const querystring = require('node:querystring');
const requisiti = require('../js/requisiti');
const EventEmitter = require('node:events');

const DB_PATH = process.env.DB_PATH;
const youtube_key = process.env.YOUTUBE_KEY;
let spotifyToken;

const Errors = {
    TitleNotFound: 0,
    IdNotFound: 1,
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


function fine_canzone(server,channel){
    //TODO
}
async function suona(server, channel, member) {
    //TODO
}

// Takes a song title and returns it's youtube id. Throws an error if it can't find it
async function recerca_titolo(song_title) {
    const pagina = await fetch(encodeURIa(`https://www.youtube.com/results?search_query=${song_title}`));
    const html = await pagina.text();
    const match = html.match(/\"videoId\"\:\"(.{1,12})\"/);
    if (!match) {
	throw Errors.TitleNotFound;
    }
    return match[1];
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

async function comando(song_query, position, member, channel) {
    const sameVCError = requisiti.sameVoiceChannel(member);
    if (sameVCError)
        return sameVCError;

    const guild = member.guild;

    if (!servers.has(guild.id))
        servers.set(guild.id, new Server(guild));
    const server = servers.get(guild.id);
    const posizione = ((!position || position==-1) && position!=0)? server.queue.length : Math.min(Math.max(position,0), server.queue.length);

    let index = 0;
    for await (const song of find_songs(song_query)) {
	server.queue.splice(posizione+index,0,song);
	index++;
	if (!server.is_playing) {
	    server.suona(member);
	}
    }
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
            emitter.on('msg', async (msg)=>{
                await interaction.editReply(msg);
                emitter.emit('hasSent');
            });
            const response = await comando(song, position, interaction.member,interaction.channel, emitter);
            return await interaction.editReply(response);
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
            const emitter = new EventEmitter();
            emitter.on('msg', async (msg)=>{
                await messaggio.edit(msg);
                emitter.emit('hasSent');
            });
            const response = await comando(canzone, undefined, message.member,message.channel, emitter);
            
            return await messaggio.edit(response);
        },

        example: '`-play` `song` `[postition]`',
        description: 'Plays a song or adds it to the queue.',
            parameters: '`song`: the title or the link of the song/playlist you want to be played (supports both YouTube and Spotify)\n`[position]`: The position in the queue where to insert the song. If not specified, the song will be inserted at the end of the queue. This parameter is unreachable with the - command, use the / one instead'
    }),
    fineCanzone: fineCanzone,
    suona: suona
}
