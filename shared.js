const initSqlJs = require('sql.js');
const fs = require('fs');
require("dotenv").config();

let resolver;
/** @type {Promise<Database>} */
let db_ref = new Promise((res) => {
    resolver = res;
});

const db_path = process.env.DB_PATH;
async function initDatabase() {
    const SQL = await initSqlJs();

    if (fs.existsSync(db_path)) {
        const fileBuffer = fs.readFileSync(db_path);
        var new_db = new SQL.Database(fileBuffer);
        console.log("Loaded database from file");
    } else {
        var new_db = new SQL.Database();
        console.log("Creating database");
        new_db.run(`
            CREATE TABLE users (
                user_id TEXT PRIMARY KEY,
                access_token TEXT,
                refresh_token TEXT
            )
        `);
        new_db.run(`
            CREATE TABLE songs (
                song_id TEXT PRIMARY KEY,
                location TEXT,
                last_used date DEFAULT current_timestamp
            )
        `);
        const data = new_db.export();
        fs.writeFileSync(db_path, Buffer.from(data));
    }
    return new_db;
}

initDatabase().then((new_db)=>{
    console.log("Database ready");
    resolver(new_db);
});

function save_db() {
    db_ref.then(db=>{
	const data = db.export();
	fs.writeFileSync(db_path, Buffer.from(data));
    }) 
}

const servers = new Map();

module.exports = {
    "servers": servers,
    "db_ref": db_ref,
    "save_db": save_db
};
