const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Comando = require('../js/comando');
const { Colori } = require('../js/colori');
const { default: stringSimilarity } = require('string-similarity-js');

async function comando(radio_name) {
    return await fetch("https://radio.garden/api/ara/content/places")
    .then(res=>res.json())
    .then(async (data)=>{
        const all_places = data.data.list;
        let best = all_places.reduce((acc, elem)=>{
            const score_place = stringSimilarity(radio_name.toLowerCase(), elem.title.toLowerCase());
            const score_country = stringSimilarity(radio_name.toLowerCase(), elem.country.toLowerCase());
            const score = Math.max(score_place, score_country);
            elem.score = score;
            if (!acc || elem.score>acc.score) {
                return elem;
            }else{
                return acc;
            }
        }, undefined);

        return await fetch(`https://radio.garden/api/ara/content/page/${best.id}/channels`)
            .then(res=>res.json())
            .then(data=>{
                const list = data.data.content[0].items.map(x=>`\`${x.page.url.split('/')[3]}\`: ${x.page.title}`).join('\n');
                return {
                    embeds: [ new EmbedBuilder()
                        .setTitle(`Matches for ${data.data.title}`)
                        .setDescription(list)
                        .setColor(Colori.default)
                    ]
                }
            });

    });
}

module.exports = {
    comando: new Comando({
        data: new SlashCommandBuilder()
        .setName('radio_place')
        .setDescription('Find radios in some place')
        .setDescriptionLocalizations({
            it: 'Trova le radio dato un luogo'
        })
        .addStringOption(option=>
            option
            .setName("place")
            .setNameLocalizations({
                it: "luogo"
            })
            .setDescription("Place, maybe your town?")
            .setDescriptionLocalizations({
                it: "Luogo. Roma per esempio"
            })
            .setRequired(true)
        ),

        execute: async (interaction) => {
            const place = interaction.options.getString("place").trim();

            await interaction.deferReply({ephemeral:false});
            const reply = await comando(place);
            interaction.editReply(reply);
        },

        aliases: ['radio_place', 'rp'],
        executeMsg: async (message,args)=>{
            const place = args.join(' ');
            if (!place) {
                message.channel.send({
                    embeds: [ new EmbedBuilder()
                        .setTitle('Please supply a place name')
                        .setColor(Colori.error)
                    ]
                });
                return;
            }

            const reply = await comando(place);
            message.channel.send(reply)
        },

        example: '`-radio_place` `place name`',
        description: 'Find radios near some place',
        parameters: '`place name`: Name of the desired place'
    }),
}
