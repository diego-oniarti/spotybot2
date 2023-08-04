const express = require('express')
const querystring = require('querystring')
const fs = require('node:fs');
const path = require('node:path');
const app = express()
const cookieParser = require('cookie-parser');

require('dotenv').config();

const PORT = process.env.PORT;
const DB_PATH = process.env.DB_PATH

if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(
        {
            users: {}
        }
    ));
}


app.set('view engine', 'ejs'); 
app.use(cookieParser());

app.get('/connect', (req,res)=>{
    let link = "#";
    if (req.query.user) {
        const alfabeto = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM0123456789"
        let state = "";
        for (i=0; i<16; i++) 
            state+=alfabeto[Math.floor(Math.random()*alfabeto.length)]
        res.cookie("user", req.query.user, {maxAge:20*60*1000});
        res.cookie("state", state, {maxAge:20*60*1000});        
        link = `https://accounts.spotify.com/authorize?`+querystring.stringify({
            response_type: 'code',
            client_id: process.env.SPOTIFY_CLIENT_ID,
            scope: 'playlist-read-private playlist-read-collaborative user-library-read',
            redirect_uri: process.env.REDIRECT_URI,
            state: state,
            show_dialog: true
        });
    }
    res.render('connect', {
        link: link
    });
});

app.get('/auth', (req, res) => {
    const code = req.query.code;
    const error = req.query.error;
    const state = req.query.state;

    if (error) {
        console.error(`Errore: ${error}`);
        res.render('authError')
        return;
    }
    if (req.cookies.state != state) {
        console.error(`Errore: ${error}`);
        res.render('authError')
        return;
    }

    res.render('authSuccess')

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', process.env.REDIRECT_URI);
    fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        body: params,
        headers: {
            'Authorization': 'Basic '+new Buffer.from(process.env.SPOTIFY_CLIENT_ID+':'+process.env.SPOTIFY_CLIENT_SECRET).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    .then(res=>res.json())
    .then(async data=>{
        const userID = req.cookies.user;
        const access_token = data.access_token;
        const refresh_token =data.refresh_token;
        const DB = JSON.parse(fs.readFileSync(DB_PATH));
        
        if (!DB.users[userID]) DB.users[userID]={}
        DB.users[userID].access_token = access_token;
        DB.users[userID].refresh_token = refresh_token;
        fs.writeFileSync(DB_PATH, JSON.stringify(DB));
    })
});

app.use('/', express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`Started on port ${PORT}`)
})