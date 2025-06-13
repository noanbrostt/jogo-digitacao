// backend/src/app.js
const express = require('express');
const db = require('./database'); // Importa a conexão com o banco de dados
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Carrega as variáveis do .env principal

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Permite que o Express parseie JSON no corpo das requisições

// Rota para salvar uma nova pontuação
app.post('/api/scores', (req, res) => {
    const { player, score } = req.body;

    if (!player || typeof score === 'undefined') {
        return res.status(400).json({ error: 'Player e Score são obrigatórios.' });
    }

    const stmt = db.prepare('INSERT INTO scores (player, score) VALUES (?, ?)');
    stmt.run(player, score, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Pontuação salva com sucesso!', id: this.lastID });
    });
    stmt.finalize();
});

// Rota para obter as top 10 pontuações
app.get('/api/scores', (req, res) => {
    db.all('SELECT player, score, timestamp FROM scores ORDER BY score DESC LIMIT 10', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Servir arquivos estáticos do frontend
// IMPORTANTE: Isso será usado se você decidir servir o frontend pelo Node.js.
// Se usar Nginx via Docker Compose, esta parte não será necessária no Node.js.
// Por enquanto, vamos manter para testes locais.
app.use(express.static(path.join(__dirname, '../../frontend')));

// Rota padrão para servir o index.html (se o frontend for servido pelo Node.js)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});