const { servers } = require('../shared');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Server } = require('../js/server');
const Comando = require('../js/comando');
const requisiti = require('../js/requisiti');
const { Colori } = require('../js/colori');

async function comando(radio_id, member, channel) {
    const sameVCError = requisiti.sameVoiceChannel(member);
    if (sameVCError) return sameVCError;

    const guild = member.guild;
    const guild_id = guild.id;

    if (!servers.has(guild_id))
        servers.set(guild_id, new Server(guild));
    const server = servers.get(guild_id);

    const radio_name = await fetch(`https://radio.garden/api/ara/content/channel/${radio_id}`)
        .then(res=>res.json())
        .then(data=>{
            if (data.error) return;
            return data.data.title;
        });

    if (radio_name) {
        server.suona(radio_id, member);
        return {
            embeds: [ new EmbedBuilder()
                .setTitle(`Now Playing`)
                .setDescription(`${radio_name}`)
                .setColor(Colori.default)
            ]
        };
    } else {
        return {
            embeds: [ new EmbedBuilder()
                .setTitle(`Invalid radio id`)
                .setColor(Colori.error)
            ]
        };
    }
}

module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
        .setName('radio')
        .setDescription('Bot, play us some tunes')
        .setDescriptionLocalizations({
            it: 'Bot, suonaci qualcosa'
        })
        .addStringOption(option=>
            option
            .setName("radio_id")
            .setNameLocalizations({
                it: "id_radio"
            })
            .setDescription("ID of the radio to connect to. Use /find_radio to get one")
            .setDescriptionLocalizations({
                it: "ID della radio a cui collegarsi. Usa /find_radio per trovarne uno"
            })
            .setRequired(false)
        ),

        execute: async (interaction) => {
            const radio_id = interaction.options.getString("radio_id")?.trim() || 'BPB5umIn';

            await interaction.deferReply({ephemeral:false});
            const reply = await comando(radio_id, interaction.member, interaction.channel);
            interaction.editReply(reply);
        },

        aliases: ['radio', 'rad'],
        executeMsg: async (message,args)=>{
            const radio_id = args[0] || 'BPB5umIn';

            const reply = await comando(radio_id, message.member, message.channel);
            message.channel.send(reply)
        },

        example: '`-radio` `radio_id`',
        description: 'Plays the flipping radio',
        parameters: '`radio_id`: id of the radio station you want. Look them up through the `find_radio` command'
    }),
}

