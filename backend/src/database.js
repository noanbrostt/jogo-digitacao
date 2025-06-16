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

        // ATENÇÃO: Se a tabela 'scores' já existir com a estrutura antiga,
        // você precisará excluí-la primeiro para que a nova estrutura seja aplicada.
        // Já explicamos isso no último turno. Se ainda não fez, exclua o arquivo database.sqlite
        // na pasta backend/data/ e reinicie os containers.
        db.run(`CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            matricula TEXT UNIQUE, -- Matricula agora é UNIQUE para evitar duplicatas
            nome TEXT NOT NULL,
            score INTEGER NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela:', err.message);
            } else {
                console.log('Tabela "scores" verificada/criada com sucesso com a nova estrutura.');
            }
        });
    }
});

// Função para encontrar um usuário pela matrícula
function findUserByMatricula(matricula) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM scores WHERE matricula = ?', [matricula], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row); // Retorna a linha do usuário ou undefined se não encontrar
            }
        });
    });
}

// Função para inserir um novo usuário
function insertNewUser(matricula, nome) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO scores (matricula, nome, score) VALUES (?, ?, NULL)', [matricula, nome], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, matricula, nome, score: null }); // Retorna o novo usuário
            }
        });
    });
}

module.exports = { db, findUserByMatricula, insertNewUser }; // Exporta o db e as novas funções
