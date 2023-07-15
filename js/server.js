const Modes = {
    none: 1,
    loopSong: 2,
    loopQueue: 3,
    radio: 4,
    loopQueueFromNow: 5
}

class Server {
    constructor(guild){
        this.guild = guild;
        this.queue = [];
        this.mode = Modes.none;
        this.radioTrack1=undefined;
        this.radioTrack2=undefined;
        this.isPlaying=false;

        this.audioResource = undefined;

        this.corrente = undefined;
        this.pastSongs = [];
    }
}

module.exports = {
    Server: Server, 
    Modes: Modes
};