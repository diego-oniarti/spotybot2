# Spotybot
A discord music bot you can run on your own server or host for others!

# Requirements
To run the bot you need a key to [youtube's data api](https://developers.google.com/youtube/v3/docs?apix=true) and a [spotify app](https://developer.spotify.com/).

## Example .env file
TOKEN= Your discord bot's token
CLIENT_ID= Your discord's cliend id
YOUTUBE_KEY= Your youtube API key
SPOTIFY_CLIENT_ID= Your spotify client id
SPOTIFY_CLIENT_SECRET= Your spotify client secret
PORT= The port for the webserver. User for OAuth
REDIRECT_URI= The redirect URI for the spotify OAuth
DB_PATH= The path to a json file

# TODO
- Fix the youtbe playlist regex in [play.js](https://github.com/diego-oniarti/spotybot2/blob/main/comandi/play.js):find_songs.
