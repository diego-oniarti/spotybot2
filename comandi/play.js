const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Discord = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const Comando = require('../js/comando');
const { Colori } = require('../js/colori');
const fs = require('node:fs')
const path = require('node:path')


const trovaCanzoneYT = async (videoId)=>{

}

const trovaCanzone = async (song)=>{
    if (song.match(/^https\:\/\/www\.youtube\.com\/watch\?v=.{11}$/)){
        const videoId = song.match(/^https\:\/\/www\.youtube\.com\/watch\?v=(?<videoId>.{11})$/).groups.videoId;
        return await trovaCanzoneYT(videoId);
    }
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
    if (!member.voice)
        return {
            embeds: [
                new EmbedBuilder()
                .setTitle('Errore!')
                .setDescription("Where are you?\nI can't see you :eyes:")
                .setColor(Colori.error)
            ]
        }

    const guild = member.guild;

    let  song;
    try {
        song = await trovaCanzone(song);
    }catch(error){
        switch (error.message){
            case '':
                return {
                    embeds: [
                        /* ... */
                    ]
                }
                break;
        }
    }
    

    const voiceChannel = member.voice.channel;

    let connection = Discord.getVoiceConnection(guild.id)
    if (!connection){
        connection = Discord.joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator
        });
        await saluta(connection);
    }




    return {
        embeds: [
            new EmbedBuilder()
            .setTitle('OK!')
            .setColor(Colori.default)
        ]
    };

    const canzone = trovaCanzone(song);



/*    const stream = ytdl('https://www.youtube.com/watch?v=DgJSltMGfXg', {filter:'audioonly'});
        
    const player = Discord.createAudioPlayer();
    const resource = Discord.createAudioResource(stream);

    const connection = Discord.joinVoiceChannel({
        channelId: channel.id,
        guildId: member.guild.id,
        adapterCreator: member.guild.voiceAdapterCreator
    });

    player.play(resource);
    connection.subscribe(player);

    player.on(Discord.AudioPlayerStatus.Idle, ()=>{
        connection.destroy();
    });

    return {
        embeds: [
            new EmbedBuilder()
            .setTitle('OK!')
            .setColor(Colori.default)
        ]
    };
    */
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
            .setMinValue(0)
            .setRequired(false)
        ),
	execute: async (interaction) => {
        const song = interaction.options.getString("song");
        const position = interaction.options.getInteger("position") || 0;

        const response = await comando(song, position, interaction.member)
        response.ephemeral = true;

        return await interaction.reply(response);
	},


    aliases: ['play', 'p'],
    executeMsg: async (message,args)=>{
        const canzone = args[0];
        const posizione = args[1];
        const response = await comando(canzone, posizione, interaction.member)

        if (!canzone)
            return await message.channel.reply(response);
    },

    example: '`-play` `song`\n-play `song` `[postition]`',
    description: 'Plays a song or adds it to the queue.',
    parameters: '`song`: the title or the link of the song/playlist you want to be played (supports both YouTube and Spotify)\n`[position]: The position in the queue where to insert the song. If not specified, the song will be inserted at the end of the queue`'
});

class a {
    constructor ({a= 0 ,b= 1}={}){
        this.a = a;
        this.b=b;
    }
}