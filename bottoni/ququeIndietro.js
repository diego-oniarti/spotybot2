const {comandoQueue} = require('../comandi/queue')

module.exports = {
    id: /queueIndietro-(?<pagina>\d+)/,
    handler: async interaction => {
        const pagina = interaction.customId.match(/queueIndietro-(?<pagina>\d+)/).groups.pagina;
        interaction.update(comandoQueue(interaction.guild, pagina));
    }
}