const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Colori } = require('../js/colori');
const Comando = require('../js/comando');
const fs = require('node:fs');
const path = require('node:path');

const comandi = fs.readdirSync(__dirname).map(file=>file.replace('.js',''));

const esegui= async (comando)=>{
    if (!comando)
        return {
            title: 'Commands',
            embeds: [
                new EmbedBuilder()
                .addFields(
                    {
                        name: 'Help',
                        value: 'Type `help` followed by any other command to receive further help.\nExample: `-help play`',
                        inline: false
                    },
                    {
                        name: 'Commands',
                        value: comandi.map(a=>`\`${a}\``).join(' ')
                    }
                )
                .setColor(Colori.default)
            ],
            ephemeral: true
        }

    const cmd = require(path.join(__dirname,comando)).comando;

    const embed = new EmbedBuilder()
    .setTitle(comando)
    .setFields(
        {name: 'usage',  value: cmd.example},
    )
    .setColor(Colori.default)

    if (cmd.parameters)
        embed.addFields({name: 'parameters', value: cmd.parameters});
    embed.addFields({name: 'description', value: cmd.description});

    if (cmd.aliases.length>1)
        embed.addFields({name: 'aliases', value: cmd.aliases.slice(1).map(nome=>`\`${nome}\``).join(' ')});

    return {
        embeds:[embed],
        ephemeral: true
    }
}

module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
            .setName('help')
            .setDescription('Helps you with the bot or with specific commands')
            .setDescriptionLocalizations({
                it: "Ti aiuta nell'utilizzo del bot o di specifici comandi"
            })
            .addStringOption(option=>{
                option
                .setName("command")
                .setNameLocalizations({
                    it: "comando"
                })
                .setDescription("The command you need help with")
                .setDescriptionLocalizations({
                    it: "Il comando per cui ti serve aiuto"
                })
                .setRequired(false);
                for (let comando of comandi){
                    option.addChoices({name: comando, value: comando});
                }
                
                return option;
            }),

        execute: async(interaction) => {
            const comando = interaction.options.getString("command");

            const reply = await esegui(comando);
            return await interaction.reply(reply);
        },

        aliases: ['help'],

        executeMsg: async (messaggio, args) => {
            const comando = args[0];
            if (comando && !comandi.includes(comando))
                return await messaggio.channel.send({
                    embeds: [
                        new EmbedBuilder()
                        .setTitle(":warning: Error")
                        .setDescription("Wrong parameters.\nUse the `help` command to get more instructions.")
                        .setColor(Colori.error)
                    ]
                });
            const reply = await esegui(comando);
            return await messaggio.channel.send(reply);
        },

        example: '`-help` `[command]`',
        description: 'Helps you with the bot or with specific commands',
        parameters: '`command`: the command you need help with'
    })
}