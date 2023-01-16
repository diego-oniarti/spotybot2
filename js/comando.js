class Comando{
    constructor(data, execute, aliases, executeMsg, example, description, parameters){
        if (!data || !execute || !aliases || !executeMsg || !example || !description){
            throw new Error("Comando invalido");
        }
        this.data = data;
        this.execute = execute;
        this.aliases = aliases;
        this.executeMsg = executeMsg;
        this.example = example;
        this.description = description;
        this.parameters = parameters;
    }
}

module.exports = Comando;