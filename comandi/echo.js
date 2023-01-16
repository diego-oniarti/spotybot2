const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Colori } = require('../js/colori');
const wait = require('node:timers/promises').setTimeout;
const Comando = require('../js/comando');

const esegui= async (messaggio, delay)=>{
    await wait(delay);
    
    return {
        embeds:[
            new EmbedBuilder()
            .setDescription(messaggio)
            .setColor(Colori.default)
        ],
        ephemeral: true
    }
}

module.exports = new Comando(
	new SlashCommandBuilder()
		.setName('echo')
		.setDescription('Repeats what you say after a delay')
        .setDescriptionLocalizations({
            it: "Ripete quello che dici dopo un ritardo"
        })
        .addStringOption(option=>
            option
            .setName("message")
            .setNameLocalizations({
                it: "messaggio"
            })
            .setDescription("What to reply")
            .setDescriptionLocalizations({
                it: "Cosa ripetere"
            })
            .setRequired(true)
        )
        .addIntegerOption(option=>
            option
            .setName("delay")
            .setNameLocalizations({
                it: "ritardo"
            })
            .setDescription("Delay in ms")
            .setDescriptionLocalizations({
                it: "Ritardo in ms"
            })
            .setMinValue(0)
            .setMaxValue(5000)
            .setRequired(false)
    ),
	async(interaction) => {
        const message = interaction.options.getString("message");
        const delay = interaction.options.getInteger("delay") || 0;

        await interaction.deferReply({ephemeral:true});
        const reply = await esegui(message,delay);
        return await interaction.editReply(reply);
	},

    ['echo'],

    async (messaggio, args) => {
        const message = args[0];
        const delay = args[1] || 0;

        if (!message || isNaN(parseInt(delay)) || parseInt(delay)<0)
            return await messaggio.channel.send({
                embeds: [
                    new EmbedBuilder()
                    .setTitle(":warning: Error")
                    .setDescription("Wrong parameters.\nUse the `help` command to get more instructions.")
                    .setColor(Colori.error)
                ]
            })

        const reply = await esegui(message, delay);
        return await messaggio.channel.send(reply);
    },

    '`-echo` `message` `[delay]`',
    'Repeats what you say after a delay\nThe delay is specified in milliseconds',
    '`message`: The message the bot will send back to you\n`[delay]`: The amount of time (ms) that the bot will wait before replying. If omitted this value is 0'
);