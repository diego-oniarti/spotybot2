const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Colori } = require('../js/colori');
const Comando = require('../js/comando');
const requisiti = require('../js/requisiti');
const { servers } = require('../shared');
const { Modes } = require('../js/server');

const comando=(membro, mode)=>{
    const err1 = requisiti.sameVoiceChannel(membro);
    if (err1) return err1;
    const err2 = requisiti.playing(membro.guild);
    if (err2) return err2;
    
    const server = servers.get(membro.guild.id);
    const oldMode = server.mode;

    if (!mode) {
        if (oldMode === Modes.none) mode = Modes.loopSong;
        else mode = Modes.none
    }
    server.mode = mode;

    return {
		embeds: [
			new EmbedBuilder()
			.setTitle(`Set mode to \`${mode}\``)
			.setColor(Colori.default)
		],
		ephemeral: false
	}
}

module.exports = { 
	comando: new Comando({
		data: new SlashCommandBuilder()
			.setName('loop')
			.setDescription('Loops one or more songs')
			.setDescriptionLocalizations({
				it: 'Mette la coda o una canzone in loop'
			})
            .addStringOption(option=>
                option
                .setName('mode')
                .setNameLocalizations({
                    it: "modalità"
                })
                .setDescription('loop mode')
                .setDescriptionLocalizations({
                    it: "modalità di loop"
                })
                .setChoices(
                    {name: "queue", value: "queue"},
                    {name: "song", value: "song"},
                    {name: "none", value: "none"},
                    {name: "queueFromNow", value: "queueFromNow"},
                )),
		execute: async (interaction) => {
            const membro = interaction.member;
            const mode = interaction.options.getString("mode");

            const reply = comando(membro, mode);
			return await interaction.channel.send(reply);
		},

		aliases: ['loop'],

		executeMsg: async (message, args) => {
            const membro = message.member;
            const mode = args[0];

			const reply = comando(membro, mode);
			message.channel.send(reply);
		},

		example: '`-loop` `[mode]`',
		description: 'Loop one or more songs',
        parameters: '`mode`: how to loop the songs.\nAccepted values are:\n- `queue`: loops all the songs in the queue\n- `song`: loops the current song\n- `none`: disables the loop\n- `queueFromNow`: loops over the queue excluding songs that already played\nIf no parameter is sfecified, it switches between `song` and `none`'
	})
}