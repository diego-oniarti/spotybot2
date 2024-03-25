require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Discord = require('@discordjs/voice');
const Comando = require('../js/comando');
const { Colori } = require('../js/colori');
const fs = require('node:fs');
const path = require('node:path');
const fetch = require('node-fetch');
const { servers } = require('../shared');
const { Server, Modes } = require('../js/server');
const cliProgress = require('cli-progress');
const querystring = require('node:querystring');
const requisiti = require('../js/requisiti');
const EventEmitter = require('node:events');
const ytdl = require('ytdl-core');

const youtube_key = process.env.YOUTUBE_KEY;

function bar_style(nome) {
    if (nome) nome+=' ';
    else nome=''
    return {
        format: `${nome}|{bar}| {percentage}% | DURATION: {duration} | ETA: {eta}s | {value}/{total}`,
    }
}

let spotifyToken;

async function get_spotify_token() {
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

