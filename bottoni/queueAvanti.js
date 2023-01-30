const {comandoQueue} = require('../comandi/queue')

module.exports = {
    id: /queueAvanti-(?<pagina>\d+)/,
    handler: async interaction => {
        const pagina = interaction.customId.match(/queueAvanti-(?<pagina>\d+)/).groups.pagina;
        interaction.update(comandoQueue(interaction.guild, pagina));
    }
}