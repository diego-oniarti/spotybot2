const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Comando = require('../js/comando');
const { Colori } = require('../js/colori');

async function comando(radio_name) {
    return await fetch("https://radio.garden/api/search?" + new URLSearchParams({
        q: radio_name
    }))
    .then(res=>res.json())
    .then(data=>{
        const list = data.hits.hits.map(x=>`\`${x._source.url.split('/')[3]}\`: ${x._source.title} | ${x._source.subtitle}`).join('\n');
        return {
            embeds: [ new EmbedBuilder()
                .setTitle(`Matches for ${radio_name}`)
                .setDescription(list)
                .setColor(Colori.default)
            ]
        }
    });
}

module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
        .setName('find_radio')
        .setDescription('Find the id for a radio')
        .setDescriptionLocalizations({
            it: 'Trova l\'id per una radio'
        })
        .addStringOption(option=>
            option
            .setName("name")
            .setNameLocalizations({
                it: "nome"
            })
            .setDescription("Name of the radio")
            .setDescriptionLocalizations({
                it: "Nome della radio"
            })
            .setRequired(true)
        ),

        execute: async (interaction) => {
            const name = interaction.options.getString("name").trim();

            await interaction.deferReply({ephemeral:false});
            const reply = await comando(name);
            interaction.editReply(reply);
        },

        aliases: ['find_radio', 'fr'],
        executeMsg: async (message,args)=>{
            const name = args.join(' ');
            if (!name) {
                message.channel.send({
                    embeds: [ new EmbedBuilder()
                        .setTitle(`Please specify the name of a radio`)
                        .setColor(Colori.error)
                    ]
                });
                return;
            }

            const reply = await comando(name);
            message.channel.send(reply)
        },

        example: '`-find_radio` `radio name`',
        description: 'Finds radio stations matching the given name',
        parameters: '`radio_name`: Name of the desired radio'
    }),
}
