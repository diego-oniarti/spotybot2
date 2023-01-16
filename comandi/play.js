const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Discord = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const Comando = require('../js/comando');
const { Colori } = require('../js/colori');

const comando = (song,position,  member)=>{
    
    
    const canzone = new canzone;
    
    
    
    const stream = ytdl('https://www.youtube.com/watch?v=DgJSltMGfXg', {filter:'audioonly'});
        
    const channel = member.voice.channel;
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
}

module.exports = new Comando(
	new SlashCommandBuilder()
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
	async (interaction) => {
        const song = interaction.options.getString("song");
        const position = interaction.options.getInteger("position") || 0;

        const response = comando(song, position, interaction.member)
        response.ephemeral = true;

        return await interaction.reply(response);
	},


    ['play', 'p'],
    async (message,args)=>{
        const canzone = args[0];
        const posizione = args[1];

        if (!canzone)
            return 
    },

    '`-play` `song`\n-play `song` `[postition]`',
    'Plays a song or adds it to the queue.',
    '`song`: the title or the link of the song/playlist you want to be played (supports both YouTube and Spotify)\n`[position]: The position in the queue where to insert the song. If not specified, the song will be inserted at the end of the queue`'
);