const Modes = {
    linear: 0,
    loopSong: 1,
    loopQueue: 2,
    radio: 3
}

class Server {
    constructor(guild){
        this.guild = guild;
        this.queue = [];
        this.mode = Modes.linear;
        this.radioTrack1=undefined;
        this.radioTrack2=undefined;
        this.isPlaying=false;

        this.corrente = undefined;
        this.pastSongs = [];
    }
}

module.exports = {
    Server: Server, 
    Modes: Modes
};