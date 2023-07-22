// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Colori } = require('./js/colori');

require('dotenv').config();
const comandi = require('./js/comandi');
const bottoni = require('./js/bottoni');

// creazione del Bot
const TOKEN = process.env.TOKEN;
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
] });

client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});


// importo dei comandi
client.commands = comandi;

const errorMsg = {
	embeds:[
		new EmbedBuilder()
		.setTitle(":warning: Error")
		.setDescription("An error has occurred\nWe're sorry")
		.setColor(Colori.error)
	],
	ephemeral: true
};

function getDate() {
    const d=new Date();
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} - ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}` 
}

// gestione degli Slash Commands
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`[${getDate()}] [${interaction.user.tag}] [${interaction.guild?.name||'dm'}] No command matching ${interaction.commandName} was found.`);
		return;
	}

	console.log(`[${getDate()}] [${interaction.user.tag}] [${interaction.guild?.name||'dm'}] ${command.data.name} ${interaction.options.data.map(a=>{return a.name+':'+a.value}).join(" ")}`);
	await command.execute(interaction)
    .catch(async error=>{
		console.error(error);

		// prova sia il metodo reply che editReply perché il comando chiamato porebbe già aver chiamato un deferReply prima di dare errore. In quel caso la reply normale darebbe errore
		await interaction.reply(errorMsg)
		.catch(async error=>{
            console.error(error);
		});
    });
    if (interaction.member?.id=='355098428881108995')
            await interaction.member.send({
                embeds: [new EmbedBuilder().setTitle("Complimenti Cardu!").setDescription("Hai usato un comando!").setColor(Colori.default)]
            });
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isButton()) return;
	const bottone = bottoni.filter(bottone=>{return interaction.customId.match(bottone.id)})[0];
	if (!bottone){
		console.error(`[${getDate()}] [${interaction.user.tag}] No button matching ${interaction.customId} was found`);
		return;
	}

	console.log(`[${getDate()}] [${interaction.user.tag}] [${interaction.guild?.name||'dm'}] ${interaction.customId}`);

	await bottone.handler(interaction)
	.catch(error=>{
		console.error(error);
		interaction.reply(errorMsg);
	});
})

// gestione dei comandi normali
client.on(Events.MessageCreate, async message => {
    if (!message.content.startsWith('-')) return;
	message.content=message.content.slice(1);
    const args = message.content.split(' ').filter(arg=>arg.trim()!='');
	
	const nomeComando = args.shift();

	const comando = client.commands.find(command=>{return command.aliases.includes(nomeComando)});
	if (comando) {
		console.log(`[${getDate()}] [${message.author.tag}] [${message.guild?.name||'dm'}] ${message.content}`);

		try {
			await comando.executeMsg(message, args)
			if (message.author.id=='355098428881108995')
				await message.author.send({
					embeds: [new EmbedBuilder().setTitle("Complimenti Cardu!").setDescription("Hai usato un comando!").setColor(Colori.default)]
				});
		} catch (error) {
			console.error(error);
			await message.reply(errorMsg)
			.catch(error=>{
				console.error(error);
			});
		}
	}
});

client.login(TOKEN);