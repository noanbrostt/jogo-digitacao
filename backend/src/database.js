// backend/src/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Carrega as variáveis do .env principal

const dbPath = process.env.DATABASE_PATH || './data/database.sqlite'; // Caminho do banco de dados

// Garante que o diretório 'data' exista
const fs = require('fs');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

// Conecta ao banco de dados SQLite
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        // Cria uma tabela de exemplo se não existir
        db.run(`CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player TEXT NOT NULL,
            score INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela:', err.message);
            } else {
                console.log('Tabela "scores" verificada/criada com sucesso.');
            }
        });
    }
});

module.exports = db;